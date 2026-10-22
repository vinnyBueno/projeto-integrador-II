const { executar } = require('../config/database');
const oracledb = require('oracledb');

class PacienteRepository {

    // CREATE: cadastrar paciente
    static async criar(dados) {
        const resultado = await executar(
            `INSERT INTO PACIENTE (
                NOME,
                CPF,
                RG,
                ENDERECO,
                TELEFONE,
                EMAIL,
                GENERO,
                DATA_NASCIMENTO
            ) VALUES (
                :nome,
                :cpf,
                :rg,
                :endereco,
                :telefone,
                :email,
                :genero,
                TO_DATE(:dataNascimento, 'YYYY-MM-DD')
            )
            RETURNING ID_PACIENTE INTO :id`,
            {
                nome: dados.nome,
                cpf: dados.cpf,
                rg: dados.rg,
                endereco: dados.endereco,
                telefone: dados.telefone,
                email: dados.email,
                genero: dados.genero,
                dataNascimento: dados.dataNascimento,
                id: {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.NUMBER
                }
            },
            { autoCommit: true }
        );

        return resultado.outBinds.id[0];
    }

    // READ: listar todos
    static async listarTodos() {
        const resultado = await executar(`
            SELECT
                ID_PACIENTE AS "id",
                NOME AS "nome",
                CPF AS "cpf",
                RG AS "rg",
                ENDERECO AS "endereco",
                TELEFONE AS "telefone",
                EMAIL AS "email",
                GENERO AS "genero",
                TO_CHAR(DATA_NASCIMENTO, 'YYYY-MM-DD')
                    AS "dataNascimento"
            FROM PACIENTE
            ORDER BY NOME
        `);

        return resultado.rows;
    }

    // READ: buscar por ID
    static async buscarPorId(id) {
        const resultado = await executar(
            `SELECT
                ID_PACIENTE AS "id",
                NOME AS "nome",
                CPF AS "cpf",
                RG AS "rg",
                ENDERECO AS "endereco",
                TELEFONE AS "telefone",
                EMAIL AS "email",
                GENERO AS "genero",
                TO_CHAR(DATA_NASCIMENTO, 'YYYY-MM-DD')
                    AS "dataNascimento"
            FROM PACIENTE
            WHERE ID_PACIENTE = :id`,
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
                ENDERECO = :endereco,
                TELEFONE = :telefone,
                EMAIL = :email,
                GENERO = :genero,
                DATA_NASCIMENTO = TO_DATE(:dataNascimento, 'YYYY-MM-DD')
            WHERE ID_PACIENTE = :id`,
            {
                id,
                nome: dados.nome,
                cpf: dados.cpf,
                rg: dados.rg,
                endereco: dados.endereco,
                telefone: dados.telefone,
                email: dados.email,
                genero: dados.genero,
                dataNascimento: dados.dataNascimento
            },
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
        let sql = `
            SELECT ID_PACIENTE
            FROM PACIENTE
            WHERE CPF = :cpf
        `;

        const binds = { cpf };

        // Ignora o próprio paciente durante a atualização
        if (ignorarId !== null) {
            sql += ' AND ID_PACIENTE <> :id';
            binds.id = ignorarId;
        }

        const resultado = await executar(sql, binds);

        return resultado.rows.length > 0;
    }
}

module.exports = PacienteRepository;