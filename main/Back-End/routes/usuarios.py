"""Rotas de gestão de usuários, usadas só pelo administrador."""

from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash

import auditoria
from database import consultar_todos, consultar_um, executar, inserir, transacao
from seguranca import login_obrigatorio, usuario_publico

bp = Blueprint("usuarios", __name__)

PERFIS = ("responsavel", "profissional", "admin")


# Confiro os dados do formulário. Devolvo a mensagem de erro, ou None se estiver tudo certo.
def _validar(nome, email, perfil, cpf, telefone):
    if not nome or not email or not perfil:
        return "Preencha nome, e-mail e perfil."
    if "@" not in email:
        return "E-mail inválido."
    if perfil not in PERFIS:
        return "Perfil inválido."
    if cpf is not None and (not cpf.isdigit() or len(cpf) != 11):
        return "CPF inválido. Envie os 11 dígitos."
    if telefone is not None and (not telefone.isdigit() or len(telefone) not in (10, 11)):
        return "Telefone inválido. Envie de 10 a 11 dígitos."
    if perfil == "responsavel" and (cpf is None or telefone is None):
        return "Responsável precisa de CPF e telefone."
    return None


@bp.get("/api/usuarios")
@login_obrigatorio("admin")
def listar(usuario):
    usuarios = consultar_todos("SELECT * FROM usuario ORDER BY nome")
    return jsonify([usuario_publico(u) for u in usuarios])


@bp.post("/api/usuarios")
@login_obrigatorio("admin")
def criar(usuario):
    dados = request.get_json(silent=True) or {}
    nome = str(dados.get("nome") or "").strip()
    email = str(dados.get("email") or "").strip().lower()
    perfil = str(dados.get("perfil") or "").strip()
    senha = str(dados.get("senha") or "")
    cpf = str(dados.get("cpf") or "").strip() or None
    telefone = str(dados.get("telefone") or "").strip() or None

    erro = _validar(nome, email, perfil, cpf, telefone)
    if erro is not None:
        return jsonify(erro=erro), 400
    if len(senha) < 6:
        return jsonify(erro="A senha precisa ter pelo menos 6 caracteres."), 400

    # Confiro se o e-mail ou o CPF já estão em uso.
    if consultar_um("SELECT id_usuario FROM usuario WHERE email = %s", (email,)) is not None:
        return jsonify(erro="E-mail já cadastrado."), 409
    if cpf is not None and consultar_um("SELECT id_usuario FROM usuario WHERE cpf = %s", (cpf,)) is not None:
        return jsonify(erro="CPF já cadastrado."), 409

    # A equipe criada pelo admin já sai com o e-mail confirmado.
    if perfil == "responsavel":
        sql = (
            "INSERT INTO usuario (nome, email, senha_hash, cpf, telefone, perfil) "
            "VALUES (%s, %s, %s, %s, %s, %s)"
        )
    else:
        sql = (
            "INSERT INTO usuario (nome, email, senha_hash, cpf, telefone, perfil, email_confirmado_em) "
            "VALUES (%s, %s, %s, %s, %s, %s, NOW())"
        )

    with transacao() as con:
        id_usuario = inserir(sql, (nome, email, generate_password_hash(senha), cpf, telefone, perfil), con)
        novo = consultar_um("SELECT * FROM usuario WHERE id_usuario = %s", (id_usuario,), con)
        auditoria.registrar("usuario.criar", "usuario", id_usuario, depois=usuario_publico(novo), con=con)

    return jsonify(usuario_publico(novo)), 201


