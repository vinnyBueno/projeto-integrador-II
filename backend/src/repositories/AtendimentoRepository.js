const oracledb = require('oracledb');
const { executar } = require('../config/database');

// Formato de data/hora enviado ao frontend: 2026-11-11T21:20:00
const ISO = `'YYYY-MM-DD"T"HH24:MI:SS'`;

// Consulta base: atendimento + dados principais do paciente.
const SELECT_ATENDIMENTO = `
    SELECT
        A.ID_ATENDIMENTO AS "id",
        TO_CHAR(A.ID_ATENDIMENTO) AS "numero",
        A.ID_PACIENTE AS "pacienteId",
        A.ID_PRONTUARIO AS "prontuarioId",
        A.MOTIVO AS "queixaPrincipal",
        A.STATUS AS "status",
        TO_CHAR(A.CRIADO_EM, ${ISO}) AS "criadoEm",
        TO_CHAR(A.ATUALIZADO_EM, ${ISO}) AS "atualizadoEm",
        TO_CHAR(A.CANCELADO_EM, ${ISO}) AS "canceladoEm",
        TO_CHAR(A.FINALIZADO_EM, ${ISO}) AS "finalizadoEm",
        GREATEST(0, FLOOR(
            (CAST(CURRENT_TIMESTAMP AS DATE) - CAST(A.CRIADO_EM AS DATE)) * 1440
        )) AS "tempoEsperaMin",
        P.NOME AS "pacienteNome",
        P.CPF AS "pacienteCpf",
        TO_CHAR(P.DATA_NASCIMENTO, 'YYYY-MM-DD') AS "pacienteDataNascimento"
    FROM ATENDIMENTO A
    JOIN PACIENTE P ON P.ID_PACIENTE = A.ID_PACIENTE
`;

class AtendimentoRepository {

    // CREATE: roda dentro da transação do model (recebe a conexão)
    static async criar(idPaciente, idProntuario, queixaPrincipal, conexao) {
        const resultado = await conexao.execute(
            `INSERT INTO ATENDIMENTO (
                ID_PACIENTE,
                ID_PRONTUARIO,
                MOTIVO,
                DATA,
                CRIADO_EM,
                ATUALIZADO_EM
            ) VALUES (
                :idPaciente,
                :idProntuario,
                :motivo,
                TRUNC(CURRENT_DATE),
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            RETURNING ID_ATENDIMENTO INTO :id`,
            {
                idPaciente,
                idProntuario,
                motivo: queixaPrincipal,
                id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
            }
        );

        return resultado.outBinds.id[0];
    }

    // Procura um atendimento ainda em aberto do paciente.
    // Devolve o ID dele ou null.
    static async buscarAbertoDoPaciente(idPaciente, conexao) {
        const resultado = await conexao.execute(
            `SELECT ID_ATENDIMENTO AS "id"
            FROM ATENDIMENTO
            WHERE ID_PACIENTE = :idPaciente
              AND STATUS NOT IN ('FINALIZADO', 'CANCELADO')`,
            { idPaciente }
        );

        return resultado.rows[0] ? resultado.rows[0].id : null;
    }

    // READ: listar todos (mais recentes primeiro)
    static async listarTodos() {
        const resultado = await executar(
            `${SELECT_ATENDIMENTO}
            ORDER BY A.CRIADO_EM DESC, A.ID_ATENDIMENTO DESC`
        );

        return resultado.rows;
    }

    // READ: buscar por ID
    static async buscarPorId(id) {
        const resultado = await executar(
            `${SELECT_ATENDIMENTO}
            WHERE A.ID_ATENDIMENTO = :id`,
            { id }
        );

        return resultado.rows[0] || null;
    }

    // UPDATE: alterar a queixa principal
    static async atualizarQueixa(id, queixaPrincipal) {
        const resultado = await executar(
            `UPDATE ATENDIMENTO
            SET MOTIVO = :motivo,
                ATUALIZADO_EM = CURRENT_TIMESTAMP
            WHERE ID_ATENDIMENTO = :id`,
            { id, motivo: queixaPrincipal },
            { autoCommit: true }
        );

        return resultado.rowsAffected > 0;
    }

    // UPDATE: cancelar
    static async cancelar(id) {
        const resultado = await executar(
            `UPDATE ATENDIMENTO
            SET STATUS = 'CANCELADO',
                CANCELADO_EM = CURRENT_TIMESTAMP,
                ATUALIZADO_EM = CURRENT_TIMESTAMP
            WHERE ID_ATENDIMENTO = :id`,
            { id },
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