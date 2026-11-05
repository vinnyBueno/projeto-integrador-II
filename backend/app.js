const express = require('express');
const cors = require('cors');

const logger = require('./src/middlewares/logger');

const { conectarBanco } = require('./src/config/database');

const profissionalRoutes = require('./src/routes/profissionalRoutes');
const pacienteRoutes = require('./src/routes/pacienteRoutes');
const atendimentoRoutes = require('./src/routes/atendimentoRoutes');
const funcaoRoutes = require('./src/routes/funcaoRoutes');
const servicoRoutes = require('./src/routes/servicoRoutes');
const authRoutes = require('./src/routes/authRoutes');

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

// Define o endereço base das rotas de autenticação.
app.use('/api/auth', authRoutes);

// Função assíncrona responsável por iniciar o sistema.
async function iniciarServidor() {
    try {
        // Primeiro, estabelece a conexão com o banco de dados Oracle.
        await conectarBanco();

        // Somente após as etapas anteriores inicia o servidor.
        app.listen(3000, () => {
            console.log('Servidor rodando na porta 3000!');
        });

    } catch (erro) {

        // Exibe o erro caso a conexão ou o bootstrap falhem.
        console.error('Erro ao iniciar o servidor:', erro);

        // Encerra a aplicação com código de erro.
        process.exit(1);
    }
}

// Chama a função para iniciar o servidor.
iniciarServidor();


// Exporta a instância do Express para que outros arquivos
// possam utilizá-la
module.exports = app;
