const oracledb = require('oracledb');
const { executar } = require('../config/database');

// Formato de data/hora enviado ao frontend: 2026-11-11T21:20:00
const ISO = `'YYYY-MM-DD"T"HH24:MI:SS'`;

// Consulta base: atendimento + paciente + triagem + classificação.
// Triagem e classificação são LEFT JOIN: ficam nulas até serem registradas.
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
        TO_CHAR(P.DATA_NASCIMENTO, 'YYYY-MM-DD') AS "pacienteDataNascimento",
        P.GENERO AS "pacienteGenero",
        P.TELEFONE AS "pacienteTelefone",
        P.CONVENIO AS "pacienteConvenio",
        P.NOME_MAE AS "pacienteNomeMae",
        P.TELEFONE_EMERGENCIA AS "pacienteTelefoneEmergencia",
        T.ID_REGISTRO_TRIAGEM AS "triagemId",
        T.PRESSAO_SISTOLICA AS "triagemSistolica",
        T.PRESSAO_DIASTOLICA AS "triagemDiastolica",
        T.TEMPERATURA AS "triagemTemperatura",
        T.FREQUENCIA_CARDIACA AS "triagemFrequenciaCardiaca",
        T.FREQUENCIA_RESPIRATORIA AS "triagemFrequenciaRespiratoria",
        T.QUEIXAS AS "triagemQueixas",
        T.PROFISSIONAL AS "triagemProfissional",
        TO_CHAR(T.REGISTRADO_EM, ${ISO}) AS "triagemRegistradoEm",
        C.COR AS "classificacaoCor",
        TO_CHAR(C.REGISTRADO_EM, ${ISO}) AS "classificacaoRegistradoEm",
        CM.ID_CONSULTA AS "consultaId",
        CM.MEDICO_NOME AS "consultaMedico",
        CM.MEDICO_EMAIL AS "consultaMedicoEmail",
        CM.ANOTACOES AS "consultaAnotacoes",
        CM.CONFIRMADO AS "consultaConfirmado",
        TO_CHAR(CM.INICIO_EM, ${ISO}) AS "consultaInicioEm",
        TO_CHAR(CM.FIM_EM, ${ISO}) AS "consultaFimEm"
    FROM ATENDIMENTO A
    JOIN PACIENTE P ON P.ID_PACIENTE = A.ID_PACIENTE
    LEFT JOIN REGISTRO_TRIAGEM T ON T.ID_ATENDIMENTO = A.ID_ATENDIMENTO
    LEFT JOIN CLASSIFICACAO_RISCO C ON C.ID_ATENDIMENTO = A.ID_ATENDIMENTO
    LEFT JOIN CONSULTA_MEDICA CM ON CM.ID_ATENDIMENTO = A.ID_ATENDIMENTO
`;

// Medicações com o ID do atendimento a que pertencem.
const SELECT_MEDICACAO = `
    SELECT
        M.ID_MEDICACAO AS "id",
        CM.ID_ATENDIMENTO AS "atendimentoId",
        M.NOME AS "nome",
        M.DOSE AS "dose",
        M.VIA AS "via",
        M.FREQUENCIA AS "frequencia",
        TO_CHAR(M.REGISTRADO_EM, ${ISO}) AS "registradoEm"
    FROM MEDICACAO M
    JOIN CONSULTA_MEDICA CM ON CM.ID_CONSULTA = M.ID_CONSULTA
    JOIN ATENDIMENTO A ON A.ID_ATENDIMENTO = CM.ID_ATENDIMENTO
