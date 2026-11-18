import os
from dotenv import load_dotenv

load_dotenv()

# Verifica se as configurações obrigatórias foram preenchidas.
def _obrigatoria(nome):
    valor = os.getenv(nome)

    if not valor:
        raise RuntimeError(
            f"Variável de ambiente obrigatória ausente: {nome}. "
            "Copie .env.example para .env e preencha."
        )

    return valor

# Aqui vai reunir as configurações utilizadas pela aplicação.
class Config:
    # Configurações de conexão com o MySQL.
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_NAME = os.getenv("DB_NAME", "SindromeX")
    DB_USER = _obrigatoria("DB_USER")
    DB_PASSWORD = _obrigatoria("DB_PASSWORD")

    # Quantidade de conexões q da pra fazer no pool.
    DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "5"))

    # Chave proteger as info
    SECRET_KEY = _obrigatoria("SECRET_KEY")

    # Endereços do Front-End
    CORS_ORIGINS = [
        origem.strip()
        for origem in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origem.strip()
    ]

    # Define se o modo de depuração estará ativado.
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
