"""Rotas das triagens: aplicar o questionário, calcular a pontuação, listar, editar e desativar."""
import json

from flask import Blueprint, jsonify, request

import auditoria
from config import Config
from database import consultar_todos, consultar_um, executar, inserir, transacao
from seguranca import buscar_paciente_visivel, eh_equipe, login_obrigatorio, pode_ver_paciente

bp = Blueprint("triagens", __name__)

# Consulta base das triagens, com o paciente, quem aplicou e o resultado.
SQL_TRIAGEM = """
    SELECT t.id_triagem, t.id_paciente, t.hora_triagem, t.respostas, t.editado_em,
           p.nome AS paciente_nome, p.sexo_biologico, p.data_nascimento,
           u.nome AS aplicada_por, r.pontuacao, r.limiar, r.status
    FROM triagem t
    JOIN paciente p ON p.id_paciente = t.id_paciente
    JOIN usuario u ON u.id_usuario = t.id_usuario
    JOIN resultado_triagem r ON r.id_triagem = t.id_triagem
    WHERE t.ativo = TRUE AND p.ativo = TRUE
"""


# Monto a triagem no formato que a API devolve.
def _triagem_json(linha):
    respostas = linha["respostas"]
    if isinstance(respostas, (str, bytes)):
        respostas = json.loads(respostas)

    editado_em = linha["editado_em"]
    if editado_em is not None:
        editado_em = editado_em.strftime("%Y-%m-%d %H:%M:%S")

    pontuacao = linha["pontuacao"]
    if pontuacao is not None:
        pontuacao = float(pontuacao)

    limiar = linha["limiar"]
    if limiar is not None:
        limiar = float(limiar)

    return {
        "id_triagem": linha["id_triagem"],
        "id_paciente": linha["id_paciente"],
        "paciente": {
            "nome": linha["paciente_nome"],
            "sexo_biologico": linha["sexo_biologico"],
            "data_nascimento": linha["data_nascimento"].strftime("%Y-%m-%d"),
        },
        "hora_triagem": linha["hora_triagem"].strftime("%Y-%m-%d %H:%M:%S"),
        "aplicada_por": linha["aplicada_por"],
        "respostas": respostas,
        "pontuacao": pontuacao,
        "limiar": limiar,
        "status": linha["status"],
        "editado_em": editado_em,
    }


# Busco uma triagem ativa de um paciente ativo, ou None.
def _buscar_triagem(id_triagem):
    return consultar_um(SQL_TRIAGEM + " AND t.id_triagem = %s", (id_triagem,))


# As respostas precisam ser um objeto com a lista "signs".
def _respostas_validas(respostas):
    return isinstance(respostas, dict) and isinstance(respostas.get("signs"), list)


# Calculo a pontuação com o checklist ativo.
# Devolvo (id da versão, pontuação, limiar); a pontuação fica None se o checklist não estiver pronto.
def _calcular(sexo, respostas):
    versao = consultar_um(
        "SELECT id_checklist_versao, limiar_m, limiar_f FROM checklist_versao WHERE ativa = TRUE"
    )
    id_versao = versao["id_checklist_versao"]
    limiar = versao["limiar_m"] if sexo == "M" else versao["limiar_f"]

    prontidao = consultar_um(
        "SELECT pronto FROM vw_checklist_prontidao WHERE id_checklist_versao = %s AND sexo = %s",
        (id_versao, sexo),
    )
    if not prontidao["pronto"]:
        return id_versao, None, limiar

    # Somo os pesos dos sinais marcados que valem para o sexo do paciente.
    sintomas = consultar_todos(
        "SELECT codigo, peso_m, peso_f FROM checklist_sintoma "
        "WHERE id_checklist_versao = %s AND (sexo_restrito IS NULL OR sexo_restrito = %s)",
        (id_versao, sexo),
    )
    total = 0
    for sintoma in sintomas:
        if sintoma["codigo"] in respostas["signs"]:
            total += sintoma["peso_m"] if sexo == "M" else sintoma["peso_f"]

    return id_versao, round(total, 2), limiar


@bp.get("/api/triagens")
@login_obrigatorio()
def listar(usuario):
    # A equipe vê todas; o responsável só as dos pacientes com vínculo e consentimento.
    if eh_equipe(usuario):
        linhas = consultar_todos(SQL_TRIAGEM + " ORDER BY t.hora_triagem DESC, t.id_triagem DESC")
    else:
        linhas = consultar_todos(
            SQL_TRIAGEM
            + """
            AND EXISTS (
                SELECT 1 FROM paciente_responsavel pr
                JOIN consentimento_lgpd c ON c.id_paciente = pr.id_paciente
                  AND c.id_usuario_titular = pr.id_usuario
                  AND c.versao_termo = %s AND c.revogado_em IS NULL
                WHERE pr.id_paciente = t.id_paciente AND pr.id_usuario = %s AND pr.ativo = TRUE
            )
            ORDER BY t.hora_triagem DESC, t.id_triagem DESC
            """,
            (Config.TERMO_LGPD_VERSAO, usuario["id_usuario"]),
        )

    return jsonify([_triagem_json(linha) for linha in linhas])


