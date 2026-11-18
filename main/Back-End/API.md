# Contrato da API

Todas as rotas começam com `/api`, recebem e devolvem JSON (menos upload e download de arquivo).

## Convenções

- **Sessão:** o login guarda o `id_usuario` na sessão do Flask (cookie assinado com a `SECRET_KEY`). O front chama `/api/...` pelo proxy do Vite, então o cookie vai junto sem configuração extra.
- **Erros:** `{"erro": "mensagem em português"}` com o status:
  - `400` dados inválidos;
  - `401` não logado ou login errado;
  - `403` sem permissão;
  - `404` não encontrado;
  - `409` conflito, como um e-mail já cadastrado.
- **Datas:** `AAAA-MM-DD`. Data e hora: `AAAA-MM-DD HH:MM:SS`.
- **CPF, CEP e telefones:** só dígitos. O front tira a máscara antes de enviar.
- **Perfis:** `responsavel`, `profissional`, `admin`. "Equipe" quer dizer profissional ou admin.
- **Exclusão:** nada clínico é apagado. Excluir significa `ativo = FALSE`.
- **Auditoria:** toda criação, edição, exclusão e consulta de ficha pela equipe é registrada em `auditoria`, assim como os logins que falham.
- **Termo LGPD:** versão atual `v1` (`TERMO_LGPD_VERSAO` no `config.py`).

## Usuário (formato devolvido)

```json
{"id_usuario": 1, "nome": "...", "email": "...", "cpf": "...", "telefone": "...",
 "whatsapp": "...", "telefone2": "...", "perfil": "responsavel", "ativo": true, "email_confirmado": true}
```

## Autenticação (`routes/autenticacao.py`)

| Rota | Quem | O que faz |
|---|---|---|
| `POST /api/cadastro` | público | `{nome, email, senha, cpf, telefone, aceite_termos}`. Sempre cria `responsavel`. Senha com no mínimo 6 caracteres, e `aceite_termos` precisa ser `true`. Se o e-mail já existe **sem senha** (contato cadastrado pela equipe), a conta é assumida: grava nome, senha, CPF e telefone. Se já existe **com senha**, devolve `409` "E-mail já cadastrado.". Gera um token de confirmação (24 h) e imprime no terminal `FRONT_URL/confirmar-email?token=...`. Devolve `201 {mensagem}` |
| `POST /api/confirmar-email` | público | `{token}`. Marca `email_confirmado_em` e o token como usado. Token inválido, usado ou vencido: `400` "Link inválido ou expirado." |
| `POST /api/login` | público | `{email, senha}`. Devolve `200` com o usuário. Erros: `401` "E-mail ou senha incorretos." (também para conta sem senha), `403` "Usuário desativado. Fale com um administrador." e `403` "Confirme seu e-mail antes de entrar." |
| `POST /api/logout` | logado | Limpa a sessão |
| `GET /api/sessao` | qualquer um | `200` com o usuário logado, ou `401` |
| `POST /api/esqueci-senha` | público | `{email}`. Sempre devolve a mesma mensagem, para não revelar quem tem conta. Se a conta existe e está ativa, gera um token (1 h) e imprime `FRONT_URL/nova-senha?token=...` |
| `POST /api/nova-senha` | público | `{token, senha}`. Troca a senha, confirma o e-mail (o link prova que a pessoa é dona dele) e marca o token como usado |

## Usuários (`routes/usuarios.py`), só admin

| Rota | O que faz |
|---|---|
| `GET /api/usuarios` | Lista todos |
| `POST /api/usuarios` | `{nome, email, perfil, senha}`. A equipe criada pelo admin já sai com o e-mail confirmado. `perfil = responsavel` exige `cpf` e `telefone` |
| `PUT /api/usuarios/<id>` | `{nome, email, perfil, senha?}`. Senha vazia mantém a atual. A troca de perfil vai para a auditoria (`perfil.alterar`). O admin não pode mudar o próprio perfil |
| `PATCH /api/usuarios/<id>/ativo` | Ativa ou desativa. O admin não pode desativar a si mesmo |

## Checklist (`routes/checklist.py`), logado

`GET /api/checklist`:
```json
{"id_checklist_versao": 1, "fonte": "...", "limiar": {"M": 0.56, "F": 0.55},
 "pronto": {"M": false, "F": false},
 "sintomas": [{"codigo": "speechDelay", "rotulo": "...", "grupo": "comportamento", "sexo_restrito": null}]}
```
Os pesos não saem da API: o cálculo é feito no back.

## Pacientes (`routes/pacientes.py`)

**Quem vê um paciente:**
- a equipe vê todos os pacientes ativos;
- o responsável vê só os pacientes com um **vínculo ativo** com ele **e** com o **consentimento dele vigente** (não revogado, versão atual do termo).

Formato devolvido:
```json
{"id_paciente": 1, "nome": "...", "sexo_biologico": "M", "data_nascimento": "2012-03-12",
 "nome_mae": "...", "nome_pai": "...", "cep": null, "cidade": "...", "estado": "...", "pais": "Brasil",
 "observacoes": "...", "criado_em": "...", "dna_ja_realizado": false, "ultima_etapa": null,
 "responsavel": {"id_usuario": 2, "nome": "...", "cpf": "...", "email": "...", "telefone": "...",
                 "whatsapp": "...", "telefone2": "...", "parentesco": "Mãe"},
 "ultima_triagem": {"id_triagem": 3, "hora_triagem": "...", "pontuacao": null, "limiar": 0.56, "status": "pendente"}}
```

