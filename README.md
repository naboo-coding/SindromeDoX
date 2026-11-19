# Síndrome do X Frágil — Sistema de Triagem

## Sobre o projeto

Sistema web de apoio ao processo de triagem da Síndrome do X Frágil, desenvolvido como projeto acadêmico para o Instituto Buko Kaesemodel.

## Objetivo

Facilitar o cadastro e a organização dos dados dos pacientes, o preenchimento dos questionários de triagem e a consulta dos resultados e históricos das avaliações.

O sistema é uma ferramenta de apoio à triagem e não substitui o diagnóstico genético.

## Funcionalidades previstas

- Autenticação e recuperação de senha.
- Cadastro e consulta de pacientes.
- Questionário de triagem.
- Cálculo da pontuação conforme critérios validados pelo Instituto.
- Consulta aos resultados e ao histórico das avaliações.
- Emissão de relatórios.
- Gerenciamento de usuários conforme permissões.

## Tecnologias

- Frontend: React, JavaScript e CSS.
- Backend: Python e Flask.
- Banco de dados: MySQL.
- Controle de versão: Git e GitHub.
- Gerenciamento do projeto: Jira.

## Estrutura do projeto

- `main/Front-End/`: interface do sistema (React + Vite).
- `main/Back-End/`: API em Flask e lógica de negócio.
- `main/banco_dados/`: scripts SQL do banco.
- `docs/`: documentação e diagramas.

## Como executar

Precisa ter instalado: MySQL 8, Python 3.12 e Node.js (versão LTS).

### Preparar (uma vez em cada computador)

1. **Banco:** no MySQL Workbench, como root, rode o arquivo inteiro `main/banco_dados/sindromeX.sql` e depois o `main/banco_dados/criar_usuario_app.sql` (troque a senha dentro dele antes).
2. **Back:**
   ```
   cd main/Back-End
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   copy .env.example .env
   ```
   No `.env`, coloque a mesma senha do passo 1 em `DB_PASSWORD` e um texto aleatório longo em `SECRET_KEY`.
   Confira com `python testar_conexao.py` (tem que terminar com "Tudo certo.") e crie os dados de teste com `python popular_dados_teste.py`.
3. **Front:**
   ```
   cd main/Front-End
   npm install
   ```

### Rodar (toda vez)

Em um terminal, o back:
```
cd main/Back-End
.venv\Scripts\activate
python app.py
```

Em outro terminal, o front:
```
cd main/Front-End
npm run dev
```

Abra http://localhost:5173. Contas de teste (senha `123456`): `coordenacao@teste.local` (admin), `marina@teste.local` (profissional) e `ana@teste.local` (responsável).

Mais detalhes em `main/Back-End/README.md` e `main/Front-End/README.md`.

## Status

Em desenvolvimento.

## Integrantes

- Anna Beatriz Gamba Müller
- Guilherme dos Santos Marciano Barbosa
- João Victor Squizati Miyashita
- Leticia Figueiredo Dias
