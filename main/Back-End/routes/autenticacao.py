"""Rotas de cadastro, login, sessão e recuperação de senha."""

import hashlib
import secrets

from flask import Blueprint, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

import auditoria
from config import Config
from database import consultar_um, executar, inserir, transacao
from seguranca import login_obrigatorio, usuario_publico

bp = Blueprint("autenticacao", __name__)


# Gero um token novo e gravo só o hash dele no banco.
def _gerar_token(id_usuario, tipo, horas, con):
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    inserir(
        "INSERT INTO token_usuario (id_usuario, tipo, token_hash, expira_em) "
        "VALUES (%s, %s, %s, DATE_ADD(NOW(), INTERVAL %s HOUR))",
        (id_usuario, tipo, token_hash, horas),
        con,
    )
    return token


# Busco um token válido: existe, não foi usado e não venceu.
def _buscar_token(token, tipo, con):
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return consultar_um(
        "SELECT id_token, id_usuario FROM token_usuario "
        "WHERE token_hash = %s AND tipo = %s AND usado_em IS NULL AND expira_em > NOW()",
        (token_hash, tipo),
        con,
    )


@bp.post("/api/cadastro")
def cadastro():
    dados = request.get_json(silent=True) or {}
    nome = str(dados.get("nome") or "").strip()
    email = str(dados.get("email") or "").strip().lower()
    senha = str(dados.get("senha") or "")
    cpf = str(dados.get("cpf") or "").strip()
    telefone = str(dados.get("telefone") or "").strip()

    # Confiro os dados antes de gravar no banco.
    if not nome or not email or not senha or not cpf or not telefone:
        return jsonify(erro="Preencha nome, e-mail, senha, CPF e telefone."), 400
    if "@" not in email:
        return jsonify(erro="E-mail inválido."), 400
    if len(senha) < 6:
        return jsonify(erro="A senha precisa ter pelo menos 6 caracteres."), 400
    if not cpf.isdigit() or len(cpf) != 11:
        return jsonify(erro="CPF inválido. Envie os 11 dígitos."), 400
    if not telefone.isdigit() or len(telefone) not in (10, 11):
        return jsonify(erro="Telefone inválido. Envie de 10 a 11 dígitos."), 400
    if dados.get("aceite_termos") is not True:
        return jsonify(erro="É preciso aceitar os termos de uso."), 400

    existente = consultar_um("SELECT id_usuario, senha_hash FROM usuario WHERE email = %s", (email,))
    if existente is not None and existente["senha_hash"] is not None:
        return jsonify(erro="E-mail já cadastrado."), 409

    # Confiro se o CPF já pertence a outra pessoa.
    id_existente = existente["id_usuario"] if existente is not None else 0
    outro = consultar_um(
        "SELECT id_usuario FROM usuario WHERE cpf = %s AND id_usuario <> %s", (cpf, id_existente)
    )
    if outro is not None:
        return jsonify(erro="CPF já cadastrado."), 409

    with transacao() as con:
        if existente is None:
            # Gravo só o hash da senha.
            id_usuario = inserir(
                "INSERT INTO usuario (nome, email, senha_hash, cpf, telefone, perfil, aceite_termos_em) "
                "VALUES (%s, %s, %s, %s, %s, 'responsavel', NOW())",
                (nome, email, generate_password_hash(senha), cpf, telefone),
                con,
            )
        else:
            # Contato cadastrado pela equipe: a pessoa assume a conta, mas ainda confirma o e-mail.
            id_usuario = existente["id_usuario"]
            executar(
                "UPDATE usuario SET nome = %s, senha_hash = %s, cpf = %s, telefone = %s, "
                "aceite_termos_em = NOW(), email_confirmado_em = NULL WHERE id_usuario = %s",
                (nome, generate_password_hash(senha), cpf, telefone, id_usuario),
                con,
            )

        token = _gerar_token(id_usuario, "confirmacao_email", 24, con)
        auditoria.registrar("usuario.cadastrar", "usuario", id_usuario, id_usuario=id_usuario, con=con)

    # Sem envio de e-mail: mostro o link no terminal do Flask.
    print("Link de confirmação de e-mail:")
    print(f"{Config.FRONT_URL}/confirmar-email?token={token}", flush=True)

    return jsonify(mensagem="Cadastro realizado. Confirme seu e-mail pelo link enviado."), 201


@bp.post("/api/confirmar-email")
def confirmar_email():
    dados = request.get_json(silent=True) or {}
    token = str(dados.get("token") or "")
    if not token:
        return jsonify(erro="Link inválido ou expirado."), 400

    with transacao() as con:
        encontrado = _buscar_token(token, "confirmacao_email", con)
        if encontrado is None:
            return jsonify(erro="Link inválido ou expirado."), 400

        executar(
            "UPDATE usuario SET email_confirmado_em = NOW() "
            "WHERE id_usuario = %s AND email_confirmado_em IS NULL",
            (encontrado["id_usuario"],),
            con,
        )
        executar("UPDATE token_usuario SET usado_em = NOW() WHERE id_token = %s", (encontrado["id_token"],), con)

    return jsonify(mensagem="E-mail confirmado. Você já pode entrar.")


