
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { conectarBanco, fecharBanco } = require('./src/config/database');

const profissionalRoutes = require('./src/routes/profissionalRoutes');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.status(200).json({
        mensagem: 'API do Sistema Hospitalar funcionando!'
    });
});

app.use('/api/profissionais', profissionalRoutes);

async function iniciarServidor() {
    try {
        await conectarBanco();

        app.listen(PORT, () => {
            console.log(`Servidor rodando em http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Erro ao iniciar o servidor:', error.message);
        process.exit(1);
    }
}

async function encerrarServidor() {
    try {
        await fecharBanco();
        process.exit(0);
    } catch (error) {
        console.error('Erro ao encerrar o banco:', error.message);
        process.exit(1);
    }
}

process.on('SIGINT', encerrarServidor);
process.on('SIGTERM', encerrarServidor);

iniciarServidor();
