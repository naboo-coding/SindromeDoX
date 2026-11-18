"""Configuração lida do arquivo .env (ou das variáveis de ambiente)."""
import os

from dotenv import load_dotenv

load_dotenv()


def _obrigatoria(nome):
    valor = os.getenv(nome)
    if not valor:
        raise RuntimeError(
            f"Variável de ambiente obrigatória ausente: {nome}. "
            "Copie .env.example para .env e preencha."
        )
    return valor


class Config:
    DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_NAME = os.getenv("DB_NAME", "SindromeX")
    DB_USER = _obrigatoria("DB_USER")
    DB_PASSWORD = _obrigatoria("DB_PASSWORD")
    DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "5"))

    SECRET_KEY = _obrigatoria("SECRET_KEY")
    CORS_ORIGINS = [
        origem.strip()
        for origem in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if origem.strip()
    ]
    DEBUG = os.getenv("DEBUG", "false").lower() == "true"
