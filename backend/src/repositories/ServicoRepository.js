
const { executar } = require('../config/database');
const oracledb = require('oracledb');

class ServicoRepository {

    // Verifica se já existe um serviço com esse nome
    static async nomeExiste(nome, ignorarId = null) {
        let sql = `
            SELECT ID_SERVICO
            FROM SERVICO
            WHERE LOWER(NOME_SERVICO) = LOWER(:nome)
        `;

        const binds = { nome };

        // Na atualização, ignora o próprio serviço
        if (ignorarId !== null) {
            sql += ' AND ID_SERVICO <> :id';
            binds.id = ignorarId;
        }

        const resultado = await executar(sql, binds);
        return resultado.rows.length > 0;
    }

    // Verifica se a função existe
    static async funcaoExiste(idFuncao) {
        const resultado = await executar(
            `SELECT ID_FUNCAO
             FROM FUNCAO
             WHERE ID_FUNCAO = :idFuncao`,
            { idFuncao }
        );

        return resultado.rows.length > 0;
    }

    // Verifica se a função já está associada a outro serviço
    static async funcaoVinculadaExiste(idFuncao, ignorarId = null) {
        let sql = `
            SELECT ID_SERVICO
            FROM SERVICO
            WHERE ID_FUNCAO = :idFuncao
        `;

        const binds = { idFuncao };

        if (ignorarId !== null) {
            sql += ' AND ID_SERVICO <> :id';
            binds.id = ignorarId;
        }

        const resultado = await executar(sql, binds);
        return resultado.rows.length > 0;
    }

    // Cadastra um novo serviço
    static async criar(dados) {
        const resultado = await executar(
            `INSERT INTO SERVICO (
                NOME_SERVICO,
                DESCRICAO,
                ID_FUNCAO
            ) VALUES (
                :nome,
                :descricao,
                :idFuncao
            )
            RETURNING ID_SERVICO INTO :id`,
            {
                nome: dados.nome,
                descricao: dados.descricao,
                idFuncao: dados.idFuncao,
                id: {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.NUMBER
                }
            },
            { autoCommit: true }
        );

        return resultado.outBinds.id[0];
    }

    // Lista todos os serviços com suas respectivas funções
    static async listarTodos() {
        const resultado = await executar(`
            SELECT
                S.ID_SERVICO AS "id",
                S.NOME_SERVICO AS "nome",
                S.DESCRICAO AS "descricao",
                S.ID_FUNCAO AS "idFuncao",
                F.NOME_FUNCAO AS "nomeFuncao"
            FROM SERVICO S
            INNER JOIN FUNCAO F
                ON S.ID_FUNCAO = F.ID_FUNCAO
            ORDER BY S.ID_SERVICO
        `);

        return resultado.rows;
    }

    // Busca um serviço pelo ID
    static async buscarPorId(id) {
        const resultado = await executar(
            `SELECT
                S.ID_SERVICO AS "id",
                S.NOME_SERVICO AS "nome",
                S.DESCRICAO AS "descricao",
                S.ID_FUNCAO AS "idFuncao",
                F.NOME_FUNCAO AS "nomeFuncao"
            FROM SERVICO S
            INNER JOIN FUNCAO F
                ON S.ID_FUNCAO = F.ID_FUNCAO
            WHERE S.ID_SERVICO = :id`,
            { id }
        );

        return resultado.rows[0] || null;
    }

    // Atualiza os dados de um serviço
    static async atualizar(id, dados) {
        const resultado = await executar(
            `UPDATE SERVICO
             SET
                NOME_SERVICO = :nome,
                DESCRICAO = :descricao,
                ID_FUNCAO = :idFuncao
             WHERE ID_SERVICO = :id`,
            {
                id,
                nome: dados.nome,
                descricao: dados.descricao,
                idFuncao: dados.idFuncao
            },
            { autoCommit: true }
        );

        return resultado.rowsAffected > 0;
    }

    // Exclui um serviço
    static async excluir(id) {
        const resultado = await executar(
            `DELETE FROM SERVICO
            WHERE ID_SERVICO = :id`,
            { id },
            { autoCommit: true }
        );

        return resultado.rowsAffected > 0;
    }
}

module.exports = ServicoRepository;
