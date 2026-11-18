"""Registra na tabela auditoria quem fez o quê no sistema."""

import json

from flask import request, session

from database import inserir


# Gravo uma linha de auditoria. Uso o usuário da sessão quando não informo outro.
def registrar(acao, entidade=None, id_entidade=None, antes=None, depois=None, id_usuario=None, con=None):
    if id_usuario is None:
        id_usuario = session.get("id_usuario")

    # Transformo os dados em JSON; datas e decimais viram texto.
    antes_json = json.dumps(antes, default=str) if antes is not None else None
    depois_json = json.dumps(depois, default=str) if depois is not None else None

    inserir(
        "INSERT INTO auditoria (id_usuario, acao, entidade, id_entidade, dados_antes, dados_depois, ip) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (id_usuario, acao, entidade, id_entidade, antes_json, depois_json, request.remote_addr),
        con,
    )
