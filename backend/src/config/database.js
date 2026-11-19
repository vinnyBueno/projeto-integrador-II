const oracledb = require('oracledb');

// Fuso da sessão do Oracle: horário de Brasília
process.env.ORA_SDTZ = process.env.ORA_SDTZ || 'America/Sao_Paulo';

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

    // O pool não testa a conexão ao ser criado: abre uma agora para
    // o servidor falhar na subida se o banco estiver inacessível.
    try {
        const conexao = await pool.getConnection();
        await conexao.close();
    } catch (error) {
        await pool.close(0);
        pool = null;
        throw new Error(
            `Não foi possível conectar ao Oracle em "${process.env.DB_CONNECT_STRING}". ` +
            `Confira se o banco está ativo e os dados do .env. (${error.message})`
        );
    }

    console.log('Conexão com Oracle estabelecida!');
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