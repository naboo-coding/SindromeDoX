"""Endpoint de verificação: a API está de pé e o banco responde?"""
from flask import Blueprint, current_app, jsonify

from database import consultar_todos, consultar_um

bp = Blueprint("saude", __name__)


@bp.get("/api/saude")
def saude():
    try:
        consultar_um("SELECT 1 AS ok")
        prontidao = consultar_todos(
            """
            SELECT p.sexo, p.pronto
            FROM vw_checklist_prontidao p
            JOIN checklist_versao v ON v.id_checklist_versao = p.id_checklist_versao
            WHERE v.ativa = TRUE
            """
        )
    except Exception:
        # O detalhe vai para o log do servidor; nunca para quem chamou a API.
        current_app.logger.exception("Falha ao consultar o banco no /api/saude")
        return jsonify(status="erro", banco="indisponivel"), 503

    return jsonify(
        status="ok",
        banco="conectado",
        # False = pesos/limiar ainda não definidos; triagens ficam "pendentes".
        checklist_pronto={linha["sexo"]: bool(linha["pronto"]) for linha in prontidao},
    )
