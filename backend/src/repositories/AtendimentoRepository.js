const { executar } = require('../config/database');
const oracledb = require('oracledb');

class AtendimentoRepository {

    // Verifica se o paciente existe
    static async pacienteExiste(idPaciente) {
        const resultado = await executar(
            `SELECT ID_PACIENTE FROM PACIENTE WHERE ID_PACIENTE = :idPaciente`,
            { idPaciente }
        );

        return resultado.rows.length > 0;
    }

    // Verifica se o profissional existe
    static async profissionalExiste(idProfissional) {
        const resultado = await executar(
            `SELECT ID_PROFISSIONAL FROM PROFISSIONAL WHERE ID_PROFISSIONAL = :idProfissional`,
            { idProfissional }
        );

        return resultado.rows.length > 0;
    }

    // CREATE
    static async criar(dados) {
        const resultado = await executar(
            `INSERT INTO ATENDIMENTO (
                ID_PACIENTE,
                ID_PROFISSIONAL,
                DATA_ATENDIMENTO,
                HORA_INICIO,
                HORA_FIM,
                STATUS
            ) VALUES (
                :idPaciente,
                :idProfissional,
                TO_DATE(:dataAtendimento, 'YYYY-MM-DD'),
                :horaInicio,
                :horaFim,
                :status
            )
            RETURNING ID_ATENDIMENTO INTO :id`,
            {
                idPaciente: dados.idPaciente,
                idProfissional: dados.idProfissional,
                dataAtendimento: dados.dataAtendimento,
                horaInicio: dados.horaInicio || null,
                horaFim: dados.horaFim || null,
                status: dados.status || 'Agendado',
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
                ID_ATENDIMENTO AS "id",
                ID_PACIENTE AS "idPaciente",
                ID_PROFISSIONAL AS "idProfissional",
                TO_CHAR(DATA_ATENDIMENTO, 'YYYY-MM-DD') AS "dataAtendimento",
                HORA_INICIO AS "horaInicio",
                HORA_FIM AS "horaFim",
                STATUS AS "status"
            FROM ATENDIMENTO
            ORDER BY DATA_ATENDIMENTO, HORA_INICIO
        `);

        return resultado.rows;
    }

    // READ: buscar por ID
    static async buscarPorId(id) {
        const resultado = await executar(
            `SELECT
                ID_ATENDIMENTO AS "id",
                ID_PACIENTE AS "idPaciente",
                ID_PROFISSIONAL AS "idProfissional",
                TO_CHAR(DATA_ATENDIMENTO, 'YYYY-MM-DD') AS "dataAtendimento",
                HORA_INICIO AS "horaInicio",
                HORA_FIM AS "horaFim",
                STATUS AS "status"
            FROM ATENDIMENTO
            WHERE ID_ATENDIMENTO = :id`,
            { id }
        );

        return resultado.rows[0] || null;
    }

    // UPDATE
    static async atualizar(id, dados) {
        const resultado = await executar(
            `UPDATE ATENDIMENTO
            SET ID_PACIENTE = :idPaciente,
                ID_PROFISSIONAL = :idProfissional,
                DATA_ATENDIMENTO = TO_DATE(:dataAtendimento, 'YYYY-MM-DD'),
                HORA_INICIO = :horaInicio,
                HORA_FIM = :horaFim,
                STATUS = :status
            WHERE ID_ATENDIMENTO = :id`,
            {
                id,
                idPaciente: dados.idPaciente,
                idProfissional: dados.idProfissional,
                dataAtendimento: dados.dataAtendimento,
                horaInicio: dados.horaInicio,
                horaFim: dados.horaFim || null,
                status: dados.status
            },
            { autoCommit: true }
        );

        return resultado.rowsAffected > 0;
    }

    // DELETE
    static async excluir(id) {
        const resultado = await executar(
            `DELETE FROM ATENDIMENTO WHERE ID_ATENDIMENTO = :id`,
            { id },
            { autoCommit: true }
        );

        return resultado.rowsAffected > 0;
    }
}

module.exports = AtendimentoRepository;