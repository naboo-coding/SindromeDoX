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

## Estrutura
- `config.py`   variáveis do `.env`
- `database.py` pool de conexões e funções de consulta (sempre com parâmetros `%s`)
- `app.py`      criação da aplicação Flask
- `routes/`     um arquivo por grupo de rotas (hoje só `saude.py`)
