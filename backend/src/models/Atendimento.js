const AtendimentoRepository = require('../repositories/AtendimentoRepository');

class Atendimento {
    static STATUS_PERMITIDOS = [ 'Agendado', 'Em Andamento', 'Finalizado', 'Cancelado'];

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

    // CREATE
    static async cadastrar(dados) {
        const dadosValidados = await this.validarDados(dados);

        const id = await AtendimentoRepository.criar(dadosValidados);

        return {
            id,
            ...dadosValidados
        };
    }

    // READ: listar todos
    static async listarTodos() {
        return await AtendimentoRepository.listarTodos();
    }

    // READ: buscar por ID
    static async buscarPorId(id) {
        return await AtendimentoRepository.buscarPorId(Number(id));
    }

    // UPDATE
    static async atualizar(id, dados) {
        id = Number(id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID do atendimento inválido.');
        }

        const atendimentoExistente = await this.buscarPorId(id);

        if (!atendimentoExistente) {
            return null;
        }

        const dadosValidados = await this.validarDados(dados);

        await AtendimentoRepository.atualizar(id, dadosValidados);

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