@bp.post("/api/login")
def login():
    dados = request.get_json(silent=True) or {}
    email = str(dados.get("email") or "").strip().lower()
    senha = str(dados.get("senha") or "")
    if not email or not senha:
        return jsonify(erro="Informe e-mail e senha."), 400

    # Encerro qualquer sessão anterior antes de tentar entrar.
    session.clear()

    usuario = consultar_um("SELECT * FROM usuario WHERE email = %s", (email,))

    # E-mail desconhecido, conta sem senha ou senha errada recebem a mesma resposta.
    if usuario is None:
        auditoria.registrar("login.falha", depois={"email": email})
        return jsonify(erro="E-mail ou senha incorretos."), 401
    if usuario["senha_hash"] is None or not check_password_hash(usuario["senha_hash"], senha):
        auditoria.registrar("login.falha", "usuario", usuario["id_usuario"], depois={"email": email},
                            id_usuario=usuario["id_usuario"])
        return jsonify(erro="E-mail ou senha incorretos."), 401

    # Confiro se a conta está ativa e com o e-mail confirmado.
    if not usuario["ativo"]:
        auditoria.registrar("login.falha", "usuario", usuario["id_usuario"], depois={"motivo": "desativado"},
                            id_usuario=usuario["id_usuario"])
        return jsonify(erro="Usuário desativado. Fale com um administrador."), 403
    if usuario["email_confirmado_em"] is None:
        auditoria.registrar("login.falha", "usuario", usuario["id_usuario"], depois={"motivo": "email_nao_confirmado"},
                            id_usuario=usuario["id_usuario"])
        return jsonify(erro="Confirme seu e-mail antes de entrar."), 403

    session["id_usuario"] = usuario["id_usuario"]
    auditoria.registrar("login.sucesso", "usuario", usuario["id_usuario"], id_usuario=usuario["id_usuario"])
    return jsonify(usuario_publico(usuario))


@bp.post("/api/logout")
@login_obrigatorio()
def logout(usuario):
    session.clear()
    return jsonify(mensagem="Sessão encerrada.")


@bp.get("/api/sessao")
@login_obrigatorio()
def sessao(usuario):
    return jsonify(usuario_publico(usuario))


@bp.post("/api/esqueci-senha")
def esqueci_senha():
    dados = request.get_json(silent=True) or {}
    email = str(dados.get("email") or "").strip().lower()
    if not email:
        return jsonify(erro="Informe o e-mail."), 400

    usuario = consultar_um("SELECT id_usuario FROM usuario WHERE email = %s AND ativo = TRUE", (email,))

    # Só gero o link se a conta existe e está ativa.
    if usuario is not None:
        with transacao() as con:
            token = _gerar_token(usuario["id_usuario"], "recuperacao_senha", 1, con)

        print("Link para criar uma nova senha:")
        print(f"{Config.FRONT_URL}/nova-senha?token={token}", flush=True)

    # A resposta é sempre a mesma, para não revelar quem tem conta.
    return jsonify(mensagem="Se o e-mail estiver cadastrado, enviaremos um link para criar uma nova senha.")


@bp.post("/api/nova-senha")
def nova_senha():
    dados = request.get_json(silent=True) or {}
    token = str(dados.get("token") or "")
    senha = str(dados.get("senha") or "")
    if not token or not senha:
        return jsonify(erro="Informe o token e a nova senha."), 400
    if len(senha) < 6:
        return jsonify(erro="A senha precisa ter pelo menos 6 caracteres."), 400

    with transacao() as con:
        encontrado = _buscar_token(token, "recuperacao_senha", con)
        if encontrado is None:
            return jsonify(erro="Link inválido ou expirado."), 400

        # Troco a senha e confirmo o e-mail, pois o link prova que a pessoa é dona dele.
        executar(
            "UPDATE usuario SET senha_hash = %s, email_confirmado_em = COALESCE(email_confirmado_em, NOW()) "
            "WHERE id_usuario = %s",
            (generate_password_hash(senha), encontrado["id_usuario"]),
            con,
        )
        executar("UPDATE token_usuario SET usado_em = NOW() WHERE id_token = %s", (encontrado["id_token"],), con)
        auditoria.registrar("senha.redefinir", "usuario", encontrado["id_usuario"],
                            id_usuario=encontrado["id_usuario"], con=con)

    return jsonify(mensagem="Senha alterada. Você já pode entrar.")