@bp.get("/api/pacientes/<int:id_paciente>/triagens")
@login_obrigatorio()
def listar_do_paciente(usuario, id_paciente):
    paciente, erro = buscar_paciente_visivel(usuario, id_paciente)
    if erro:
        return erro

    linhas = consultar_todos(
        SQL_TRIAGEM + " AND t.id_paciente = %s ORDER BY t.hora_triagem DESC, t.id_triagem DESC",
        (id_paciente,),
    )
    return jsonify([_triagem_json(linha) for linha in linhas])


@bp.get("/api/triagens/<int:id_triagem>")
@login_obrigatorio()
def detalhar(usuario, id_triagem):
    linha = _buscar_triagem(id_triagem)
    if linha is None:
        return jsonify(erro="Triagem não encontrada."), 404
    if not pode_ver_paciente(usuario, linha["id_paciente"]):
        return jsonify(erro="Você não tem acesso a este paciente."), 403

    return jsonify(_triagem_json(linha))


@bp.post("/api/triagens")
@login_obrigatorio()
def criar(usuario):
    dados = request.get_json(silent=True) or {}
    id_paciente = dados.get("id_paciente")
    respostas = dados.get("respostas")

    if not isinstance(id_paciente, int):
        return jsonify(erro="Informe o paciente."), 400
    if not _respostas_validas(respostas):
        return jsonify(erro="Respostas inválidas: envie um objeto com a lista signs."), 400

    paciente, erro = buscar_paciente_visivel(usuario, id_paciente)
    if erro:
        return erro

    id_versao, pontuacao, limiar = _calcular(paciente["sexo_biologico"], respostas)

    # Gravo a triagem, o resultado e a auditoria juntos.
    with transacao() as con:
        id_triagem = inserir(
            "INSERT INTO triagem (respostas, id_paciente, id_usuario, id_checklist_versao) "
            "VALUES (%s, %s, %s, %s)",
            (json.dumps(respostas), id_paciente, usuario["id_usuario"], id_versao),
            con,
        )
        inserir(
            "INSERT INTO resultado_triagem (pontuacao, limiar, id_triagem) VALUES (%s, %s, %s)",
            (pontuacao, limiar, id_triagem),
            con,
        )
        auditoria.registrar(
            "triagem.criar", "triagem", id_triagem,
            depois={"id_paciente": id_paciente, "respostas": respostas, "pontuacao": pontuacao},
            con=con,
        )

    return jsonify(_triagem_json(_buscar_triagem(id_triagem))), 201


@bp.put("/api/triagens/<int:id_triagem>")
@login_obrigatorio("admin")
def editar(usuario, id_triagem):
    dados = request.get_json(silent=True) or {}
    respostas = dados.get("respostas")

    antes = _buscar_triagem(id_triagem)
    if antes is None:
        return jsonify(erro="Triagem não encontrada."), 404
    if not _respostas_validas(respostas):
        return jsonify(erro="Respostas inválidas: envie um objeto com a lista signs."), 400

    # Recalculo sempre com o checklist ativo.
    id_versao, pontuacao, limiar = _calcular(antes["sexo_biologico"], respostas)
    antes_json = _triagem_json(antes)

    with transacao() as con:
        executar(
            "UPDATE triagem SET respostas = %s, id_checklist_versao = %s, "
            "id_usuario_edicao = %s, editado_em = NOW() WHERE id_triagem = %s",
            (json.dumps(respostas), id_versao, usuario["id_usuario"], id_triagem),
            con,
        )
        executar(
            "UPDATE resultado_triagem SET pontuacao = %s, limiar = %s, hora_calculo = NOW() "
            "WHERE id_triagem = %s",
            (pontuacao, limiar, id_triagem),
            con,
        )
        auditoria.registrar(
            "triagem.editar", "triagem", id_triagem,
            antes={"respostas": antes_json["respostas"], "pontuacao": antes_json["pontuacao"]},
            depois={"respostas": respostas, "pontuacao": pontuacao},
            con=con,
        )

    return jsonify(_triagem_json(_buscar_triagem(id_triagem)))


@bp.delete("/api/triagens/<int:id_triagem>")
@login_obrigatorio("admin")
def excluir(usuario, id_triagem):
    if _buscar_triagem(id_triagem) is None:
        return jsonify(erro="Triagem não encontrada."), 404

    # Nada clínico é apagado: só desativo.
    with transacao() as con:
        executar("UPDATE triagem SET ativo = FALSE WHERE id_triagem = %s", (id_triagem,), con)
        auditoria.registrar("triagem.excluir", "triagem", id_triagem, con=con)

    return jsonify(mensagem="Triagem excluída.")
