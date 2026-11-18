# Back-End (Flask)

## Preparação (uma vez)
1. Crie o banco rodando `sindromeX.sql` no MySQL 8.0.16+.
2. Crie o usuário do app rodando `criar_usuario_app.sql` (troque a senha dentro dele).
3. Neste diretório:
   ```
   python -m venv .venv
   .venv\Scripts\activate        # Windows  (Linux/Mac: source .venv/bin/activate)
   pip install -r requirements.txt
   copy .env.example .env        # Linux/Mac: cp .env.example .env
   ```
   Edite o `.env` com a senha do usuário do app e uma `SECRET_KEY` aleatória.

## Criar o primeiro administrador (uma vez)
```
python criar_admin.py
```
O cadastro público sempre cria `responsavel`; só um admin promove outras contas.

## Dados de teste (opcional, só em desenvolvimento)
```
python popular_dados_teste.py
```
Cria pacientes, triagens e acompanhamentos fictícios pela própria API. Contas criadas (senha `123456`):
- admin: `coordenacao@teste.local`
- profissional: `marina@teste.local`
- responsáveis: `ana@teste.local`, `carlos@teste.local`, `fernanda@teste.local`

## Pesos do checklist
Os pesos e limiares vêm de Romero et al. (medRxiv, 2025), Tabelas 4 e 5, e já estão no `sindromeX.sql`.
Quem criou o banco antes, com os pesos vazios, roda só `banco_dados/patch_pesos_checklist.sql` (como root).

## Testar a conexão
```
python testar_conexao.py
```
Todas as linhas devem sair `[OK]`.

## Rodar a API
```
python app.py
```
Abra http://127.0.0.1:5000/api/saude — deve responder `{"status":"ok","banco":"conectado",...}`.

Os links de confirmação de e-mail e de nova senha não são enviados por e-mail: aparecem no terminal onde a API está rodando.

## Estrutura
- `config.py`      variáveis do `.env`
- `database.py`    pool de conexões e funções de consulta (sempre com parâmetros `%s`)
- `seguranca.py`   login, perfis e regra de acesso aos pacientes
- `auditoria.py`   registro de quem fez o quê
- `app.py`         criação da aplicação Flask
- `criar_admin.py` cria o primeiro administrador
- `routes/`        um arquivo por grupo de rotas: autenticação, usuários, checklist, pacientes, documentos, triagens, acompanhamento e saúde
- `API.md`         contrato de todas as rotas (o que recebem, o que devolvem e quem pode usar)
- `uploads/`       documentos enviados (fora do git)