| Rota | Quem | O que faz |
|---|---|---|
| `GET /api/pacientes` | logado | Lista os pacientes visíveis |
| `GET /api/pacientes/<id>` | quem vê | Devolve `404` se não existe ou está inativo, e `403` sem acesso. A consulta pela equipe vai para a auditoria (`paciente.consultar`) |
| `POST /api/pacientes` | logado | Dados do paciente + `responsavel: {nome, cpf, email, telefone, whatsapp, telefone2, parentesco}` + `consentimento: true` (obrigatório). **Responsável logado:** o vínculo é com ele mesmo; do bloco `responsavel` só vale o `parentesco`. **Equipe:** procura o responsável pelo e-mail; se não existe, cria um contato (perfil `responsavel`, sem senha). Cria o vínculo principal e o consentimento (titular é o responsável; quem registrou é quem está logado). Devolve `201 {id_paciente}` |
| `PUT /api/pacientes/<id>` | admin | Mesmo corpo do POST, sem o `consentimento`. Se o e-mail do responsável mudar, encerra o vínculo principal antigo e cria o novo |
| `DELETE /api/pacientes/<id>` | admin | Desativa o paciente e as triagens dele |
| `PUT /api/pacientes/<id>/observacoes` | quem vê | `{observacoes}` |
| `GET /api/pacientes/<id>/responsaveis` | quem vê | Lista os vínculos ativos |
| `POST /api/pacientes/<id>/responsaveis` | admin | `{email, parentesco, principal}`. O usuário precisa existir |
| `DELETE /api/pacientes/<id>/responsaveis/<id_usuario>` | admin | Encerra o vínculo. Se o paciente é menor de 18 anos, o último vínculo ativo não pode ser encerrado (`400`) |
| `PATCH /api/pacientes/<id>/responsaveis/<id_usuario>/principal` | admin | Torna esse vínculo o principal |
| `POST /api/pacientes/<id>/consentimento` | responsável vinculado | Registra o próprio consentimento (versão atual) |
| `DELETE /api/pacientes/<id>/consentimento` | responsável vinculado | Revoga o próprio consentimento |
| `GET /api/retencao` | admin | Pacientes com a data a partir da qual podem ser revisados para eliminação (`vw_retencao_paciente`) |

## Documentos (`routes/documentos.py`), quem vê o paciente

| Rota | O que faz |
|---|---|
| `GET /api/pacientes/<id>/documentos` | `[{id_documento, nome_arquivo, tipo_mime, tamanho_bytes, enviado_em, enviado_por}]` |
| `POST /api/pacientes/<id>/documentos` | Upload `multipart/form-data` no campo `arquivo`. O tipo é validado pelo **conteúdo** (PDF, DOC, DOCX, JPG ou PNG), com até 10 MB. O arquivo vai para `UPLOAD_DIR` com um nome aleatório |
| `GET /api/documentos/<id>` | Baixa o arquivo com o nome original |
| `DELETE /api/documentos/<id>` | Desativa o documento (o arquivo continua no disco) |

## Triagens (`routes/triagens.py`)

Formato devolvido:
```json
{"id_triagem": 3, "id_paciente": 1, "paciente": {"nome": "...", "sexo_biologico": "M", "data_nascimento": "..."},
 "hora_triagem": "...", "aplicada_por": "Nome de quem aplicou", "respostas": {...},
 "pontuacao": null, "limiar": 0.56, "status": "pendente", "editado_em": null}
```
`respostas` é o objeto do questionário do front, com as perguntas da família, `signs` (lista de códigos marcados), `otherText` e `observations`.

| Rota | Quem | O que faz |
|---|---|---|
| `GET /api/triagens` | logado | Triagens ativas dos pacientes visíveis, da mais recente para a mais antiga |
| `GET /api/pacientes/<id>/triagens` | quem vê | Triagens do paciente |
| `GET /api/triagens/<id>` | quem vê o paciente | Uma triagem |
| `POST /api/triagens` | quem vê o paciente | `{id_paciente, respostas}`. Calcula a pontuação com o checklist ativo. Se o checklist estiver pronto para o sexo do paciente, soma os pesos dos sintomas marcados que valem para esse sexo e arredonda para 2 casas; se não estiver, a pontuação fica `null` (pendente). Grava `triagem` e `resultado_triagem`. Devolve `201` com a triagem |
| `PUT /api/triagens/<id>` | admin | `{respostas}`. Recalcula com o checklist ativo. Auditoria com o antes e o depois |
| `DELETE /api/triagens/<id>` | admin | Desativa |

## Acompanhamento (`routes/acompanhamento.py`)

| Rota | Quem | O que faz |
|---|---|---|
| `GET /api/pacientes/<id>/acompanhamento` | quem vê | Eventos ativos, do mais recente para o mais antigo |
| `POST /api/pacientes/<id>/acompanhamento` | equipe | `{tipo, data_evento, resultado_dna?, id_triagem?, observacao?}`. `encaminhado_exame`, `exame_realizado` e `resultado_dna`: equipe. `auxilio_concedido` e `auxilio_negado`: só admin. `resultado_dna` é obrigatório só quando `tipo = resultado_dna` |
| `DELETE /api/acompanhamento/<id>` | equipe | Desativa. Evento de auxílio: só admin |

## Saúde

`GET /api/saude`: já existia. Diz se a API e o banco estão no ar.
