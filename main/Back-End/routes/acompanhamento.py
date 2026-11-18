"""Rotas do acompanhamento pós-triagem: a linha do tempo de cada paciente."""
from datetime import datetime

from flask import Blueprint, jsonify, request

import auditoria
from database import consultar_todos, consultar_um, executar, inserir, transacao
from seguranca import buscar_paciente_visivel, login_obrigatorio

bp = Blueprint("acompanhamento", __name__)

# Tipos de evento aceitos pelo banco.
TIPOS = ("encaminhado_exame", "exame_realizado", "resultado_dna", "auxilio_concedido", "auxilio_negado")

# Eventos de auxílio são decisão do Instituto: só o admin registra ou exclui.
TIPOS_AUXILIO = ("auxilio_concedido", "auxilio_negado")

# Consulta base dos eventos, com o nome de quem registrou.
SQL_EVENTO = """
    SELECT a.id_evento, a.id_paciente, a.tipo, a.resultado_dna, a.data_evento,
           a.id_triagem, a.observacao, a.registrado_em, u.nome AS registrado_por
    FROM acompanhamento_paciente a
    JOIN usuario u ON u.id_usuario = a.id_usuario_registro
    WHERE a.ativo = TRUE
"""


# Monto o evento no formato que a API devolve.
def _evento_json(linha):
    return {
        "id_evento": linha["id_evento"],
        "id_paciente": linha["id_paciente"],
        "tipo": linha["tipo"],
        "resultado_dna": linha["resultado_dna"],
        "data_evento": linha["data_evento"].strftime("%Y-%m-%d"),
        "id_triagem": linha["id_triagem"],
        "observacao": linha["observacao"],
        "registrado_por": linha["registrado_por"],
        "registrado_em": linha["registrado_em"].strftime("%Y-%m-%d %H:%M:%S"),
    }


@bp.get("/api/pacientes/<int:id_paciente>/acompanhamento")
@login_obrigatorio()
def listar(usuario, id_paciente):
    paciente, erro = buscar_paciente_visivel(usuario, id_paciente)
    if erro:
        return erro

    linhas = consultar_todos(
        SQL_EVENTO + " AND a.id_paciente = %s ORDER BY a.data_evento DESC, a.id_evento DESC",
        (id_paciente,),
    )
    return jsonify([_evento_json(linha) for linha in linhas])


@bp.post("/api/pacientes/<int:id_paciente>/acompanhamento")
@login_obrigatorio("profissional", "admin")
def registrar_evento(usuario, id_paciente):
    paciente, erro = buscar_paciente_visivel(usuario, id_paciente)
    if erro:
        return erro

    dados = request.get_json(silent=True) or {}
    tipo = dados.get("tipo")
    resultado_dna = dados.get("resultado_dna")
    data_evento = dados.get("data_evento")
    id_triagem = dados.get("id_triagem")
    observacao = str(dados.get("observacao") or "").strip() or None

    if tipo not in TIPOS:
        return jsonify(erro="Tipo de evento inválido."), 400
    if tipo in TIPOS_AUXILIO and usuario["perfil"] != "admin":
        return jsonify(erro="Só o administrador registra decisões de auxílio."), 403

    # O resultado do DNA só existe no evento resultado_dna.
    if tipo == "resultado_dna":
        if resultado_dna not in ("positivo", "negativo"):
            return jsonify(erro="Informe o resultado do DNA: positivo ou negativo."), 400
    elif resultado_dna:
        return jsonify(erro="O resultado do DNA só vale para o evento resultado_dna."), 400
    else:
        resultado_dna = None

    # Confiro se a data veio no formato AAAA-MM-DD.
    try:
        datetime.strptime(str(data_evento), "%Y-%m-%d")
    except ValueError:
        return jsonify(erro="Informe a data do evento no formato AAAA-MM-DD."), 400

    # A triagem, quando informada, precisa ser deste paciente.
    if id_triagem is not None:
        triagem = None
        if isinstance(id_triagem, int):
            triagem = consultar_um(
                "SELECT 1 FROM triagem WHERE id_triagem = %s AND id_paciente = %s AND ativo = TRUE",
                (id_triagem, id_paciente),
            )
        if triagem is None:
            return jsonify(erro="Triagem não encontrada para este paciente."), 400

    with transacao() as con:
        id_evento = inserir(
            "INSERT INTO acompanhamento_paciente "
            "(id_paciente, tipo, resultado_dna, data_evento, id_triagem, observacao, id_usuario_registro) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (id_paciente, tipo, resultado_dna, data_evento, id_triagem, observacao, usuario["id_usuario"]),
            con,
        )
        auditoria.registrar(
            "acompanhamento.registrar", "acompanhamento_paciente", id_evento,
            depois={"id_paciente": id_paciente, "tipo": tipo, "resultado_dna": resultado_dna,
                    "data_evento": data_evento, "id_triagem": id_triagem, "observacao": observacao},
            con=con,
        )

    linha = consultar_um(SQL_EVENTO + " AND a.id_evento = %s", (id_evento,))
    return jsonify(_evento_json(linha)), 201


@bp.delete("/api/acompanhamento/<int:id_evento>")
@login_obrigatorio("profissional", "admin")
def excluir(usuario, id_evento):
    evento = consultar_um(
        "SELECT a.tipo FROM acompanhamento_paciente a "
        "JOIN paciente p ON p.id_paciente = a.id_paciente "
        "WHERE a.id_evento = %s AND a.ativo = TRUE AND p.ativo = TRUE",
        (id_evento,),
    )
    if evento is None:
        return jsonify(erro="Evento não encontrado."), 404
    if evento["tipo"] in TIPOS_AUXILIO and usuario["perfil"] != "admin":
        return jsonify(erro="Só o administrador exclui decisões de auxílio."), 403

    # Evento errado é desativado, não apagado.
    with transacao() as con:
        executar("UPDATE acompanhamento_paciente SET ativo = FALSE WHERE id_evento = %s", (id_evento,), con)
        auditoria.registrar("acompanhamento.excluir", "acompanhamento_paciente", id_evento, con=con)

    return jsonify(mensagem="Evento excluído.")
