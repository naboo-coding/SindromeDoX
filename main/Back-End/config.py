"""
Centralizo neste arquivo as configurações do Back-End,
utilizando os valores definidos no arquivo .env.
"""

import os
from dotenv import load_dotenv

# Carrego as variáveis de ambiente do arquivo .env.
load_dotenv()


# Verifico se as configurações obrigatórias foram preenchidas.
def _obrigatoria(nome):
    valor = os.getenv(nome)

    if not valor:
        raise RuntimeError(
            f"Variável de ambiente obrigatória ausente: {nome}. "
            "Copie .env.example para .env e preencha."
        )

    return valor


# Reúno as configurações utilizadas pelo restante da aplicação.
class Config:

    # Configurações de conexão com o MySQL.
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_NAME = os.getenv("DB_NAME", "SindromeX")
    DB_USER = _obrigatoria("DB_USER")
    DB_PASSWORD = _obrigatoria("DB_PASSWORD")

    # Quantidade de conexões disponíveis no pool.
    DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "5"))

    # Chave utilizada para proteger informações da aplicação.
    SECRET_KEY = _obrigatoria("SECRET_KEY")

    # Endereços do Front-End autorizados a acessar a API.
    CORS_ORIGINS = [
        origem.strip()
        for origem in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origem.strip()
    ]

    # Defino se o modo de depuração estará ativado.
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
