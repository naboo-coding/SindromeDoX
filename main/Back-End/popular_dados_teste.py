"""
Preencho o banco com usuários, pacientes e triagens de teste (dados fictícios).
Uso a própria API para criar os dados, assim valem as mesmas regras do sistema:
consentimento, cálculo da pontuação e auditoria.

Uso (dentro de Back-End/, com o .env preenchido), só em banco de desenvolvimento:
    python popular_dados_teste.py

Todas as contas criadas aqui usam a senha 123456.
"""

from werkzeug.security import generate_password_hash

from app import app
from database import consultar_um, inserir

SENHA = "123456"


# Crio um usuário já com e-mail confirmado, direto no banco.
def criar_usuario(nome, email, perfil, cpf=None, telefone=None):
    return inserir(
        "INSERT INTO usuario (nome, email, senha_hash, perfil, cpf, telefone, email_confirmado_em, aceite_termos_em) "
        "VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())",
        (nome, email, generate_password_hash(SENHA), perfil, cpf, telefone),
    )


# Abro uma sessão na API como esse usuário.
def entrar(email):
    cliente = app.test_client()
    resposta = cliente.post("/api/login", json={"email": email, "senha": SENHA})
    if resposta.status_code != 200:
        raise RuntimeError(f"Não consegui entrar como {email}: {resposta.get_json()}")
    return cliente


# Cadastro um paciente pela API e devolvo o id.
def criar_paciente(cliente, dados):
    resposta = cliente.post("/api/pacientes", json={**dados, "consentimento": True})
    if resposta.status_code != 201:
        raise RuntimeError(f"Erro ao criar {dados['nome']}: {resposta.get_json()}")
    return resposta.get_json()["id_paciente"]


# Faço uma triagem pela API e mostro a pontuação calculada.
def criar_triagem(cliente, id_paciente, sinais, observacao=""):
    respostas = {
        "dnaTest": "no",
        "dnaInterest": "yes",
        "autism": "no",
        "siblings": "yes",
        "familyDisability": "unknown",
        "familyMenopause": "no",
        "familyAtaxia": "no",
        "signs": sinais,
        "otherText": "",
        "observations": observacao,
    }
    resposta = cliente.post("/api/triagens", json={"id_paciente": id_paciente, "respostas": respostas})
    triagem = resposta.get_json()
    print(f"  triagem: pontuação {triagem['pontuacao']} (limiar {triagem['limiar']}) -> {triagem['status']}")
    return triagem["id_triagem"]


# Registro um evento de acompanhamento pela API.
def registrar_evento(cliente, id_paciente, tipo, data, resultado_dna=None):
    dados = {"tipo": tipo, "data_evento": data}
    if resultado_dna:
        dados["resultado_dna"] = resultado_dna
    cliente.post(f"/api/pacientes/{id_paciente}/acompanhamento", json=dados)


# Não rodo duas vezes no mesmo banco.
if consultar_um("SELECT id_usuario FROM usuario WHERE email = 'marina@teste.local'"):
    print("Os dados de teste já existem neste banco.")
