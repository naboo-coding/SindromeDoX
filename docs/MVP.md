# MVP — Sistema de Triagem da Síndrome do X Frágil

**Instituição:** Pontifícia Universidade Católica do Paraná (PUCPR)  
**Curso:** Ciência da Computação  
**Disciplina:** Experiência Criativa — Atividade de Extensão  
**Local e ano:** Curitiba, 2026

## Integrantes

- Anna Beatriz Gamba Müller
- Guilherme dos Santos Marciano Barbosa
- João Victor Squizati Miyashita
- Leticia Figueiredo Dias

## Introdução

Este projeto foi realizado durante a disciplina de Experiência Criativa como uma atividade de extensão, com o objetivo de ajudar o Instituto Buko Kaesemodel, que apoia indivíduos com Síndrome do X Frágil, tanto na identificação da mutação quanto no acompanhamento e tratamento. Este documento apresenta a principal dificuldade identificada pelo grupo, uma proposta de solução e um exemplo de como o sistema poderá funcionar quando implementado.

## 1. Minimundo

### 1.1 Descrição do problema e contexto

Durante a visita técnica ao Instituto Buko Kaesemodel e a conversa com a gestora Luz María Romero, identificamos problemas e oportunidades de melhoria no processo de triagem de pessoas com suspeita da Síndrome do X Frágil (SXF).

A Síndrome do X Frágil é uma condição genética associada à expansão das repetições CGG no gene `FMR1`, localizado no cromossomo X.

Além da conscientização da população sobre a condição, uma das dificuldades identificadas foi organizar a triagem das pessoas que podem precisar de apoio do Instituto para custear o teste genético. O processo também busca oferecer uma avaliação preliminar mais organizada a partir das informações fornecidas.

O Instituto já possui um formulário, mas identificamos oportunidades de melhoria, como ampliar a organização das perguntas e apresentar um retorno mais claro sobre a pontuação calculada e as orientações correspondentes.

### 1.2 Funcionamento esperado

A proposta é desenvolver uma aplicação web com formulário de triagem, autenticação e cadastro de pacientes. As respostas devem ser armazenadas e associadas ao paciente correspondente, permitindo organizar os dados e consultar avaliações anteriores.

Após o preenchimento do questionário, o sistema deverá calcular uma pontuação e apresentar o resultado com orientações definidas conforme os critérios validados pelo Instituto. A pontuação servirá como apoio ao processo de triagem e não deverá ser apresentada como diagnóstico genético confirmado ou como porcentagem clínica de probabilidade sem validação específica.

O sistema também deverá permitir consultar o histórico de triagens, visualizar e emitir relatórios e gerenciar usuários de acordo com suas permissões. A eventual elegibilidade para auxílio deverá seguir os critérios e a decisão do Instituto, não apenas uma interpretação automática do sistema.

## 2. Requisitos

### 2.1 Requisitos funcionais

Os requisitos funcionais previstos para o MVP são:

- **RF01 — Autenticação:** permitir que o usuário entre no sistema com suas credenciais.
- **RF02 — Recuperação de senha:** oferecer uma página para iniciar a recuperação de acesso.
- **RF03 — Questionário:** disponibilizar o formulário de triagem para preenchimento.
- **RF04 — Cálculo da pontuação:** calcular automaticamente a pontuação a partir das respostas, conforme os critérios definidos e validados pelo Instituto.
- **RF05 — Resultado da triagem:** apresentar a pontuação e as orientações correspondentes, deixando claro que o resultado não substitui um diagnóstico profissional.
- **RF06 — Histórico:** permitir consultar avaliações anteriores de cada paciente.
- **RF07 — Relatórios:** permitir visualizar relatórios associados aos dados e às avaliações disponíveis para o usuário.
- **RF08 — Exportação e impressão:** permitir imprimir ou baixar relatórios.
- **RF09 — Relatórios administrativos:** permitir que usuários autorizados consultem relatórios por paciente, conforme suas permissões.
- **RF10 — Gerenciamento de pacientes:** permitir cadastrar, consultar e acessar os registros dos pacientes.
- **RF11 — Gerenciamento de usuários:** permitir que o administrador cadastre e gerencie usuários, conforme o perfil de acesso.

### 2.2 Requisitos não funcionais

- **RNF01 — Integridade dos dados:** manter os dados associados corretamente aos respectivos pacientes e registros.
- **RNF02 — Controle de acesso:** aplicar o princípio do menor privilégio, permitindo que cada perfil acesse apenas os recursos necessários às suas funções.
- **RNF03 — Manutenibilidade:** organizar o código e utilizar comentários quando ajudarem a explicar trechos relevantes.
- **RNF04 — Privacidade e segurança:** proteger os dados pessoais e sensíveis dos pacientes.
- **RNF05 — Usabilidade:** oferecer uma interface fácil de compreender e utilizar, tanto para administradores quanto para profissionais.

## 3. Protótipo de telas

### 3.1 Identidade visual

