
const express = require('express');
const cors = require('cors');

const logger = require('./src/middlewares/logger');
const profissionalRoutes = require('./src/routes/profissionalRoutes');
const atendimentoRoutes = require('./src/routes/atendimentoRoutes');

const app = express();

app.use(express.json());
app.use(cors());
app.use(logger);

app.get('/', (req, res) => {
    return res.status(200).json({
        mensagem: 'API do Sistema Hospitalar funcionando!'
    });
});

app.use('/api/profissionais', profissionalRoutes);
app.use('/api/atendimentos', atendimentoRoutes);

module.exports = app;
