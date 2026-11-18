"""Rota que entrega o checklist ativo para o questionário do front."""

from flask import Blueprint, jsonify

from database import consultar_todos, consultar_um
from seguranca import login_obrigatorio

bp = Blueprint("checklist", __name__)


@bp.get("/api/checklist")
@login_obrigatorio()
def checklist(usuario):
    versao = consultar_um(
        "SELECT id_checklist_versao, fonte, limiar_m, limiar_f FROM checklist_versao WHERE ativa = TRUE"
    )
    if versao is None:
        return jsonify(erro="Nenhum checklist ativo."), 404

    # Limiar ainda não definido vira null.
    limiar_m = float(versao["limiar_m"]) if versao["limiar_m"] is not None else None
    limiar_f = float(versao["limiar_f"]) if versao["limiar_f"] is not None else None

    prontidao = consultar_todos(
        "SELECT sexo, pronto FROM vw_checklist_prontidao WHERE id_checklist_versao = %s",
        (versao["id_checklist_versao"],),
    )

    # Os pesos não saem da API: busco só o que o front precisa mostrar.
    sintomas = consultar_todos(
        "SELECT codigo, rotulo, grupo, sexo_restrito FROM checklist_sintoma "
        "WHERE id_checklist_versao = %s ORDER BY id_sintoma",
        (versao["id_checklist_versao"],),
    )

    return jsonify(
        id_checklist_versao=versao["id_checklist_versao"],
        fonte=versao["fonte"],
        limiar={"M": limiar_m, "F": limiar_f},
        pronto={linha["sexo"]: bool(linha["pronto"]) for linha in prontidao},
        sintomas=sintomas,
    )
