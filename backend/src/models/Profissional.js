const oracledb = require('oracledb');
const bcrypt = require('bcrypt');
const { executar } = require('../config/database');

class Profissional {
    static FUNCOES_PERMITIDAS = [
        'RECEPCIONISTA',
        'MEDICO',
        'ENFERMEIRO'
    ];

    // CREATE: cadastrar profissional
    static async cadastrar({
        nome,
        email,
        senha,
        registroProfissional,
        tipoFuncao
    }) {
        if (!nome || !email || !senha || !tipoFuncao) {
            throw new Error(
                'Nome, e-mail, senha e tipo de função são obrigatórios.'
            );
        }

        const funcao = tipoFuncao.trim().toUpperCase();

        if (!this.FUNCOES_PERMITIDAS.includes(funcao)) {
            throw new Error('Tipo de função inválido.');
        }

        const registro = registroProfissional?.trim() || null;

        if (funcao !== 'RECEPCIONISTA' && !registro) {
            throw new Error(
                'CRM ou COREN é obrigatório para esse profissional.'
            );
        }

        const emailExistente = await executar(
            `SELECT ID_PROFISSIONAL
            FROM PROFISSIONAL
            WHERE LOWER(EMAIL) = LOWER(:email)`,
            { email }
        );

        if (emailExistente.rows.length > 0) {
            throw new Error('E-mail já cadastrado.');
        }

        if (registro) {
            const registroExistente = await executar(
                `SELECT ID_PROFISSIONAL
                FROM PROFISSIONAL
                WHERE REGISTRO_PROFISSIONAL = :registro`,
                { registro }
            );

            if (registroExistente.rows.length > 0) {
                throw new Error('Registro profissional já cadastrado.');
            }
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const resultado = await executar(
            `INSERT INTO PROFISSIONAL (
                NOME,
                EMAIL,
                SENHA,
                REGISTRO_PROFISSIONAL,
                TIPO_FUNCAO
            ) VALUES (
                :nome,
                :email,
                :senha,
                :registro,
                :funcao
            )
            RETURNING ID_PROFISSIONAL INTO :id`,
            {
                nome,
                email,
                senha: senhaHash,
                registro,
                funcao,
                id: {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.NUMBER
                }
            },
            { autoCommit: true }
        );

        return {
            id: resultado.outBinds.id[0],
            nome,
            email,
            registroProfissional: registro,
            tipoFuncao: funcao
        };
    }

    // READ: listar todos ou filtrar por função
    static async listarTodos() {
        const sql = `
        SELECT
            ID_PROFISSIONAL AS "id",
            NOME AS "nome",
            EMAIL AS "email",
            REGISTRO_PROFISSIONAL AS "registroProfissional",
            TIPO_FUNCAO AS "tipoFuncao"
        FROM PROFISSIONAL
        ORDER BY NOME
    `;

        const resultado = await executar(sql, {});

        return resultado.rows;
    }

    // READ: buscar profissional por ID
    static async buscarPorId(id) {
        const resultado = await executar(
            `SELECT
                ID_PROFISSIONAL AS "id",
                NOME AS "nome",
                EMAIL AS "email",
                REGISTRO_PROFISSIONAL AS "registroProfissional",
                TIPO_FUNCAO AS "tipoFuncao"
            FROM PROFISSIONAL
            WHERE ID_PROFISSIONAL = :id`,
            { id: Number(id) }
        );

        return resultado.rows[0] || null;
    }

    // UPDATE: atualizar dados do profissional
    // A senha só é alterada quando uma nova senha é enviada.
    static async atualizar(id, dados) {
        id = Number(id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID do profissional inválido.');
        }

        const {
            nome,
            email,
            senha,
            registroProfissional,
            tipoFuncao
        } = dados;

        if (!nome || !email || !tipoFuncao) {
            throw new Error(
                'Nome, e-mail e tipo de função são obrigatórios.'
            );
        }

        const funcao = tipoFuncao.trim().toUpperCase();

        if (!this.FUNCOES_PERMITIDAS.includes(funcao)) {
            throw new Error('Tipo de função inválido.');
        }

        const profissional = await this.buscarPorId(id);

        if (!profissional) {
            return null;
        }

        const registro = registroProfissional?.trim() || null;

        if (funcao !== 'RECEPCIONISTA' && !registro) {
            throw new Error(
                'CRM ou COREN é obrigatório para esse profissional.'
            );
        }

        const emailExistente = await executar(
            `SELECT ID_PROFISSIONAL
            FROM PROFISSIONAL
            WHERE LOWER(EMAIL) = LOWER(:email)
            AND ID_PROFISSIONAL <> :id`,
            { email, id }
        );

        if (emailExistente.rows.length > 0) {
            throw new Error('E-mail já cadastrado.');
        }

        if (registro) {
            const registroExistente = await executar(
                `SELECT ID_PROFISSIONAL
                FROM PROFISSIONAL
                WHERE REGISTRO_PROFISSIONAL = :registro
                AND ID_PROFISSIONAL <> :id`,
                { registro, id }
            );

            if (registroExistente.rows.length > 0) {
                throw new Error('Registro profissional já cadastrado.');
            }
        }

        let sql = `
            UPDATE PROFISSIONAL
            SET NOME = :nome,
                EMAIL = :email,
                REGISTRO_PROFISSIONAL = :registro,
                TIPO_FUNCAO = :funcao
        `;

        const binds = {
            id,
            nome,
            email,
            registro,
            funcao
        };

        if (senha) {
            const senhaHash = await bcrypt.hash(senha, 10);

            sql += ', SENHA = :senha';
            binds.senha = senhaHash;
        }

        sql += ' WHERE ID_PROFISSIONAL = :id';

        await executar(sql, binds, { autoCommit: true });

        return await this.buscarPorId(id);
    }

    // DELETE: excluir profissional por ID
    static async excluir(id) {
        id = Number(id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID do profissional inválido.');
        }

        const resultado = await executar(
            `DELETE FROM PROFISSIONAL
            WHERE ID_PROFISSIONAL = :id`,
            { id },
            { autoCommit: true }
        );

        return resultado.rowsAffected > 0;
    }
}

module.exports = Profissional;