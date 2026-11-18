from contextlib import contextmanager
from mysql.connector import pooling
from config import Config

# Modo estrito utilizado nas sessões do MySQL.
SQL_MODE = (
    "STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION,ONLY_FULL_GROUP_BY,"
    "NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO"
)

_pool = None

# Criação do pool das primeiras chamadas
def _get_pool():
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

# Conexão devolvida ao pool
@contextmanager
def conexao():
    con = _get_pool().get_connection()
    try:
        yield con
    finally:
        con.close()

# Confirma as operações ou então desfaz as alterações em caso de erro
@contextmanager
def transacao():
    with conexao() as con:
        try:
            yield con
            con.commit()
        except Exception:
            con.rollback()
            raise

# vai consultar todos os registros e daí retornar uma lista de dicionários.
def consultar_todos(sql, params=(), con=None):
    if con is None:
        with conexao() as c:
            return consultar_todos(sql, params, c)

    cur = con.cursor(dictionary=True)
    try:
        cur.execute(sql, params)
        return cur.fetchall()
    finally:
        cur.close()

# Consulta um registro, se não achar vai retorna None
def consultar_um(sql, params=(), con=None):
    linhas = consultar_todos(sql, params, con)
    return linhas[0] if linhas else None

# vai inserir um registro e retorna o identificador.
def inserir(sql, params=(), con=None):
    if con is None:
        with transacao() as c:
            return inserir(sql, params, c)

    cur = con.cursor()
    try:
        cur.execute(sql, params)
        return cur.lastrowid
    finally:
        cur.close()

# Executa alterações e retorna a quantidade de linhas afetadas.
def executar(sql, params=(), con=None):
    if con is None:
        with transacao() as c:
            return executar(sql, params, c)

    cur = con.cursor()
    try:
        cur.execute(sql, params)
        return cur.rowcount
    finally:
        cur.close()