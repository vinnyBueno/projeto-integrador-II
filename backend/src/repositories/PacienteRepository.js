const { executar } = require('../config/database');
const oracledb = require('oracledb');

// Colunas devolvidas ao frontend, com os nomes que ele já usa.
const COLUNAS = `
    ID_PACIENTE AS "id",
    NOME AS "nome",
    CPF AS "cpf",
    RG AS "rg",
    GENERO AS "genero",
    TO_CHAR(DATA_NASCIMENTO, 'YYYY-MM-DD') AS "dataNascimento",
    TELEFONE AS "telefone",
    TELEFONE_EMERGENCIA AS "telefoneEmergencia",
    EMAIL AS "email",
    CEP AS "cep",
    LOGRADOURO AS "logradouro",
    NUMERO AS "numeroEndereco",
    BAIRRO AS "bairro",
    CIDADE AS "cidade"
`;

// Converte os dados já validados nos binds usados no INSERT e no UPDATE.
function binds(dados) {
    return {
        nome: dados.nome,
        cpf: dados.cpf,
        rg: dados.rg,
        genero: dados.genero,
        dataNascimento: dados.dataNascimento,
        telefone: dados.telefone,
        telefoneEmergencia: dados.telefoneEmergencia,
        email: dados.email,
        cep: dados.cep,
        logradouro: dados.logradouro,
        numero: dados.numeroEndereco,
        bairro: dados.bairro,
        cidade: dados.cidade
    };
}

class PacienteRepository {

    // CREATE: cadastrar paciente
    static async criar(dados) {
        const resultado = await executar(
            `INSERT INTO PACIENTE (
                NOME, CPF, RG, GENERO, DATA_NASCIMENTO,
                TELEFONE, TELEFONE_EMERGENCIA, EMAIL,
                CEP, LOGRADOURO, NUMERO, BAIRRO, CIDADE
            ) VALUES (
                :nome, :cpf, :rg, :genero,
                TO_DATE(:dataNascimento, 'YYYY-MM-DD'),
                :telefone, :telefoneEmergencia, :email,
                :cep, :logradouro, :numero, :bairro, :cidade
            )
            RETURNING ID_PACIENTE INTO :id`,
            {
                ...binds(dados),
                id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            },
            { autoCommit: true }
        );

        return resultado.outBinds.id[0];
    }

    // READ: listar todos
    static async listarTodos() {
        const resultado = await executar(
            `SELECT ${COLUNAS} FROM PACIENTE ORDER BY NOME`
        );

        return resultado.rows;
    }

    // READ: buscar por ID
    static async buscarPorId(id) {
        const resultado = await executar(
            `SELECT ${COLUNAS} FROM PACIENTE WHERE ID_PACIENTE = :id`,
            { id }
        );

        return resultado.rows[0] || null;
    }

    // UPDATE: atualizar paciente
    static async atualizar(id, dados) {
        const resultado = await executar(
            `UPDATE PACIENTE
            SET NOME = :nome,
                CPF = :cpf,
                RG = :rg,
                GENERO = :genero,
                DATA_NASCIMENTO = TO_DATE(:dataNascimento, 'YYYY-MM-DD'),
                TELEFONE = :telefone,
                TELEFONE_EMERGENCIA = :telefoneEmergencia,
                EMAIL = :email,
                CEP = :cep,
                LOGRADOURO = :logradouro,
                NUMERO = :numero,
                BAIRRO = :bairro,
                CIDADE = :cidade
            WHERE ID_PACIENTE = :id`,
            { ...binds(dados), id },
            { autoCommit: true }
        );

        return resultado.rowsAffected > 0;
    }

    // DELETE: excluir paciente
    static async excluir(id) {
        const resultado = await executar(
            `DELETE FROM PACIENTE WHERE ID_PACIENTE = :id`,
            { id },
            { autoCommit: true }
        );

        return resultado.rowsAffected > 0;
    }

    // Verifica se o CPF já está cadastrado em outro paciente
    static async cpfExiste(cpf, ignorarId = null) {
        let sql = `SELECT ID_PACIENTE FROM PACIENTE WHERE CPF = :cpf`;
        const parametros = { cpf };

        // Ignora o próprio paciente durante a atualização
        if (ignorarId !== null) {
            sql += ' AND ID_PACIENTE <> :id';
            parametros.id = ignorarId;
        }

        const resultado = await executar(sql, parametros);

        return resultado.rows.length > 0;
    }
}

module.exports = PacienteRepository;