else:
    print("Criando usuários...")
    criar_usuario("Coordenação do Instituto", "coordenacao@teste.local", "admin")
    criar_usuario("Marina Souza", "marina@teste.local", "profissional")
    criar_usuario("Ana Pereira", "ana@teste.local", "responsavel", "11122233344", "41998761234")
    criar_usuario("Carlos Lima", "carlos@teste.local", "responsavel", "22233344455", "41991234567")
    criar_usuario("Fernanda Costa", "fernanda@teste.local", "responsavel", "33344455566", "43987654321")

    admin = entrar("coordenacao@teste.local")
    marina = entrar("marina@teste.local")
    ana = entrar("ana@teste.local")
    carlos = entrar("carlos@teste.local")
    fernanda = entrar("fernanda@teste.local")

    print("Lucas Pereira (mãe: Ana)")
    lucas = criar_paciente(ana, {
        "nome": "Lucas Pereira", "sexo_biologico": "M", "data_nascimento": "2014-03-12",
        "nome_mae": "Ana Pereira", "cidade": "Curitiba", "estado": "PR",
        "responsavel": {"parentesco": "Mãe"},
    })
    # exemplo do artigo: 0,32 + 0,18 + 0,26 + 0,12 + 0,01 = 0,89
    t_lucas = criar_triagem(ana, lucas, ["intellectualDisability", "learningDifficulty", "macroorchidism",
                                         "hyperactivity", "aggressiveness"])
    registrar_evento(marina, lucas, "encaminhado_exame", "2026-11-10")

    print("Beatriz Pereira (mãe: Ana)")
    beatriz = criar_paciente(ana, {
        "nome": "Beatriz Pereira", "sexo_biologico": "F", "data_nascimento": "2012-07-28",
        "nome_mae": "Ana Pereira", "cidade": "Curitiba", "estado": "PR",
        "responsavel": {"parentesco": "Mãe"},
    })
    # exemplo do artigo: 0,20 + 0,04 + 0,01 = 0,25
    criar_triagem(ana, beatriz, ["intellectualDisability", "hyperactivity", "speechDelay"])

    print("Pedro Lima (pai: Carlos)")
    pedro = criar_paciente(carlos, {
        "nome": "Pedro Lima", "sexo_biologico": "M", "data_nascimento": "2016-01-04",
        "nome_mae": "Renata Lima", "nome_pai": "Carlos Lima", "cidade": "São José dos Pinhais", "estado": "PR",
        "responsavel": {"parentesco": "Pai"},
    })
    criar_triagem(carlos, pedro, ["attentionDeficit", "hyperactivity", "anxiety"],
                  "Professora relata dificuldade de concentração em sala.")

    print("Sofia Costa (mãe: Fernanda)")
    sofia = criar_paciente(fernanda, {
        "nome": "Sofia Costa", "sexo_biologico": "F", "data_nascimento": "2010-11-19",
        "nome_mae": "Fernanda Costa", "cidade": "Londrina", "estado": "PR",
        "responsavel": {"parentesco": "Mãe"},
    })
    t_sofia = criar_triagem(fernanda, sofia, ["learningDifficulty", "intellectualDisability",
                                              "attentionDeficit", "longFace", "handBiting"])
    registrar_evento(marina, sofia, "encaminhado_exame", "2026-09-02")
    registrar_evento(marina, sofia, "exame_realizado", "2026-09-20")
    registrar_evento(marina, sofia, "resultado_dna", "2026-10-15", "positivo")
    registrar_evento(admin, sofia, "auxilio_concedido", "2026-10-20")

    print("Gabriel Tavares (cadastrado pela Marina; mãe ainda sem conta)")
    gabriel = criar_paciente(marina, {
        "nome": "Gabriel Tavares", "sexo_biologico": "M", "data_nascimento": "2013-06-07",
        "nome_mae": "Juliana Tavares", "cidade": "Maringá", "estado": "PR",
        "responsavel": {"nome": "Juliana Tavares", "cpf": "44455566677", "email": "juliana@teste.local",
                        "telefone": "44991112222", "whatsapp": "44991112222", "parentesco": "Mãe"},
    })
    criar_triagem(marina, gabriel, ["longFace", "macroorchidism", "repetitiveMovements", "avoidsEyeContact"])
    marina.put(f"/api/pacientes/{gabriel}/observacoes",
               json={"observacoes": "Família relata histórico de deficiência intelectual em um tio materno."})

    print("Helena Castro (cadastrada pela Marina; ainda sem triagem)")
    criar_paciente(marina, {
        "nome": "Helena Castro", "sexo_biologico": "F", "data_nascimento": "2011-02-15",
        "nome_mae": "Patrícia Castro", "nome_pai": "Roberto Castro", "cidade": "Ponta Grossa", "estado": "PR",
        "responsavel": {"nome": "Roberto Castro", "cpf": "55566677788", "email": "roberto@teste.local",
                        "telefone": "42988776655", "parentesco": "Pai"},
    })

    print("\nPronto. Contas de teste (senha 123456):")
    print("  admin: coordenacao@teste.local | profissional: marina@teste.local")
    print("  responsáveis: ana@teste.local, carlos@teste.local, fernanda@teste.local")
