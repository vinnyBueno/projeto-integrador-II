const express = require('express');
const cors = require('cors');

const logger = require('./src/middlewares/logger');


const profissionalRoutes = require('./src/routes/profissionalRoutes');
const pacienteRoutes = require('./src/routes/pacienteRoutes');
const atendimentoRoutes = require('./src/routes/atendimentoRoutes');
const funcaoRoutes = require('./src/routes/funcaoRoutes');
const servicoRoutes = require('./src/routes/servicoRoutes');

const app = express();

app.use(express.json());
app.use(cors());
app.use(logger);

app.get('/', (req, res) => {
    return res.status(200).json({
        mensagem: 'API do Sistema Hospitalar funcionando!'
    });
});

// Define o endereço base das rotas de profissionais.
app.use('/api/profissionais', profissionalRoutes);

// Define o endereço base das rotas de pacientes.
app.use('/api/pacientes', pacienteRoutes);

// Define o endereço base das rotas de atendimentos.
app.use('/api/atendimentos', atendimentoRoutes);

// Define o endereço base das rotas de funções.
app.use('/api/funcoes', funcaoRoutes);

// Define o endereço base das rotas de serviços.
app.use('/api/servicos', servicoRoutes);


// Exporta a instância do Express para que outros arquivos
// possam utilizá-la
module.exports = app;
