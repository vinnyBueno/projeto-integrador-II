# MedFlow — Projeto Integrador II

## 📖 Descrição

Sistema de fluxo de atendimento hospitalar desenvolvido para o Projeto Integrador da faculdade. Acompanha o paciente da recepção até a alta, passando por triagem e consulta médica.

## 🔄 Fluxo de atendimento

`AGUARDANDO_TRIAGEM` → `EM_TRIAGEM` → `AGUARDANDO_ATENDIMENTO_MEDICO` → `EM_ATENDIMENTO_MEDICO` → `FINALIZADO` (ou `CANCELADO`)

| Perfil | O que faz |
| --- | --- |
| Recepção | Busca o paciente por CPF, cadastra ou atualiza os dados e abre o atendimento |
| Enfermagem | Registra a triagem (sinais vitais e queixas) e classifica o risco pelo Protocolo de Manchester |
| Médico | Vê a fila por prioridade, realiza a consulta, prescreve medicações e finaliza o atendimento |

O histórico e o prontuário permitem consultar atendimentos finalizados ou cancelados de cada paciente.

## 🚀 Tecnologias

- **Frontend:** HTML5, CSS3 e JavaScript
- **Backend:** Node.js e Express
- **Banco de dados:** Oracle (driver `oracledb`)
- **Ferramentas:** VS Code, SQL Developer

## 📁 Estrutura do Projeto

```
projeto-integrador-II/
│
├── backend/
│   ├── banco/              # tables.sql (esquema atual)
│   ├── src/
│   │   ├── config/         # conexão com o Oracle
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/         # validações e regras de negócio
│   │   ├── repositories/   # consultas SQL
│   │   ├── routes/
│   │   └── utils/
│   ├── app.js
│   └── server.js
│
├── frontend/
│   ├── css/
│   ├── js/
│   └── *.html              # telas do sistema
│
├── README.md
└── .gitignore
```

## ▶️ Como executar

### 1. Banco de dados

Execute o arquivo `backend/banco/tables.sql` no Oracle (por exemplo, pelo SQL Developer) para criar as tabelas.

### 2. Backend

1. Entre na pasta `backend` e instale as dependências:

   ```bash
   npm install
   ```

2. Crie um arquivo `.env` na pasta `backend` com:

   ```
   DB_USER=seu_usuario
   DB_PASSWORD=sua_senha
   DB_CONNECT_STRING=localhost:1521/XEPDB1
   PORT=3000
   ```

3. Inicie o servidor:

   ```bash
   npm start
   ```

   Deve aparecer "Conexão com Oracle estabelecida!".

### 3. Frontend

Abra `frontend/index.html` com o Live Server do VS Code ou execute `Iniciar MedFlow.bat`. Se o backend estiver em outra porta, ajuste `BASE_URL` em `frontend/js/clienteApi.js`.

### Acessos de demonstração

Senha de todos: `12345`

- Recepção: `recepcionista@email.com`
- Enfermagem: `enfermeiro@email.com`
- Médico: `medico@email.com`

O login é demonstrativo (controlado pelo frontend). Mais detalhes em [frontend/README.md](frontend/README.md).

## 📌 Trello

Acompanhe o planejamento e o andamento do projeto no Trello:

[🔗 Acessar o Trello do Projeto](https://trello.com/invite/b/6a7661fe599568bcdcff61ea/ATTI30686d90b0e3e293386b88f4088521da966B37B2/projeto-integrador-2)

## 👥 Integrantes

- Bruna Nascimento Savelli
- Rafaela Lorena da Luz Antunes
- Raquel Brito Jacomini
- Vinicius Da Silva Bueno