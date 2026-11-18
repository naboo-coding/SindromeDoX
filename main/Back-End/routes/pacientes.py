"""Rotas dos pacientes, dos vínculos com responsáveis, do consentimento LGPD e da retenção."""

from datetime import date, datetime

from flask import Blueprint, jsonify, request

import auditoria
from config import Config
from database import consultar_todos, consultar_um, executar, inserir, transacao
from seguranca import buscar_paciente_visivel, eh_equipe, login_obrigatorio

bp = Blueprint("pacientes", __name__)


# Tiro os espaços das pontas; texto vazio vira None.
def _limpo(valor):
    if valor is None:
        return None
    valor = str(valor).strip()
    return valor or None


# Confiro se o texto tem só dígitos e o tamanho certo.
def _numero_valido(valor, minimo, maximo):
    return valor.isascii() and valor.isdigit() and minimo <= len(valor) <= maximo


# Converto data ou data e hora para o texto que a API devolve.
def _texto_data(valor):
    if valor is None:
        return None
    if isinstance(valor, datetime):
        return valor.strftime("%Y-%m-%d %H:%M:%S")
    return valor.strftime("%Y-%m-%d")


# Leio e confiro os dados do paciente e do responsável enviados no corpo.
# Devolvo (paciente, responsavel, None) ou (None, None, mensagem de erro).
def _ler_dados(dados, contato_completo):
    paciente = {
        "nome": _limpo(dados.get("nome")),
        "sexo_biologico": _limpo(dados.get("sexo_biologico")),
        "data_nascimento": _limpo(dados.get("data_nascimento")),
        "nome_mae": _limpo(dados.get("nome_mae")),
        "nome_pai": _limpo(dados.get("nome_pai")),
        "cep": _limpo(dados.get("cep")),
        "cidade": _limpo(dados.get("cidade")),
        "estado": _limpo(dados.get("estado")),
        "pais": _limpo(dados.get("pais")) or "Brasil",
    }

    if not paciente["nome"] or not paciente["nome_mae"] or not paciente["cidade"] or not paciente["estado"]:
        return None, None, "Preencha nome, nome da mãe, cidade e estado do paciente."
    if paciente["sexo_biologico"] not in ("M", "F"):
        return None, None, "O sexo biológico deve ser M ou F."

    try:
        nascimento = datetime.strptime(paciente["data_nascimento"] or "", "%Y-%m-%d").date()
    except ValueError:
        return None, None, "Data de nascimento inválida."
    if nascimento > date.today():
        return None, None, "A data de nascimento não pode ser no futuro."
    if nascimento < date(1900, 1, 1):
        return None, None, "A data de nascimento deve ser a partir de 01/01/1900."
    paciente["data_nascimento"] = nascimento

    if paciente["cep"] and not _numero_valido(paciente["cep"], 8, 8):
        return None, None, "O CEP deve ter 8 dígitos."

    bloco = dados.get("responsavel")
    if not isinstance(bloco, dict):
        bloco = {}

    responsavel = {"parentesco": _limpo(bloco.get("parentesco"))}

    # A equipe informa o contato completo; o responsável logado só informa o parentesco.
    if contato_completo:
        responsavel["nome"] = _limpo(bloco.get("nome"))
        responsavel["cpf"] = _limpo(bloco.get("cpf"))
        responsavel["email"] = (_limpo(bloco.get("email")) or "").lower() or None
        responsavel["telefone"] = _limpo(bloco.get("telefone"))
        responsavel["whatsapp"] = _limpo(bloco.get("whatsapp"))
        responsavel["telefone2"] = _limpo(bloco.get("telefone2"))

        if (not responsavel["nome"] or not responsavel["cpf"] or not responsavel["email"]
                or not responsavel["telefone"] or not responsavel["parentesco"]):
            return None, None, "Preencha nome, CPF, e-mail, telefone e parentesco do responsável."
        if "@" not in responsavel["email"]:
            return None, None, "E-mail do responsável inválido."
        if not _numero_valido(responsavel["cpf"], 11, 11):
            return None, None, "O CPF deve ter 11 dígitos."
        if not _numero_valido(responsavel["telefone"], 10, 11):
            return None, None, "O telefone deve ter 10 ou 11 dígitos."
        if responsavel["whatsapp"] and not _numero_valido(responsavel["whatsapp"], 10, 11):
            return None, None, "O WhatsApp deve ter 10 ou 11 dígitos."
        if responsavel["telefone2"] and not _numero_valido(responsavel["telefone2"], 10, 11):
            return None, None, "O telefone 2 deve ter 10 ou 11 dígitos."

    if not responsavel["parentesco"]:
        return None, None, "Informe o parentesco do responsável."

    return paciente, responsavel, None


