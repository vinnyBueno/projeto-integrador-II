const { executarTransacao } = require('../config/database');
const ProntuarioRepository = require('../repositories/ProntuarioRepository');
const AtendimentoRepository = require('../repositories/AtendimentoRepository');

class Atendimento {
    static STATUS_PERMITIDOS = ['Agendado', 'Em Andamento', 'Finalizado', 'Cancelado'];

    // Valida os dados do atendimento
    static async validarDados(dados) {
        const {
            idPaciente,
            idProfissional,
            dataAtendimento,
            horaInicio,
            horaFim,
            status
        } = dados;

        const pacienteId = Number(idPaciente);
        const profissionalId = Number(idProfissional);

        if (!Number.isInteger(pacienteId) || pacienteId <= 0) {
            throw new Error('ID do paciente inválido.');
        }

        if (!Number.isInteger(profissionalId) || profissionalId <= 0) {
            throw new Error('ID do profissional inválido.');
        }

        if (!dataAtendimento ||
            !/^\d{4}-\d{2}-\d{2}$/.test(dataAtendimento) ||
            !this.dataValida(dataAtendimento)) {
            throw new Error('Data do atendimento inválida. Use YYYY-MM-DD.');
        }

        if (horaInicio && !this.horaValida(horaInicio)) {
            throw new Error('Hora de início inválida. Use HH:MM.');
        }

        if (horaFim && !this.horaValida(horaFim)) {
            throw new Error('Hora de fim inválida. Use HH:MM.');
        }

        const statusAtendimento = status || 'Agendado';

        if (!this.STATUS_PERMITIDOS.includes(statusAtendimento)) {
            throw new Error('Status do atendimento inválido.');
        }

        if (!(await AtendimentoRepository.pacienteExiste(pacienteId))) {
            throw new Error('Paciente não encontrado.');
        }

        if (!(await AtendimentoRepository.profissionalExiste(profissionalId))) {
            throw new Error('Profissional não encontrado.');
        }

        return {
            idPaciente: pacienteId,
            idProfissional: profissionalId,
            dataAtendimento,
            horaInicio: horaInicio || null,
            horaFim: horaFim || null,
            status: statusAtendimento
        };
    }

    // Verifica se a data realmente existe
    static dataValida(data) {
        const [ano, mes, dia] = data.split('-').map(Number);
        const dataTeste = new Date(Date.UTC(ano, mes - 1, dia));

        return dataTeste.getUTCFullYear() === ano &&
            dataTeste.getUTCMonth() === mes - 1 &&
            dataTeste.getUTCDate() === dia;
    }

    // Verifica o formato de horário HH:MM
    static horaValida(hora) {
        if (typeof hora !== 'string' || !/^\d{2}:\d{2}$/.test(hora)) {
            return false;
        }

        const [horas, minutos] = hora.split(':').map(Number);

        return horas >= 0 && horas <= 23 &&
            minutos >= 0 && minutos <= 59;
    }

    // CREATE: cadastrar atendimento
    static async cadastrar(dados) {

        // O atendimento ainda não começou
        const dadosAtendimento = {
            ...dados,
            horaInicio: null,
            horaFim: null
        };

        // Valida os dados do atendimento
        const dadosValidados = await this.validarDados(dadosAtendimento);

        // Executa a criação do prontuário e do atendimento
        // dentro de uma única transação
        const id = await executarTransacao(async (conexao) => {

            // Busca o prontuário ou cria um novo
            const idProntuario = await ProntuarioRepository.obterOuCriar(
                dadosValidados.idPaciente,
                conexao
            );

            // Cadastra o atendimento vinculado ao prontuário
            return await AtendimentoRepository.criar(
                dadosValidados,
                idProntuario,
                conexao
            );
        });

        return {
            id,
            ...dadosValidados,
            idProntuario: await this.buscarIdProntuario(id)
        };
    }

    // Busca o ID do prontuário associado ao atendimento
    static async buscarIdProntuario(id) {
        const atendimento = await this.buscarPorId(id);
        return atendimento.idProntuario;
    }

    // READ: listar todos
    static async listarTodos() {
        return await AtendimentoRepository.listarTodos();
    }

    // READ: buscar por ID
    static async buscarPorId(id) {
        return await AtendimentoRepository.buscarPorId(Number(id));
    }

    // UPDATE: atualizar atendimento
    static async atualizar(id, dados) {
        id = Number(id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID do atendimento inválido.');
        }

        // Busca o atendimento cadastrado
        const atendimentoExistente = await this.buscarPorId(id);

        if (!atendimentoExistente) {
            return null;
        }

        // Mantém os valores antigos dos campos não enviados
        const dadosAtualizados = {
            idPaciente: dados.idPaciente ?? atendimentoExistente.idPaciente,
            idProfissional: dados.idProfissional ?? atendimentoExistente.idProfissional,
            dataAtendimento: dados.dataAtendimento ?? atendimentoExistente.dataAtendimento,
            horaInicio: dados.horaInicio ?? atendimentoExistente.horaInicio,
            horaFim: dados.horaFim ?? atendimentoExistente.horaFim,
            status: dados.status ?? atendimentoExistente.status
        };

        // Obtém o horário atual no formato HH:MM
        const agora = new Date();

        const horaAtual = [
            String(agora.getHours()).padStart(2, '0'),
            String(agora.getMinutes()).padStart(2, '0')
        ].join(':');

        // Registra o início quando mudar para Em Andamento
        if (
            dados.status === 'Em Andamento' &&
            atendimentoExistente.status !== 'Em Andamento'
        ) {
            dadosAtualizados.horaInicio = horaAtual;
        }

        // Registra o término quando mudar para Finalizado
        if (
            dados.status === 'Finalizado' &&
            atendimentoExistente.status !== 'Finalizado'
        ) {
            dadosAtualizados.horaFim = horaAtual;
        }

        // Valida os dados completos
        const dadosValidados = await this.validarDados(dadosAtualizados);

        // Atualiza o atendimento e seu prontuário na mesma transação
        await executarTransacao(async (conexao) => {

            // Obtém o prontuário do paciente atual
            const idProntuario = await ProntuarioRepository.obterOuCriar(
                dadosValidados.idPaciente,
                conexao
            );

            // Atualiza os dados do atendimento
            await AtendimentoRepository.atualizar(
                id,
                dadosValidados,
                idProntuario,
                conexao
            );
        });

        return await this.buscarPorId(id);
    }

    // DELETE
    static async excluir(id) {
        id = Number(id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID do atendimento inválido.');
        }

        return await AtendimentoRepository.excluir(id);
    }
}

module.exports = Atendimento;