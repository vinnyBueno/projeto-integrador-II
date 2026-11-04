# MedFlow — Frontend

Interface em HTML, CSS e JavaScript, sem dependência de backend, Python, Node.js ou banco de dados no servidor.

## Executar

Abra `index.html` no navegador, use o Live Server do VS Code ou execute `Iniciar MedFlow.bat` / `IniciarMedFlow.bat`. O script `IniciarMedFlow.ps1` apenas abre o HTML.

## Acessos de demonstração

Todos usam a senha `12345`:

- Recepção: `recepcionista@email.com`
- Enfermagem: `enfermeiro@email.com`
- Médico: `medico@email.com`

O login apenas simula a navegação entre perfis. Cadastro de contas e recuperação de senha devem ser implementados pelo backend do grupo na integração.

Os pacientes e atendimentos da demonstração ficam no `localStorage` do navegador; a sessão demonstrativa fica no `sessionStorage`. Use apenas dados fictícios. Os dados não são compartilhados entre navegadores ou computadores. O botão Excluir dados limpa os registros da demonstração.

## Integração futura

`js/api.js` contém a simulação local das operações usadas pelas telas. O grupo pode substituir essa camada pelas chamadas à API do backend. `js/sessao.js` concentra o acesso demonstrativo, a ser substituído pela autenticação real.

O servidor Python, seu executor Node.js e a camada de chamadas remotas foram retirados. Um eventual arquivo local `medflow.sqlite3` antigo não é usado pelo frontend e permanece ignorado pelo Git.

## Organização dos arquivos

- `login/`: login e seu JavaScript.
- `recepcionista/`: recepção e seu JavaScript.
- `enfermeiro/`: pacientes e triagem, com seus scripts.
- `medico/`: fila, atendimento e prontuário, com seus scripts.
- `css/`: estilos comuns.
- `js/`: scripts comuns e script do histórico.
- `historico.html`: histórico usado pelos três perfis.

O `index.html` da raiz encaminha para `login/index.html`, preservando a entrada pelos atalhos existentes.
