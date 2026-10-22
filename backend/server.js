require('dotenv').config();

const app = require('./app');
const { conectarBanco, fecharBanco } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
    try {
        await conectarBanco();

        app.listen(PORT, () => {
            console.log(`Servidor ativo em http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Falha ao iniciar o servidor:', error);
        process.exit(1);
    }
}

async function encerrarServidor() {
    try {
        await fecharBanco();
        process.exit(0);
    } catch (error) {
        console.error('Erro ao encerrar o banco:', error);
        process.exit(1);
    }
}

process.on('SIGINT', encerrarServidor);
process.on('SIGTERM', encerrarServidor);

iniciarServidor();
