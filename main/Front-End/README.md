# Front-End — Triagem X Frágil

Interface do sistema de triagem, feita com React, JavaScript e CSS (Vite).

## Como rodar

Requer [Node.js](https://nodejs.org) (versão LTS) e o back rodando (veja `main/Back-End/README.md`).

1. Em um terminal, rode o back: dentro de `main/Back-End`, `python app.py` (porta 5000).
2. Em outro terminal:
   ```bash
   cd main/Front-End
   npm install
   npm run dev
   ```
3. Abra o endereço mostrado no terminal (normalmente http://localhost:5173).

O Vite repassa tudo que começa com `/api` para o back (`vite.config.js`), então front e back funcionam como um site só.

## Contas

- O primeiro administrador é criado com `python criar_admin.py` no back.
- Qualquer pessoa pode se cadastrar pela tela "Criar conta": a conta nasce como **responsável** e precisa confirmar o e-mail. O link de confirmação aparece no terminal do back.
- O administrador muda o perfil das pessoas na tela "Usuários" (responsável, profissional ou administrador).

## Estrutura

- `src/pages/` uma tela por arquivo
- `src/services/api.js` uma função para cada rota do back (contrato em `main/Back-End/API.md`)
- `src/context/AuthContext.jsx` usuário logado
- `src/components.jsx` menu lateral, cabeçalho e etiqueta de status
- `src/data.js` perguntas da triagem, sinais extras e campos do cadastro de paciente
- `src/utils.js` formatação de datas, idade, pontuação e mensagens de validação em português

## Pontuação da triagem

O cálculo é feito no back, com os pesos e limiares guardados no banco (checklist baseado em Romero et al., *Fragile X Syndrome in Brazil*, medRxiv, 2025, Tabelas 4 e 5). Enquanto os pesos não forem preenchidos, a triagem é salva como "Cálculo pendente".