@bp.put("/api/usuarios/<int:id_usuario>")
@login_obrigatorio("admin")
def editar(usuario, id_usuario):
    atual = consultar_um("SELECT * FROM usuario WHERE id_usuario = %s", (id_usuario,))
    if atual is None:
        return jsonify(erro="Usuário não encontrado."), 404

    dados = request.get_json(silent=True) or {}
    nome = str(dados.get("nome") or "").strip()
    email = str(dados.get("email") or "").strip().lower()
    perfil = str(dados.get("perfil") or "").strip()
    senha = str(dados.get("senha") or "")

    # CPF e telefone não enviados continuam os mesmos.
    cpf = str(dados.get("cpf", atual["cpf"]) or "").strip() or None
    telefone = str(dados.get("telefone", atual["telefone"]) or "").strip() or None

    erro = _validar(nome, email, perfil, cpf, telefone)
    if erro is not None:
        return jsonify(erro=erro), 400
    if id_usuario == usuario["id_usuario"] and perfil != atual["perfil"]:
        return jsonify(erro="Você não pode mudar o seu próprio perfil."), 400
    if senha and len(senha) < 6:
        return jsonify(erro="A senha precisa ter pelo menos 6 caracteres."), 400
    if not senha and atual["senha_hash"] is None and perfil != "responsavel":
        return jsonify(erro="Informe uma senha para este perfil."), 400

    # Confiro se o e-mail ou o CPF já estão em uso por outra pessoa.
    if consultar_um(
        "SELECT id_usuario FROM usuario WHERE email = %s AND id_usuario <> %s", (email, id_usuario)
    ) is not None:
        return jsonify(erro="E-mail já cadastrado."), 409
    if cpf is not None and consultar_um(
        "SELECT id_usuario FROM usuario WHERE cpf = %s AND id_usuario <> %s", (cpf, id_usuario)
    ) is not None:
        return jsonify(erro="CPF já cadastrado."), 409

    with transacao() as con:
        executar(
            "UPDATE usuario SET nome = %s, email = %s, perfil = %s, cpf = %s, telefone = %s "
            "WHERE id_usuario = %s",
            (nome, email, perfil, cpf, telefone, id_usuario),
            con,
        )

        # Senha vazia mantém a atual.
        if senha:
            executar(
                "UPDATE usuario SET senha_hash = %s WHERE id_usuario = %s",
                (generate_password_hash(senha), id_usuario),
                con,
            )

        novo = consultar_um("SELECT * FROM usuario WHERE id_usuario = %s", (id_usuario,), con)
        auditoria.registrar("usuario.editar", "usuario", id_usuario,
                            antes=usuario_publico(atual), depois=usuario_publico(novo), con=con)

        # A troca de perfil tem um registro próprio na auditoria.
        if perfil != atual["perfil"]:
            auditoria.registrar("perfil.alterar", "usuario", id_usuario,
                                antes={"perfil": atual["perfil"]}, depois={"perfil": perfil}, con=con)

    return jsonify(usuario_publico(novo))


@bp.patch("/api/usuarios/<int:id_usuario>/ativo")
@login_obrigatorio("admin")
def alterar_ativo(usuario, id_usuario):
    dados = request.get_json(silent=True) or {}
    ativo = dados.get("ativo")
    if not isinstance(ativo, bool):
        return jsonify(erro="Informe ativo como true ou false."), 400

    atual = consultar_um("SELECT * FROM usuario WHERE id_usuario = %s", (id_usuario,))
    if atual is None:
        return jsonify(erro="Usuário não encontrado."), 404
    if id_usuario == usuario["id_usuario"] and not ativo:
        return jsonify(erro="Você não pode desativar a si mesmo."), 400

    acao = "usuario.ativar" if ativo else "usuario.desativar"

    with transacao() as con:
        executar("UPDATE usuario SET ativo = %s WHERE id_usuario = %s", (ativo, id_usuario), con)
        novo = consultar_um("SELECT * FROM usuario WHERE id_usuario = %s", (id_usuario,), con)
        auditoria.registrar(acao, "usuario", id_usuario,
                            antes={"ativo": bool(atual["ativo"])}, depois={"ativo": ativo}, con=con)

    return jsonify(usuario_publico(novo))
