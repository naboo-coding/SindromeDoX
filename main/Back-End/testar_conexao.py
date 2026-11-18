import sys

from config import Config
from database import SQL_MODE, consultar_todos, consultar_um

TABELAS = {
    "usuario", "token_usuario", "paciente", "paciente_responsavel",
    "documento_paciente", "consentimento_lgpd", "checklist_versao",
    "checklist_sintoma", "triagem", "resultado_triagem",
    "acompanhamento_paciente", "auditoria",
}
VIEWS = {"vw_checklist_prontidao", "vw_situacao_paciente", "vw_retencao_paciente"}

falhas = 0


def verificar(descricao, ok, detalhe=""):
    global falhas
    print(f"[{'OK' if ok else 'FALHA'}] {descricao}" + (f" — {detalhe}" if detalhe else ""))
    if not ok:
        falhas += 1


try:
    versao = consultar_um("SELECT VERSION() AS v")["v"]
    verificar("Conexão com o MySQL", True, f"versão {versao}")
except Exception as erro:
    verificar("Conexão com o MySQL", False, str(erro))
    sys.exit(1)

modo = consultar_um("SELECT @@SESSION.sql_mode AS m")["m"]
verificar("sql_mode estrito na sessão", "STRICT_ALL_TABLES" in modo)

cod = consultar_um("SELECT @@character_set_connection AS c, @@collation_connection AS k")
verificar("Charset utf8mb4", cod["c"] == "utf8mb4", f'{cod["c"]} / {cod["k"]}')

linhas = consultar_todos(
    "SELECT table_name AS nome, table_type AS tipo FROM information_schema.tables "
    "WHERE table_schema = %s",
    (Config.DB_NAME,),
)
tabelas = {l["nome"] for l in linhas if l["tipo"] == "BASE TABLE"}
views = {l["nome"] for l in linhas if l["tipo"] == "VIEW"}
verificar("Tabelas esperadas existem", TABELAS <= tabelas, f"faltam: {sorted(TABELAS - tabelas)}" if TABELAS - tabelas else "12 de 12")
verificar("Views esperadas existem", VIEWS <= views, f"faltam: {sorted(VIEWS - views)}" if VIEWS - views else "3 de 3")
sobras = tabelas - TABELAS
verificar("Sem tabelas antigas sobrando", not sobras, f"sobrando: {sorted(sobras)}" if sobras else "")

ativas = consultar_um("SELECT COUNT(*) AS n FROM checklist_versao WHERE ativa = TRUE")["n"]
verificar("Exatamente 1 versão de checklist ativa", ativas == 1, f"{ativas} ativa(s)")

n_sint = consultar_um(
    "SELECT COUNT(*) AS n FROM checklist_sintoma s "
    "JOIN checklist_versao v ON v.id_checklist_versao = s.id_checklist_versao WHERE v.ativa = TRUE"
)["n"]
verificar("Checklist ativo com 12 sintomas", n_sint == 12, f"{n_sint} sintoma(s)")

pront = consultar_todos(
    "SELECT p.sexo, p.pronto FROM vw_checklist_prontidao p "
    "JOIN checklist_versao v ON v.id_checklist_versao = p.id_checklist_versao WHERE v.ativa = TRUE"
)
print("[INFO] Cálculo pronto por sexo:", {l["sexo"]: bool(l["pronto"]) for l in pront},
      "(False = pesos ainda não definidos pelo Instituto)")

print("\nPermissões do usuário do banco:")
for linha in consultar_todos("SHOW GRANTS"):
    print("  ", list(linha.values())[0])

print(f"\n{'Tudo certo.' if falhas == 0 else f'{falhas} verificação(ões) falharam.'}")
sys.exit(1 if falhas else 0)