`;

// Monta o WHERE das consultas de atendimento.
// filtro: { id, idPaciente, statuses: ['EM_TRIAGEM', ...] }
function montarFiltro(filtro = {}) {
    const condicoes = [];
    const binds = {};

    if (filtro.id != null) {
        condicoes.push('A.ID_ATENDIMENTO = :id');
        binds.id = filtro.id;
    }

    if (filtro.idPaciente != null) {
        condicoes.push('A.ID_PACIENTE = :idPaciente');
        binds.idPaciente = filtro.idPaciente;
    }

    const statuses = filtro.statuses || [];
    if (statuses.length > 0) {
        const nomes = statuses.map((status, i) => {
            binds[`s${i}`] = status;
            return `:s${i}`;
        });
        condicoes.push(`A.STATUS IN (${nomes.join(', ')})`);
    }

    return {
        where: condicoes.length ? ` WHERE ${condicoes.join(' AND ')}` : '',
        binds
    };
}

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

    // READ: listar (mais recentes primeiro).
    // filtro opcional: { statuses, idPaciente }
    static async listarTodos(filtro = {}) {
        const { where, binds } = montarFiltro(filtro);

        const resultado = await executar(
            `${SELECT_ATENDIMENTO}${where}
            ORDER BY A.CRIADO_EM DESC, A.ID_ATENDIMENTO DESC`,
            binds
        );

        return resultado.rows;
    }

    // READ: buscar por ID
    static async buscarPorId(id) {
        const { where, binds } = montarFiltro({ id });

        const resultado = await executar(`${SELECT_ATENDIMENTO}${where}`, binds);

        return resultado.rows[0] || null;
    }

    // Medicações dos atendimentos que passam no mesmo filtro da listagem.
    static async listarMedicacoes(filtro = {}) {
        const { where, binds } = montarFiltro(filtro);

        const resultado = await executar(
            `${SELECT_MEDICACAO}${where}
            ORDER BY M.REGISTRADO_EM, M.ID_MEDICACAO`,
            binds
        );

        return resultado.rows;
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

    // ---- Triagem e classificação (rodam na transação do model) ----

    // Trava o atendimento e devolve o status dele (ou null se não existir).
    static async bloquearPorId(id, conexao) {
        const resultado = await conexao.execute(
            `SELECT STATUS AS "status"
            FROM ATENDIMENTO
            WHERE ID_ATENDIMENTO = :id
            FOR UPDATE`,
            { id }
        );

        return resultado.rows[0] ? resultado.rows[0].status : null;
    }

    static async atualizarStatus(id, status, conexao) {
        await conexao.execute(
            `UPDATE ATENDIMENTO
            SET STATUS = :status,
                ATUALIZADO_EM = CURRENT_TIMESTAMP
            WHERE ID_ATENDIMENTO = :id`,
            { id, status }
        );
    }

    static async existeTriagem(id, conexao) {
        const resultado = await conexao.execute(
            `SELECT ID_REGISTRO_TRIAGEM AS "id"
            FROM REGISTRO_TRIAGEM
            WHERE ID_ATENDIMENTO = :id`,
            { id }
        );

        return resultado.rows.length > 0;
    }

    // Insere a triagem ou, se já existir, atualiza.
    static async salvarTriagem(id, dados, conexao) {
        const binds = {
            id,
            sistolica: dados.pressaoSistolica,
            diastolica: dados.pressaoDiastolica,
            temperatura: dados.temperatura,
            frequenciaCardiaca: dados.frequenciaCardiaca,
            frequenciaRespiratoria: dados.frequenciaRespiratoria,
            queixas: dados.queixas,
            profissional: dados.profissional
        };

        if (await this.existeTriagem(id, conexao)) {
            await conexao.execute(
                `UPDATE REGISTRO_TRIAGEM
                SET PRESSAO_SISTOLICA = :sistolica,
                    PRESSAO_DIASTOLICA = :diastolica,
                    TEMPERATURA = :temperatura,
                    FREQUENCIA_CARDIACA = :frequenciaCardiaca,
                    FREQUENCIA_RESPIRATORIA = :frequenciaRespiratoria,
                    QUEIXAS = :queixas,
                    PROFISSIONAL = NVL(:profissional, PROFISSIONAL),
                    ATUALIZADO_EM = CURRENT_TIMESTAMP
                WHERE ID_ATENDIMENTO = :id`,
                binds
            );
        } else {
            await conexao.execute(
                `INSERT INTO REGISTRO_TRIAGEM (
                    ID_ATENDIMENTO,
                    PRESSAO_SISTOLICA,
                    PRESSAO_DIASTOLICA,
                    TEMPERATURA,
                    FREQUENCIA_CARDIACA,
                    FREQUENCIA_RESPIRATORIA,
                    QUEIXAS,
                    PROFISSIONAL
                ) VALUES (
                    :id,
                    :sistolica,
                    :diastolica,
                    :temperatura,
                    :frequenciaCardiaca,
                    :frequenciaRespiratoria,
                    :queixas,
                    :profissional
                )`,
                binds
            );
        }
    }

    // Insere a classificação ou, se já existir, troca a cor.
    static async salvarClassificacao(id, cor, conexao) {
        const existe = await conexao.execute(
            `SELECT ID_CLASSIFICACAO AS "id"
            FROM CLASSIFICACAO_RISCO
            WHERE ID_ATENDIMENTO = :id`,
            { id }
        );

        if (existe.rows.length > 0) {
            await conexao.execute(
                `UPDATE CLASSIFICACAO_RISCO
                SET COR = :cor,
                    ATUALIZADO_EM = CURRENT_TIMESTAMP
                WHERE ID_ATENDIMENTO = :id`,
                { id, cor }
            );
        } else {
            await conexao.execute(
                `INSERT INTO CLASSIFICACAO_RISCO (ID_ATENDIMENTO, COR)
                VALUES (:id, :cor)`,
                { id, cor }
            );
        }
    }

    // ---- Consulta médica e medicações (rodam na transação do model) ----

    // Devolve { id, anotacoes } da consulta do atendimento, ou null.
    static async buscarConsulta(idAtendimento, conexao) {
        const resultado = await conexao.execute(
            `SELECT ID_CONSULTA AS "id", ANOTACOES AS "anotacoes"
            FROM CONSULTA_MEDICA
            WHERE ID_ATENDIMENTO = :idAtendimento`,
            { idAtendimento }
        );

        return resultado.rows[0] || null;
    }

    static async criarConsulta(idAtendimento, medico, medicoEmail, conexao) {
        await conexao.execute(
            `INSERT INTO CONSULTA_MEDICA (ID_ATENDIMENTO, MEDICO_NOME, MEDICO_EMAIL)
            VALUES (:idAtendimento, :medico, :medicoEmail)`,
            { idAtendimento, medico, medicoEmail }
        );

        // Marca a hora de início do atendimento médico (só na primeira vez)
        await conexao.execute(
            `UPDATE ATENDIMENTO
            SET HORA_INICIO = NVL(HORA_INICIO, CURRENT_TIMESTAMP)
            WHERE ID_ATENDIMENTO = :idAtendimento`,
            { idAtendimento }
        );
    }

    static async salvarAnotacoes(idAtendimento, anotacoes, conexao) {
        await conexao.execute(
            `UPDATE CONSULTA_MEDICA
            SET ANOTACOES = :anotacoes,
                ATUALIZADO_EM = CURRENT_TIMESTAMP
            WHERE ID_ATENDIMENTO = :idAtendimento`,
            { idAtendimento, anotacoes }
        );
    }

    static async adicionarMedicacao(idConsulta, dados, conexao) {
        await conexao.execute(
            `INSERT INTO MEDICACAO (ID_CONSULTA, NOME, DOSE, VIA, FREQUENCIA)
            VALUES (:idConsulta, :nome, :dose, :via, :frequencia)`,
            {
                idConsulta,
                nome: dados.nome,
                dose: dados.dose,
                via: dados.via,
                frequencia: dados.frequencia
            }
        );
    }

    // Remove a medicação só se ela for da consulta informada.
    static async removerMedicacao(idConsulta, idMedicacao, conexao) {
        const resultado = await conexao.execute(
            `DELETE FROM MEDICACAO
            WHERE ID_MEDICACAO = :idMedicacao
              AND ID_CONSULTA = :idConsulta`,
            { idConsulta, idMedicacao }
        );

        return resultado.rowsAffected > 0;
    }

    // Confirma a consulta e encerra o atendimento.
    static async finalizar(idAtendimento, conexao) {
        await conexao.execute(
            `UPDATE CONSULTA_MEDICA
            SET CONFIRMADO = 1,
                FIM_EM = CURRENT_TIMESTAMP,
                ATUALIZADO_EM = CURRENT_TIMESTAMP
            WHERE ID_ATENDIMENTO = :idAtendimento`,
            { idAtendimento }
        );

        await conexao.execute(
            `UPDATE ATENDIMENTO
            SET STATUS = 'FINALIZADO',
                HORA_FIM = CURRENT_TIMESTAMP,
                FINALIZADO_EM = CURRENT_TIMESTAMP,
                ATUALIZADO_EM = CURRENT_TIMESTAMP
            WHERE ID_ATENDIMENTO = :idAtendimento`,
            { idAtendimento }
        );
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