"""Controle de login, perfis e acesso aos pacientes."""

from functools import wraps

from flask import jsonify, session

from config import Config
from database import consultar_um


# Busco o usuário logado no banco, ou devolvo None se ninguém estiver logado.
def usuario_logado():
    id_usuario = session.get("id_usuario")
    if id_usuario is None:
        return None

    usuario = consultar_um("SELECT * FROM usuario WHERE id_usuario = %s", (id_usuario,))

    # Conta desativada depois do login perde o acesso na hora.
    if usuario is None or not usuario["ativo"]:
        session.clear()
        return None

    return usuario


# Monto o usuário que a API devolve, sem a senha.
def usuario_publico(usuario):
    return {
        "id_usuario": usuario["id_usuario"],
        "nome": usuario["nome"],
        "email": usuario["email"],
        "cpf": usuario["cpf"],
        "telefone": usuario["telefone"],
        "whatsapp": usuario["whatsapp"],
        "telefone2": usuario["telefone2"],
        "perfil": usuario["perfil"],
        "ativo": bool(usuario["ativo"]),
        "email_confirmado": usuario["email_confirmado_em"] is not None,
    }


# Equipe é profissional ou admin.
def eh_equipe(usuario):
    return usuario["perfil"] in ("profissional", "admin")


# Decorador: a rota só funciona com alguém logado.
# Quando passo perfis, só esses perfis podem usar a rota.
def login_obrigatorio(*perfis):
    def decorador(funcao):
        @wraps(funcao)
        def rota(*args, **kwargs):
            usuario = usuario_logado()
            if usuario is None:
                return jsonify(erro="Faça login para continuar."), 401
            if perfis and usuario["perfil"] not in perfis:
                return jsonify(erro="Você não tem permissão para isso."), 403
            return funcao(usuario, *args, **kwargs)

        return rota

    return decorador


# Regra de acesso ao paciente:
# a equipe vê todos os pacientes ativos;
# o responsável vê só os pacientes com vínculo ativo e consentimento dele vigente.
def pode_ver_paciente(usuario, id_paciente):
    if eh_equipe(usuario):
        return True

    vinculo = consultar_um(
        "SELECT 1 FROM paciente_responsavel pr "
        "JOIN consentimento_lgpd c ON c.id_paciente = pr.id_paciente "
        "  AND c.id_usuario_titular = pr.id_usuario "
        "  AND c.versao_termo = %s AND c.revogado_em IS NULL "
        "WHERE pr.id_paciente = %s AND pr.id_usuario = %s AND pr.ativo = TRUE",
        (Config.TERMO_LGPD_VERSAO, id_paciente, usuario["id_usuario"]),
    )
    return vinculo is not None


# Busco o paciente ativo e confiro o acesso.
# Devolvo (paciente, None) quando pode, ou (None, resposta de erro) quando não pode.
def buscar_paciente_visivel(usuario, id_paciente):
    paciente = consultar_um(
        "SELECT * FROM paciente WHERE id_paciente = %s AND ativo = TRUE", (id_paciente,)
    )
    if paciente is None:
        return None, (jsonify(erro="Paciente não encontrado."), 404)
    if not pode_ver_paciente(usuario, id_paciente):
        return None, (jsonify(erro="Você não tem acesso a este paciente."), 403)
    return paciente, None