# Confiro se o CPF já pertence a outro usuário, com outro e-mail.
def _cpf_de_outro(responsavel):
    outro = consultar_um(
        "SELECT id_usuario FROM usuario WHERE cpf = %s AND email <> %s",
        (responsavel["cpf"], responsavel["email"]),
    )
    return outro is not None


# Procuro o responsável pelo e-mail; se não existe, crio um contato sem senha.
def _buscar_ou_criar_responsavel(responsavel, con):
    existente = consultar_um(
        "SELECT id_usuario FROM usuario WHERE email = %s", (responsavel["email"],), con
    )
    if existente is not None:
        return existente["id_usuario"]

    return inserir(
        "INSERT INTO usuario (nome, cpf, email, telefone, whatsapp, telefone2, perfil) "
        "VALUES (%s, %s, %s, %s, %s, %s, 'responsavel')",
        (responsavel["nome"], responsavel["cpf"], responsavel["email"], responsavel["telefone"],
         responsavel["whatsapp"], responsavel["telefone2"]),
        con,
    )


# Busco o vínculo ativo entre o paciente e o usuário.
def _vinculo_ativo(id_paciente, id_usuario):
    return consultar_um(
        "SELECT * FROM paciente_responsavel WHERE id_paciente = %s AND id_usuario = %s AND ativo = TRUE",
        (id_paciente, id_usuario),
    )


# Crio o vínculo, ou reativo o vínculo antigo do mesmo responsável.
def _vincular(id_paciente, id_usuario, parentesco, principal, con):
    antigo = consultar_um(
        "SELECT 1 FROM paciente_responsavel WHERE id_paciente = %s AND id_usuario = %s",
        (id_paciente, id_usuario),
        con,
    )

    if antigo is not None:
        executar(
            "UPDATE paciente_responsavel SET parentesco = %s, principal = %s, ativo = TRUE "
            "WHERE id_paciente = %s AND id_usuario = %s",
            (parentesco, principal, id_paciente, id_usuario),
            con,
        )
    else:
        inserir(
            "INSERT INTO paciente_responsavel (id_paciente, id_usuario, parentesco, principal) "
            "VALUES (%s, %s, %s, %s)",
            (id_paciente, id_usuario, parentesco, principal),
            con,
        )


# Registro o consentimento na versão atual do termo; se estava revogado, volta a valer.
def _registrar_consentimento(id_paciente, id_titular, id_registro, con):
    atual = consultar_um(
        "SELECT id_consentimento, revogado_em FROM consentimento_lgpd "
        "WHERE id_paciente = %s AND id_usuario_titular = %s AND versao_termo = %s",
        (id_paciente, id_titular, Config.TERMO_LGPD_VERSAO),
        con,
    )

    if atual is None:
        inserir(
            "INSERT INTO consentimento_lgpd (id_paciente, id_usuario_titular, versao_termo, id_usuario_registro) "
            "VALUES (%s, %s, %s, %s)",
            (id_paciente, id_titular, Config.TERMO_LGPD_VERSAO, id_registro),
            con,
        )
    elif atual["revogado_em"] is not None:
        executar(
            "UPDATE consentimento_lgpd SET revogado_em = NULL, aceito_em = NOW(), id_usuario_registro = %s "
            "WHERE id_consentimento = %s",
            (id_registro, atual["id_consentimento"]),
            con,
        )


