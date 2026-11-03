
const { executar } = require('../config/database');
const oracledb = require('oracledb');

class ProfissionalRepository {

    // Verifica se o e-mail já está cadastrado
    static async emailExiste(email, ignorarId = null) {
        let sql = `
            SELECT ID_PROFISSIONAL
            FROM PROFISSIONAL
            WHERE LOWER(EMAIL) = LOWER(:email)
        `;

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
        let sql = `
            SELECT ID_PROFISSIONAL
            FROM PROFISSIONAL
            WHERE REGISTRO_PROFISSIONAL = :registro
        `;

        const binds = { registro };

        if (ignorarId !== null) {
            sql += ' AND ID_PROFISSIONAL <> :id';
            binds.id = ignorarId;
        }

        const resultado = await executar(sql, binds);

        return resultado.rows.length > 0;
    }

    // Verifica se a função existe e busca seus dados
    static async buscarFuncaoPorId(idFuncao) {
        const resultado = await executar(
            `SELECT
                ID_FUNCAO AS "idFuncao",
                NOME_FUNCAO AS "nomeFuncao"
            FROM FUNCAO
            WHERE ID_FUNCAO = :idFuncao`,
            { idFuncao }
        );

        return resultado.rows[0] || null;
    }

    // CREATE: cadastrar profissional
    static async criar(dados) {
        const resultado = await executar(
            `INSERT INTO PROFISSIONAL (
                NOME,
                EMAIL,
                SENHA,
                REGISTRO_PROFISSIONAL,
                ID_FUNCAO,
                ESPECIALIDADE
            ) VALUES (
                :nome,
                :email,
                :senha,
                :registro,
                :idFuncao,
                :especialidade
            )
            RETURNING ID_PROFISSIONAL INTO :id`,
            {
                nome: dados.nome,
                email: dados.email,
                senha: dados.senha,
                registro: dados.registroProfissional,
                idFuncao: dados.idFuncao,
                especialidade: dados.especialidade,
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
                P.ID_PROFISSIONAL AS "id",
                P.NOME AS "nome",
                P.EMAIL AS "email",
                P.REGISTRO_PROFISSIONAL AS "registroProfissional",
                P.ID_FUNCAO AS "idFuncao",
                F.NOME_FUNCAO AS "nomeFuncao",
                P.ESPECIALIDADE AS "especialidade"
            FROM PROFISSIONAL P
            INNER JOIN FUNCAO F
                ON P.ID_FUNCAO = F.ID_FUNCAO
            ORDER BY P.NOME
        `);

        return resultado.rows;
    }

    // READ: buscar por ID
    static async buscarPorId(id) {
        const resultado = await executar(
            `SELECT
                P.ID_PROFISSIONAL AS "id",
                P.NOME AS "nome",
                P.EMAIL AS "email",
                P.REGISTRO_PROFISSIONAL AS "registroProfissional",
                P.ID_FUNCAO AS "idFuncao",
                F.NOME_FUNCAO AS "nomeFuncao",
                P.ESPECIALIDADE AS "especialidade"
            FROM PROFISSIONAL P
            INNER JOIN FUNCAO F
                ON P.ID_FUNCAO = F.ID_FUNCAO
            WHERE P.ID_PROFISSIONAL = :id`,
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
                ID_FUNCAO = :idFuncao,
                ESPECIALIDADE = :especialidade
        `;

        const binds = {
            id,
            nome: dados.nome,
            email: dados.email,
            registro: dados.registroProfissional,
            idFuncao: dados.idFuncao,
            especialidade: dados.especialidade
        };

        // Atualiza a senha somente se uma nova senha for enviada
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
            `DELETE FROM PROFISSIONAL
            WHERE ID_PROFISSIONAL = :id`,
            { id },
            { autoCommit: true }
        );

        return resultado.rowsAffected > 0;
    }
}

module.exports = ProfissionalRepository;
