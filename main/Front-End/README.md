# Front-End — Triagem X Frágil

Interface do sistema de triagem, feita com React, JavaScript e CSS (Vite).

## Como rodar

Requer [Node.js](https://nodejs.org) (versão LTS).

```bash
cd main/Front-End
npm install
npm run dev
```

Depois, abra o endereço mostrado no terminal (normalmente http://localhost:5173).

## API simulada (provisória)

Enquanto o backend em Flask não está pronto, os dados ficam no `localStorage` do navegador, por meio de uma API simulada em `src/services/api.js`. As telas só conversam com esse arquivo, então, quando o backend existir, basta trocar as funções dele por chamadas HTTP.

Os dados de exemplo ficam em `src/data/seed.js` e devem virar o script de seed do banco no backend.

Para apagar os dados de teste, limpe a chave `xfragil-db-v2` do `localStorage` (F12 → Application → Local Storage).

## Contas de teste

Senha de todas: `123456`.

| E-mail | Perfil |
|---|---|
| marina@institutobuko.org | Profissional: cadastra pacientes e triagens e vê só os próprios pacientes |
| carlos@institutobuko.org | Administrador: vê tudo, edita, exclui e gerencia usuários |
| luz@institutobuko.org | Administrador |
| paula@institutobuko.org | Profissional desativada (o login deve ser bloqueado) |

## Pontuação da triagem

Os sintomas, os pesos e os limiares estão em `src/config/checklist.json`, com base em Romero et al., *Fragile X Syndrome in Brazil* (medRxiv, 2025), Tabelas 4 e 5.

- Os pesos ainda estão `null`. Enquanto algum peso do sexo do paciente estiver vazio, o cálculo fica bloqueado e a triagem é salva como "Cálculo pendente".
- Regra do artigo: suspeita quando `pontuação >= limiar` (0,56 para M e 0,55 para F).
- Decisão da equipe: o cálculo e os pesos vão para o backend. O front deve apenas enviar os sintomas marcados e exibir a pontuação devolvida pelo servidor.