# Monto o paciente no formato que a API devolve.
def _montar_paciente(paciente, con=None):
    id_paciente = paciente["id_paciente"]

    # Responsável principal ativo; se não houver, o vínculo ativo mais antigo.
    responsavel = consultar_um(
        """
        SELECT u.id_usuario, u.nome, u.cpf, u.email, u.telefone, u.whatsapp, u.telefone2, pr.parentesco
        FROM paciente_responsavel pr
        JOIN usuario u ON u.id_usuario = pr.id_usuario
        WHERE pr.id_paciente = %s AND pr.ativo = TRUE
        ORDER BY pr.principal DESC, pr.criado_em, pr.id_usuario
        LIMIT 1
        """,
        (id_paciente,),
        con,
    )

    # Última triagem ativa, com o resultado.
    triagem = consultar_um(
        """
        SELECT t.id_triagem, t.hora_triagem, r.pontuacao, r.limiar, r.status
        FROM triagem t
        LEFT JOIN resultado_triagem r ON r.id_triagem = t.id_triagem
        WHERE t.id_paciente = %s AND t.ativo = TRUE
        ORDER BY t.hora_triagem DESC, t.id_triagem DESC
        LIMIT 1
        """,
        (id_paciente,),
        con,
    )

    situacao = consultar_um(
        "SELECT dna_ja_realizado, ultima_etapa FROM vw_situacao_paciente WHERE id_paciente = %s",
        (id_paciente,),
        con,
    )

    ultima_triagem = None
    if triagem is not None:
        ultima_triagem = {
            "id_triagem": triagem["id_triagem"],
            "hora_triagem": _texto_data(triagem["hora_triagem"]),
            "pontuacao": float(triagem["pontuacao"]) if triagem["pontuacao"] is not None else None,
            "limiar": float(triagem["limiar"]) if triagem["limiar"] is not None else None,
            "status": triagem["status"],
        }

    return {
        "id_paciente": id_paciente,
        "nome": paciente["nome"],
        "sexo_biologico": paciente["sexo_biologico"],
        "data_nascimento": _texto_data(paciente["data_nascimento"]),
        "nome_mae": paciente["nome_mae"],
        "nome_pai": paciente["nome_pai"],
        "cep": paciente["cep"],
        "cidade": paciente["cidade"],
        "estado": paciente["estado"],
        "pais": paciente["pais"],
        "observacoes": paciente["observacoes"],
        "criado_em": _texto_data(paciente["criado_em"]),
        "dna_ja_realizado": bool(situacao["dna_ja_realizado"]),
        "ultima_etapa": situacao["ultima_etapa"],
        "responsavel": responsavel,
        "ultima_triagem": ultima_triagem,
    }


@bp.get("/api/pacientes")
@login_obrigatorio()
def listar_pacientes(usuario):
    # A equipe vê todos os pacientes ativos.
    if eh_equipe(usuario):
        pacientes = consultar_todos("SELECT * FROM paciente WHERE ativo = TRUE ORDER BY nome")
    else:
        # O responsável vê só os pacientes com vínculo ativo e consentimento dele vigente.
        pacientes = consultar_todos(
            """
            SELECT p.*
            FROM paciente p
            JOIN paciente_responsavel pr ON pr.id_paciente = p.id_paciente
                AND pr.id_usuario = %s AND pr.ativo = TRUE
            JOIN consentimento_lgpd c ON c.id_paciente = p.id_paciente
                AND c.id_usuario_titular = pr.id_usuario
                AND c.versao_termo = %s AND c.revogado_em IS NULL
            WHERE p.ativo = TRUE
            ORDER BY p.nome
            """,
            (usuario["id_usuario"], Config.TERMO_LGPD_VERSAO),
        )

    return jsonify([_montar_paciente(paciente) for paciente in pacientes])


