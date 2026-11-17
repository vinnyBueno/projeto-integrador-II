# MedFlow — Frontend

Interface em HTML, CSS e JavaScript. Os dados de pacientes e atendimentos vêm do backend Node.js/Express (pasta `backend`), que grava no Oracle.

## Executar

1. Suba o backend: na pasta `backend`, `npm install` e depois `npm start` (porta 3000, configurada no `.env`).
2. Abra `index.html` no navegador, use o Live Server do VS Code ou execute `Iniciar MedFlow.bat` / `IniciarMedFlow.bat`.

Se o backend estiver em outra porta ou máquina, ajuste `BASE_URL` em `js/clienteApi.js`.

## Acessos de demonstração

Todos usam a senha `12345`:

- Recepção: `recepcionista@email.com`
- Enfermagem: `enfermeiro@email.com`
- Médico: `medico@email.com`

O login ainda é demonstrativo (`js/sessao.js`, sessão no `sessionStorage`). O nome e o e-mail do perfil logado são enviados ao backend ao registrar a triagem e ao abrir a consulta médica.

## Integração com o backend

`js/clienteApi.js` (`MedFlowRemoto`) faz todas as chamadas à API e converte as respostas para o formato que as telas usam:

| Tela | Rotas usadas (`/api/...`) |
| --- | --- |
| Recepção | `pacientes/cpf/:cpf`, `pacientes/cadastrar`, `pacientes/atualizar/:id`, `atendimentos/cadastrar`, `atendimentos/atualizar/:id`, `atendimentos/cancelar/:id`, `atendimentos/listar` |
| Pacientes / Triagem | `atendimentos/listar?status=...`, `atendimentos/iniciar-triagem/:id`, `atendimentos/triagem/:id`, `atendimentos/classificacao/:id` |
| Fila / Atendimento médico | `atendimentos/iniciar-consulta/:id`, `atendimentos/consulta/:id`, `atendimentos/medicacoes/:id`, `atendimentos/medicacoes/:id/:idMedicacao`, `atendimentos/finalizar/:id` |
| Histórico / Prontuário | `atendimentos/listar?status=FINALIZADO,CANCELADO`, `atendimentos/listar?paciente=:id` |

`js/api.js` fornece só as constantes compartilhadas: status do atendimento, Protocolo de Manchester e cálculo de idade.
