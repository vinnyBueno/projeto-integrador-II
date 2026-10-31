const { executar } = require('../config/database');

class ProfissionalRepository {

    // Verifica se o e-mail já está cadastrado
    static async emailExiste(email, ignorarId = null) {
        let sql = `SELECT ID_PROFISSIONAL
            FROM PROFISSIONAL
            WHERE LOWER(EMAIL) = LOWER(:email)`;

        const binds = { email };

        if (ignorarId !== null) {
            sql += ' AND ID_PROFISSIONAL <> :id';
            binds.id = ignorarId;
        }

        const resultado = await executar(sql, binds);

        return resultado.rows.length > 0;
    }

    // Verifica se o CRM ou COREN já está cadastrado
    static async registroExiste(registro, ignorarId = null) {
        let sql = `SELECT ID_PROFISSIONAL
            FROM PROFISSIONAL
            WHERE REGISTRO_PROFISSIONAL = :registro`;

        const binds = { registro };

        if (ignorarId !== null) {
            sql += ' AND ID_PROFISSIONAL <> :id';
            binds.id = ignorarId;
        }

        const resultado = await executar(sql, binds);

        return resultado.rows.length > 0;
    }

    // CREATE
    static async criar(dados) {
        const resultado = await executar(
            `INSERT INTO PROFISSIONAL (
                NOME,
                EMAIL,
                SENHA,
                REGISTRO_PROFISSIONAL,
                TIPO_FUNCAO,
                ESPECIALIDADE
            ) VALUES (
                :nome,
                :email,
                :senha,
                :registro,
                :funcao,
                :especialidade
            )
            RETURNING ID_PROFISSIONAL INTO :id`,
            {
                nome: dados.nome,
                email: dados.email,
                senha: dados.senha,
                registro: dados.registroProfissional,
                funcao: dados.tipoFuncao,
                especialidade: dados.especialidade || null,
                id: {
                    dir: require('oracledb').BIND_OUT,
                    type: require('oracledb').NUMBER
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
                ID_PROFISSIONAL AS "id",
                NOME AS "nome",
                EMAIL AS "email",
                REGISTRO_PROFISSIONAL AS "registroProfissional",
                TIPO_FUNCAO AS "tipoFuncao",
                ESPECIALIDADE AS "especialidade"
            FROM PROFISSIONAL
            ORDER BY NOME
        `);

        return resultado.rows;
    }

    // READ: buscar por ID
    static async buscarPorId(id) {
        const resultado = await executar(
            `SELECT
                ID_PROFISSIONAL AS "id",
                NOME AS "nome",
                EMAIL AS "email",
                REGISTRO_PROFISSIONAL AS "registroProfissional",
                TIPO_FUNCAO AS "tipoFuncao",
                ESPECIALIDADE AS "especialidade"
            FROM PROFISSIONAL
            WHERE ID_PROFISSIONAL = :id`,
            { id }
        );

        return resultado.rows[0] || null;
    }

    // UPDATE
    static async atualizar(id, dados) {
        let sql = `
            UPDATE PROFISSIONAL
            SET NOME = :nome,
                EMAIL = :email,
                REGISTRO_PROFISSIONAL = :registro,
                TIPO_FUNCAO = :funcao,
                ESPECIALIDADE = :especialidade
        `;

        const binds = {
            id,
            nome: dados.nome,
            email: dados.email,
            registro: dados.registroProfissional,
            funcao: dados.tipoFuncao,
            especialidade: dados.especialidade || null
        };

        if (dados.senha) {
            sql += ', SENHA = :senha';
            binds.senha = dados.senha;
        }

        sql += ' WHERE ID_PROFISSIONAL = :id';

        const resultado = await executar(
            sql,
            binds,
            { autoCommit: true }
        );

        return resultado.rowsAffected > 0;
    }

    // DELETE
    static async excluir(id) {
        const resultado = await executar(
            `DELETE FROM PROFISSIONAL WHERE ID_PROFISSIONAL = :id`,
            { id },
            { autoCommit: true }
        );

        return resultado.rowsAffected > 0;
    }
}

module.exports = ProfissionalRepository;