@bp.get("/api/pacientes/<int:id_paciente>")
@login_obrigatorio()
def buscar_paciente(usuario, id_paciente):
    paciente, erro = buscar_paciente_visivel(usuario, id_paciente)
    if erro:
        return erro

    # A consulta da ficha pela equipe vai para a auditoria.
    if eh_equipe(usuario):
        auditoria.registrar("paciente.consultar", "paciente", id_paciente)

    return jsonify(_montar_paciente(paciente))


@bp.post("/api/pacientes")
@login_obrigatorio()
def criar_paciente(usuario):
    dados = request.get_json(silent=True) or {}
    equipe = eh_equipe(usuario)

    paciente, responsavel, mensagem = _ler_dados(dados, equipe)
    if mensagem:
        return jsonify(erro=mensagem), 400
    if dados.get("consentimento") is not True:
        return jsonify(erro="É preciso aceitar o termo de consentimento (LGPD)."), 400
    if equipe and _cpf_de_outro(responsavel):
        return jsonify(erro="Este CPF já está cadastrado com outro e-mail."), 409

    with transacao() as con:
        # A equipe informa o responsável; o responsável logado se vincula a si mesmo.
        if equipe:
            id_responsavel = _buscar_ou_criar_responsavel(responsavel, con)
        else:
            id_responsavel = usuario["id_usuario"]

        id_paciente = inserir(
            "INSERT INTO paciente (nome, sexo_biologico, data_nascimento, nome_mae, nome_pai, "
            "cep, cidade, estado, pais, id_usuario_cadastro) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (paciente["nome"], paciente["sexo_biologico"], paciente["data_nascimento"], paciente["nome_mae"],
             paciente["nome_pai"], paciente["cep"], paciente["cidade"], paciente["estado"], paciente["pais"],
             usuario["id_usuario"]),
            con,
        )

        _vincular(id_paciente, id_responsavel, responsavel["parentesco"], True, con)
        _registrar_consentimento(id_paciente, id_responsavel, usuario["id_usuario"], con)

        auditoria.registrar(
            "paciente.criar", "paciente", id_paciente,
            depois={"paciente": paciente, "id_responsavel": id_responsavel, "responsavel": responsavel},
            con=con,
        )

    return jsonify(id_paciente=id_paciente), 201


