
const oracledb = require('oracledb');

class ProntuarioRepository {

    // Busca o prontuário pelo ID do paciente
    static async buscarPorPaciente(idPaciente, conexao) {
        const resultado = await conexao.execute(
            `SELECT
                ID_PRONTUARIO AS "id",
                ID_PACIENTE AS "idPaciente",
                TO_CHAR(DATA_CRIACAO, 'YYYY-MM-DD') AS "dataCriacao"
            FROM PRONTUARIO
            WHERE ID_PACIENTE = :idPaciente`,
            { idPaciente }
        );

        return resultado.rows[0] || null;
    }

    // Cria um novo prontuário
    static async criar(idPaciente, conexao) {
        const resultado = await conexao.execute(
            `INSERT INTO PRONTUARIO (
                ID_PACIENTE,
                DATA_CRIACAO
            ) VALUES (
                :idPaciente,
                SYSDATE
            )
            RETURNING ID_PRONTUARIO INTO :id`,
            {
                idPaciente,
                id: {
                    dir: oracledb.BIND_OUT,
                    type: oracledb.NUMBER
                }
            }
        );

        return resultado.outBinds.id[0];
    }

    // Busca o prontuário ou cria um caso não exista
    static async obterOuCriar(idPaciente, conexao) {

        // Bloqueia o registro do paciente durante a transação
        const paciente = await conexao.execute(
            `SELECT ID_PACIENTE
            FROM PACIENTE
            WHERE ID_PACIENTE = :idPaciente
            FOR UPDATE`,
            { idPaciente }
        );

        if (paciente.rows.length === 0) {
            throw new Error('Paciente não encontrado.');
        }

        // Verifica se já existe um prontuário
        const prontuario = await this.buscarPorPaciente(
            idPaciente,
            conexao
        );

        if (prontuario) {
            return prontuario.id;
        }

        // Cria o prontuário caso seja o primeiro atendimento
        return await this.criar(idPaciente, conexao);
    }
}

module.exports = ProntuarioRepository;
