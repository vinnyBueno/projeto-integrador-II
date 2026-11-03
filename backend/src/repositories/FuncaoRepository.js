
const { executar } = require('../config/database');
const oracledb = require('oracledb');

class FuncaoRepository {

    // Verifica se o nome da função já está cadastrado
    static async nomeExiste(nome, ignorarId = null) {
        let sql = `
            SELECT ID_FUNCAO
            FROM FUNCAO
            WHERE LOWER(NOME_FUNCAO) = LOWER(:nome)
        `;

        const binds = { nome };

        if (ignorarId !== null) {
            sql += ' AND ID_FUNCAO <> :id';
            binds.id = ignorarId;
        }

        const resultado = await executar(sql, binds);

        return resultado.rows.length > 0;
    }

    // CREATE: cadastrar função
    static async criar(dados) {
        const resultado = await executar(
            `INSERT INTO FUNCAO (NOME_FUNCAO)
            VALUES (:nome)
            RETURNING ID_FUNCAO INTO :id`,
            {
                nome: dados.nome,
                id: {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.NUMBER
                }
            },
            { autoCommit: true }
        );

        return resultado.outBinds.id[0];
    }

    // READ: listar todas as funções
    static async listarTodos() {
        const resultado = await executar(`
            SELECT
                ID_FUNCAO AS "id",
                NOME_FUNCAO AS "nome"
            FROM FUNCAO
            ORDER BY NOME_FUNCAO
        `);

        return resultado.rows;
    }

    // READ: buscar função por ID
    static async buscarPorId(id) {
        const resultado = await executar(
            `SELECT
                ID_FUNCAO AS "id",
                NOME_FUNCAO AS "nome"
            FROM FUNCAO
            WHERE ID_FUNCAO = :id`,
            { id }
        );

        return resultado.rows[0] || null;
    }

    // UPDATE: atualizar função
    static async atualizar(id, dados) {
        const resultado = await executar(
            `UPDATE FUNCAO
            SET NOME_FUNCAO = :nome
            WHERE ID_FUNCAO = :id`,
            {
                id,
                nome: dados.nome
            },
            { autoCommit: true }
        );

        return resultado.rowsAffected > 0;
    }

    // DELETE: excluir função
    static async excluir(id) {
        const resultado = await executar(
            `DELETE FROM FUNCAO
            WHERE ID_FUNCAO = :id`,
            { id },
            { autoCommit: true }
        );

        return resultado.rowsAffected > 0;
    }
}

module.exports = FuncaoRepository;