@bp.put("/api/pacientes/<int:id_paciente>")
@login_obrigatorio("admin")
def editar_paciente(usuario, id_paciente):
    paciente, erro = buscar_paciente_visivel(usuario, id_paciente)
    if erro:
        return erro

    dados = request.get_json(silent=True) or {}
    novo, responsavel, mensagem = _ler_dados(dados, True)
    if mensagem:
        return jsonify(erro=mensagem), 400
    if _cpf_de_outro(responsavel):
        return jsonify(erro="Este CPF já está cadastrado com outro e-mail."), 409

    antes = _montar_paciente(paciente)

    principal = consultar_um(
        """
        SELECT u.id_usuario, u.email
        FROM paciente_responsavel pr
        JOIN usuario u ON u.id_usuario = pr.id_usuario
        WHERE pr.id_paciente = %s AND pr.ativo = TRUE AND pr.principal = TRUE
        """,
        (id_paciente,),
    )

    with transacao() as con:
        executar(
            "UPDATE paciente SET nome = %s, sexo_biologico = %s, data_nascimento = %s, nome_mae = %s, "
            "nome_pai = %s, cep = %s, cidade = %s, estado = %s, pais = %s WHERE id_paciente = %s",
            (novo["nome"], novo["sexo_biologico"], novo["data_nascimento"], novo["nome_mae"], novo["nome_pai"],
             novo["cep"], novo["cidade"], novo["estado"], novo["pais"], id_paciente),
            con,
        )

        if principal is not None and principal["email"].lower() == responsavel["email"]:
            # Mesmo responsável: só atualizo o parentesco do vínculo.
            id_responsavel = principal["id_usuario"]
            executar(
                "UPDATE paciente_responsavel SET parentesco = %s WHERE id_paciente = %s AND id_usuario = %s",
                (responsavel["parentesco"], id_paciente, id_responsavel),
                con,
            )
        else:
            # E-mail trocado: encerro o vínculo principal antigo e crio o novo.
            if principal is not None:
                executar(
                    "UPDATE paciente_responsavel SET ativo = FALSE, principal = FALSE "
                    "WHERE id_paciente = %s AND id_usuario = %s",
                    (id_paciente, principal["id_usuario"]),
                    con,
                )
            id_responsavel = _buscar_ou_criar_responsavel(responsavel, con)
            _vincular(id_paciente, id_responsavel, responsavel["parentesco"], True, con)
            _registrar_consentimento(id_paciente, id_responsavel, usuario["id_usuario"], con)

        # Atualizo o contato do responsável principal.
        executar(
            "UPDATE usuario SET nome = %s, cpf = %s, telefone = %s, whatsapp = %s, telefone2 = %s "
            "WHERE id_usuario = %s",
            (responsavel["nome"], responsavel["cpf"], responsavel["telefone"], responsavel["whatsapp"],
             responsavel["telefone2"], id_responsavel),
            con,
        )

        atualizado = consultar_um("SELECT * FROM paciente WHERE id_paciente = %s", (id_paciente,), con)
        auditoria.registrar(
            "paciente.editar", "paciente", id_paciente,
            antes=antes, depois=_montar_paciente(atualizado, con), con=con,
        )

    return jsonify(mensagem="Paciente atualizado.")


@bp.delete("/api/pacientes/<int:id_paciente>")
@login_obrigatorio("admin")
def excluir_paciente(usuario, id_paciente):
    paciente, erro = buscar_paciente_visivel(usuario, id_paciente)
    if erro:
        return erro

    # Nada clínico é apagado: desativo o paciente e as triagens dele.
    with transacao() as con:
        executar("UPDATE paciente SET ativo = FALSE WHERE id_paciente = %s", (id_paciente,), con)
        executar("UPDATE triagem SET ativo = FALSE WHERE id_paciente = %s", (id_paciente,), con)
        auditoria.registrar("paciente.excluir", "paciente", id_paciente, antes=paciente, con=con)

    return jsonify(mensagem="Paciente excluído.")


@bp.put("/api/pacientes/<int:id_paciente>/observacoes")
@login_obrigatorio()
def editar_observacoes(usuario, id_paciente):
    paciente, erro = buscar_paciente_visivel(usuario, id_paciente)
    if erro:
        return erro

    dados = request.get_json(silent=True) or {}
    observacoes = _limpo(dados.get("observacoes"))

    with transacao() as con:
        executar(
            "UPDATE paciente SET observacoes = %s WHERE id_paciente = %s", (observacoes, id_paciente), con
        )
        auditoria.registrar(
            "paciente.observacoes", "paciente", id_paciente,
            antes={"observacoes": paciente["observacoes"]}, depois={"observacoes": observacoes}, con=con,
        )

    return jsonify(mensagem="Observações salvas.")


@bp.get("/api/pacientes/<int:id_paciente>/responsaveis")
@login_obrigatorio()
def listar_responsaveis(usuario, id_paciente):
    paciente, erro = buscar_paciente_visivel(usuario, id_paciente)
    if erro:
        return erro

    vinculos = consultar_todos(
        """
        SELECT u.id_usuario, u.nome, u.cpf, u.email, u.telefone, u.whatsapp, u.telefone2,
               pr.parentesco, pr.principal, pr.criado_em
        FROM paciente_responsavel pr
        JOIN usuario u ON u.id_usuario = pr.id_usuario
        WHERE pr.id_paciente = %s AND pr.ativo = TRUE
        ORDER BY pr.principal DESC, pr.criado_em
        """,
        (id_paciente,),
    )

    for vinculo in vinculos:
        vinculo["principal"] = bool(vinculo["principal"])
        vinculo["criado_em"] = _texto_data(vinculo["criado_em"])

    return jsonify(vinculos)


