"""Conexão com o MySQL: pool de conexões e funções de consulta.

Regras deste módulo:
  * SEMPRE usar parâmetros (%s) nas consultas; nunca montar SQL concatenando
    texto vindo do usuário (evita SQL injection).
  * Sessão em modo estrito, igual ao usado nos testes do banco.
  * Operações que gravam devem rodar dentro de `transacao()`, para que várias
    gravações relacionadas (ex.: triagem + resultado + auditoria) aconteçam
    todas ou nenhuma.
"""
from contextlib import contextmanager

from mysql.connector import pooling

from config import Config

SQL_MODE = (
    "STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION,ONLY_FULL_GROUP_BY,"
    "NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO"
)

_pool = None


def _get_pool():
    """Cria o pool na primeira chamada e reaproveita nas seguintes."""
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="sindromex",
            pool_size=Config.DB_POOL_SIZE,
            pool_reset_session=True,
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            database=Config.DB_NAME,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            charset="utf8mb4",
            collation="utf8mb4_0900_ai_ci",
            sql_mode=SQL_MODE,
            autocommit=False,
        )
    return _pool


@contextmanager
def conexao():
    """Pega uma conexão do pool e a devolve ao final."""
    con = _get_pool().get_connection()
    try:
        yield con
    finally:
        con.close()  # em conexão de pool, close() devolve ao pool


@contextmanager
def transacao():
    """Conexão com commit no sucesso e rollback em qualquer erro."""
    with conexao() as con:
        try:
            yield con
            con.commit()
        except Exception:
            con.rollback()
            raise


def consultar_todos(sql, params=(), con=None):
    """SELECT que devolve uma lista de dicionários."""
    if con is None:
        with conexao() as c:
            return consultar_todos(sql, params, c)
    cur = con.cursor(dictionary=True)
    try:
        cur.execute(sql, params)
        return cur.fetchall()
    finally:
        cur.close()


def consultar_um(sql, params=(), con=None):
    """SELECT que devolve um dicionário, ou None se não houver linha."""
    linhas = consultar_todos(sql, params, con)
    return linhas[0] if linhas else None


def inserir(sql, params=(), con=None):
    """INSERT que devolve o id gerado."""
    if con is None:
        with transacao() as c:
            return inserir(sql, params, c)
    cur = con.cursor()
    try:
        cur.execute(sql, params)
        return cur.lastrowid
    finally:
        cur.close()


def executar(sql, params=(), con=None):
    """UPDATE/DELETE que devolve a quantidade de linhas afetadas."""
    if con is None:
        with transacao() as c:
            return executar(sql, params, c)
    cur = con.cursor()
    try:
        cur.execute(sql, params)
        return cur.rowcount
    finally:
        cur.close()
