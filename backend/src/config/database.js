
const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool;

// Configura o pool de conexões
async function conectarBanco() {
    pool = await oracledb.createPool({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectString: process.env.DB_CONNECT_STRING,
        poolMin: 1,
        poolMax: 5,
        poolIncrement: 1
    });

    console.log('Conexão com Oracle configurada!');
}

// Executa comandos SQL normalmente
async function executar(sql, binds = [], options = {}) {
    if (!pool) {
        throw new Error('Pool de conexões Oracle não foi inicializado.');
    }

    const conexao = await pool.getConnection();

    try {
        return await conexao.execute(sql, binds, options);
    } finally {
        await conexao.close();
    }
}

// Executa vários comandos dentro de uma única transação
async function executarTransacao(callback) {
    if (!pool) {
        throw new Error('Pool de conexões Oracle não foi inicializado.');
    }

    const conexao = await pool.getConnection();

    try {
        const resultado = await callback(conexao);

        // Confirma todas as operações
        await conexao.commit();

        return resultado;

    } catch (error) {
        // Desfaz as operações se alguma falhar
        await conexao.rollback();

        throw error;

    } finally {
        await conexao.close();
    }
}

// Fecha o pool de conexões
async function fecharBanco() {
    if (pool) {
        await pool.close(10);
        pool = null;
    }
}

module.exports = {
    conectarBanco,
    executar,
    executarTransacao,
    fecharBanco
};