@bp.post("/api/pacientes/<int:id_paciente>/responsaveis")
@login_obrigatorio("admin")
def criar_vinculo(usuario, id_paciente):
    paciente, erro = buscar_paciente_visivel(usuario, id_paciente)
    if erro:
        return erro

    dados = request.get_json(silent=True) or {}
    email = (_limpo(dados.get("email")) or "").lower()
    parentesco = _limpo(dados.get("parentesco"))
    principal = dados.get("principal") is True

    if not email or not parentesco:
        return jsonify(erro="Informe o e-mail e o parentesco."), 400

    responsavel = consultar_um("SELECT id_usuario FROM usuario WHERE email = %s", (email,))
    if responsavel is None:
        return jsonify(erro="Usuário não encontrado."), 404
    id_responsavel = responsavel["id_usuario"]

    if _vinculo_ativo(id_paciente, id_responsavel) is not None:
        return jsonify(erro="Este usuário já está vinculado ao paciente."), 409

    with transacao() as con:
        # Só pode haver um principal: tiro o atual antes de marcar o novo.
        if principal:
            executar(
                "UPDATE paciente_responsavel SET principal = FALSE WHERE id_paciente = %s", (id_paciente,), con
            )
        _vincular(id_paciente, id_responsavel, parentesco, principal, con)
        auditoria.registrar(
            "vinculo.criar", "paciente", id_paciente,
            depois={"id_usuario": id_responsavel, "parentesco": parentesco, "principal": principal}, con=con,
        )

    return jsonify(mensagem="Vínculo criado."), 201


@bp.delete("/api/pacientes/<int:id_paciente>/responsaveis/<int:id_usuario>")
@login_obrigatorio("admin")
def encerrar_vinculo(usuario, id_paciente, id_usuario):
    paciente, erro = buscar_paciente_visivel(usuario, id_paciente)
    if erro:
        return erro

    vinculo = _vinculo_ativo(id_paciente, id_usuario)
    if vinculo is None:
        return jsonify(erro="Vínculo não encontrado."), 404

    # Paciente menor de 18 anos não pode ficar sem nenhum vínculo ativo.
    hoje = date.today()
    nascimento = paciente["data_nascimento"]
    idade = hoje.year - nascimento.year - ((hoje.month, hoje.day) < (nascimento.month, nascimento.day))
    total = consultar_um(
        "SELECT COUNT(*) AS total FROM paciente_responsavel WHERE id_paciente = %s AND ativo = TRUE",
        (id_paciente,),
    )["total"]
    if idade < 18 and total <= 1:
        return jsonify(erro="Paciente menor de 18 anos precisa de ao menos um responsável vinculado."), 400

    with transacao() as con:
        executar(
            "UPDATE paciente_responsavel SET ativo = FALSE, principal = FALSE "
            "WHERE id_paciente = %s AND id_usuario = %s",
            (id_paciente, id_usuario),
            con,
        )
        auditoria.registrar("vinculo.encerrar", "paciente", id_paciente, antes=vinculo, con=con)

    return jsonify(mensagem="Vínculo encerrado.")


