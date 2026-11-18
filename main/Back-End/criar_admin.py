"""
Crio o primeiro administrador do sistema.
O cadastro público sempre cria 'responsavel', então o primeiro admin
precisa ser criado por este script, uma única vez.

Uso (dentro de Back-End/, com o .env preenchido):
    python criar_admin.py
"""

from getpass import getpass

from werkzeug.security import generate_password_hash

from database import consultar_um, inserir


print("Criação do primeiro administrador")
nome = input("Nome: ").strip()
email = input("E-mail: ").strip().lower()
senha = getpass("Senha (mínimo 6 caracteres): ")

# Confiro os dados antes de gravar no banco.
if not nome or not email or len(senha) < 6:
    print("Preencha nome, e-mail e uma senha com pelo menos 6 caracteres.")
elif consultar_um("SELECT id_usuario FROM usuario WHERE email = %s", (email,)):
    print("Já existe um usuário com esse e-mail.")
else:
    # Gravo só o hash da senha, nunca a senha pura.
    id_usuario = inserir(
        "INSERT INTO usuario (nome, email, senha_hash, perfil, email_confirmado_em, aceite_termos_em) "
        "VALUES (%s, %s, %s, 'admin', NOW(), NOW())",
        (nome, email, generate_password_hash(senha)),
    )
    print(f"Administrador criado com id {id_usuario}.")