A identidade visual será baseada nas cores utilizadas pelo Instituto Buko Kaesemodel. O azul será a cor principal de botões, títulos e elementos de destaque. O branco será predominante no fundo, criando uma interface limpa e organizada, enquanto tons claros de azul serão usados em áreas secundárias. Os textos utilizarão tons escuros para facilitar a leitura.

### 3.2 Telas previstas

O sistema será composto por oito telas principais:

1. **Login:** acesso ao sistema por meio de e-mail e senha.
2. **Esqueci a senha:** recuperação do acesso por meio do e-mail cadastrado.
3. **Lista de pacientes:** consulta, pesquisa e acesso aos cadastros existentes.
4. **Cadastro do paciente:** registro de dados pessoais e informações necessárias para o processo de triagem.
5. **Questionário de triagem:** preenchimento de perguntas sobre histórico familiar, sinais físicos, comportamento e desenvolvimento relacionados à Síndrome do X Frágil.
6. **Resultado da triagem:** apresentação da pontuação calculada e das orientações definidas conforme os critérios validados pelo Instituto.
7. **Histórico de relatórios:** consulta de avaliações anteriores, com opções de filtragem, impressão e download.
8. **Gerenciamento de usuários:** cadastro e gerenciamento de usuários pelo administrador.

### 3.3 Protótipo no Figma

[**Acessar o protótipo do Sistema de Triagem da Síndrome do X Frágil no Figma**](https://www.figma.com/proto/gJIJxZogGGmjNV6SrZ6Lmo/Triagem-X-Fr%C3%A1gil-%E2%80%93-Instituto-Buko-Kaesemodel?node-id=3-159&p=f&t=Gr2dMWyCbCcNA68l-1&scaling=min-zoom&content-scaling=fixed&page-id=1%3A20&starting-point-node-id=2%3A2)

## 4. Tecnologias utilizadas

### 4.1 Conhecimentos dos integrantes

O grupo é formado por integrantes com conhecimentos em diferentes linguagens e tecnologias, adquiridos ao longo da graduação, de estudos individuais e de experiências práticas.

- **Anna:** Python como principal linguagem de programação, além de conhecimentos introdutórios em C, Java, JavaScript, HTML, CSS, PHP, SQL e JSON. Também possui contato com React, Node.js, Rust, Lua e GitHub por meio de estudos próprios.
- **Guilherme:** experiência com MySQL e MySQL Workbench, adquirida na disciplina de Banco de Dados, além de conhecimento intermediário em Python. Também possui contato com Java, JavaScript, HTML, CSS, PHP, C, JSON e Processing, por meio da graduação e de experiências de estágio.
- **Leticia:** familiaridade com tecnologias de desenvolvimento front-end, especialmente HTML, CSS e JavaScript, além de conhecimentos em C e Python. Também teve contato com SQL e Cisco Packet Tracer e está aprendendo Java e Lua.
- **João:** possui conhecimentos em Python, HTML, CSS, PHP, SQL, C#, C, JavaScript, Java, Git, GitHub e Unity.

### 4.2 Tecnologias selecionadas

- **Front-end — React, JavaScript e CSS:** construção da interface, apresentação das informações e interação com os usuários.
- **Back-end — Python e Flask:** implementação da lógica do sistema, processamento das informações enviadas e comunicação entre a interface e o banco de dados.
- **Banco de dados — MySQL:** armazenamento, organização e consulta dos dados dos pacientes, respostas dos questionários e registros das avaliações.
- **Controle de versão — Git e GitHub:** armazenamento do código-fonte, acompanhamento de alterações e integração do trabalho do grupo.
- **Gerenciamento do projeto — Jira:** organização das atividades, acompanhamento das tarefas e comunicação sobre o andamento do projeto.

### 4.3 Justificativa das escolhas

As tecnologias foram escolhidas para equilibrar os conhecimentos já existentes entre os integrantes com a oportunidade de aprender novas ferramentas e frameworks. React e Flask permitirão ampliar os conhecimentos em desenvolvimento web, enquanto JavaScript, Python e MySQL oferecem uma base para implementar as principais funcionalidades.

O GitHub e o Jira contribuirão para a organização do projeto, o acompanhamento das alterações e a gestão das atividades durante o desenvolvimento.

### 4.4 Organização do desenvolvimento

O desenvolvimento será realizado de forma colaborativa, com a participação de todos os integrantes nas diferentes etapas do projeto. O grupo trabalhará conjuntamente na implementação das funcionalidades, na integração das tecnologias, na revisão do código e na identificação e correção de possíveis erros.

Essa abordagem busca promover o compartilhamento de conhecimentos, permitir que todos compreendam o funcionamento geral do sistema e incentivar o aprendizado coletivo.

## 5. Observações sobre a triagem

O sistema tem como finalidade apoiar a organização e a triagem inicial. A pontuação e as orientações exibidas devem seguir critérios definidos e validados pelo Instituto. A aplicação não substitui avaliação médica ou diagnóstico genético. Qualquer decisão sobre concessão de auxílio deve respeitar o processo e os critérios estabelecidos pelo Instituto.

---

**Status do projeto:** em desenvolvimento.