@bp.patch("/api/pacientes/<int:id_paciente>/responsaveis/<int:id_usuario>/principal")
@login_obrigatorio("admin")
def tornar_principal(usuario, id_paciente, id_usuario):
    paciente, erro = buscar_paciente_visivel(usuario, id_paciente)
    if erro:
        return erro

    if _vinculo_ativo(id_paciente, id_usuario) is None:
        return jsonify(erro="Vínculo não encontrado."), 404

    # Tiro o principal atual primeiro, por causa do UNIQUE do banco, e depois marco o novo.
    with transacao() as con:
        executar("UPDATE paciente_responsavel SET principal = FALSE WHERE id_paciente = %s", (id_paciente,), con)
        executar(
            "UPDATE paciente_responsavel SET principal = TRUE WHERE id_paciente = %s AND id_usuario = %s",
            (id_paciente, id_usuario),
            con,
        )
        auditoria.registrar("vinculo.principal", "paciente", id_paciente, depois={"id_usuario": id_usuario}, con=con)

    return jsonify(mensagem="Responsável principal alterado.")


@bp.post("/api/pacientes/<int:id_paciente>/consentimento")
@login_obrigatorio("responsavel")
def registrar_consentimento(usuario, id_paciente):
    # Aqui não uso buscar_paciente_visivel: sem consentimento ele ainda não vê o paciente.
    paciente = consultar_um(
        "SELECT id_paciente FROM paciente WHERE id_paciente = %s AND ativo = TRUE", (id_paciente,)
    )
    if paciente is None:
        return jsonify(erro="Paciente não encontrado."), 404
    if _vinculo_ativo(id_paciente, usuario["id_usuario"]) is None:
        return jsonify(erro="Você não tem vínculo com este paciente."), 403

    with transacao() as con:
        _registrar_consentimento(id_paciente, usuario["id_usuario"], usuario["id_usuario"], con)
        auditoria.registrar(
            "consentimento.registrar", "paciente", id_paciente,
            depois={"versao_termo": Config.TERMO_LGPD_VERSAO}, con=con,
        )

    return jsonify(mensagem="Consentimento registrado."), 201


@bp.delete("/api/pacientes/<int:id_paciente>/consentimento")
@login_obrigatorio("responsavel")
def revogar_consentimento(usuario, id_paciente):
    paciente = consultar_um(
        "SELECT id_paciente FROM paciente WHERE id_paciente = %s AND ativo = TRUE", (id_paciente,)
    )
    if paciente is None:
        return jsonify(erro="Paciente não encontrado."), 404
    if _vinculo_ativo(id_paciente, usuario["id_usuario"]) is None:
        return jsonify(erro="Você não tem vínculo com este paciente."), 403

    consentimento = consultar_um(
        "SELECT id_consentimento FROM consentimento_lgpd "
        "WHERE id_paciente = %s AND id_usuario_titular = %s AND versao_termo = %s AND revogado_em IS NULL",
        (id_paciente, usuario["id_usuario"], Config.TERMO_LGPD_VERSAO),
    )
    if consentimento is None:
        return jsonify(erro="Você não tem consentimento vigente para este paciente."), 404

    with transacao() as con:
        executar(
            "UPDATE consentimento_lgpd SET revogado_em = NOW() WHERE id_consentimento = %s",
            (consentimento["id_consentimento"],),
            con,
        )
        auditoria.registrar(
            "consentimento.revogar", "paciente", id_paciente,
            depois={"versao_termo": Config.TERMO_LGPD_VERSAO}, con=con,
        )

    return jsonify(mensagem="Consentimento revogado.")


@bp.get("/api/retencao")
@login_obrigatorio("admin")
def listar_retencao(usuario):
    linhas = consultar_todos(
        """
        SELECT r.id_paciente, p.nome, p.ativo, r.ultimo_registro_em, r.revisar_a_partir_de
        FROM vw_retencao_paciente r
        JOIN paciente p ON p.id_paciente = r.id_paciente
        ORDER BY r.revisar_a_partir_de
        """
    )

    for linha in linhas:
        linha["ativo"] = bool(linha["ativo"])
        linha["ultimo_registro_em"] = _texto_data(linha["ultimo_registro_em"])
        linha["revisar_a_partir_de"] = _texto_data(linha["revisar_a_partir_de"])

    return jsonify(linhas)
