const PacienteRepository = require('../repositories/PacienteRepository');

class Paciente {
    // Valida os dados do paciente
    static validarDados(dados) {
        const { nome, dataNascimento } = dados;

        if (!nome || !nome.trim()) {
            throw new Error('Nome do paciente é obrigatório.');
        }

        if (dataNascimento) {
            if (
                typeof dataNascimento !== 'string' ||
                !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento) ||
                !this.dataValida(dataNascimento)
            ) {
                throw new Error('Data de nascimento inválida. Use YYYY-MM-DD.');
            }
        }

        return {
            nome: nome.trim(),
            cpf: dados.cpf || null,
            rg: dados.rg || null,
            endereco: dados.endereco || null,
            telefone: dados.telefone || null,
            email: dados.email || null,
            genero: dados.genero || null,
            dataNascimento: dataNascimento || null
        };
    }

    // Verifica se a data existe
    static dataValida(data) {
        const [ano, mes, dia] = data.split('-').map(Number);

        const dataTeste = new Date(
            Date.UTC(ano, mes - 1, dia)
        );

        return dataTeste.getUTCFullYear() === ano &&
            dataTeste.getUTCMonth() === mes - 1 &&
            dataTeste.getUTCDate() === dia;
    }

    // CREATE
    static async cadastrar(dados) {
        const dadosValidados = this.validarDados(dados);

        const id = await PacienteRepository.criar(dadosValidados);

        return {
            id,
            ...dadosValidados
        };
    }

    // READ: listar todos
    static async listarTodos() {
        return await PacienteRepository.listarTodos();
    }

    // READ: buscar por ID
    static async buscarPorId(id) {
        return await PacienteRepository.buscarPorId(Number(id));
    }

    // UPDATE
    static async atualizar(id, dados) {
        id = Number(id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID do paciente inválido.');
        }

        // Busca o paciente que já está cadastrado
        const pacienteExistente = await this.buscarPorId(id);

        if (!pacienteExistente) {
            return null;
        }

        // Mantém os valores antigos dos campos não enviados
        const dadosAtualizados = {
            nome: dados.nome ?? pacienteExistente.nome,
            cpf: dados.cpf ?? pacienteExistente.cpf,
            rg: dados.rg ?? pacienteExistente.rg,
            endereco: dados.endereco ?? pacienteExistente.endereco,
            telefone: dados.telefone ?? pacienteExistente.telefone,
            email: dados.email ?? pacienteExistente.email,
            genero: dados.genero ?? pacienteExistente.genero,
            dataNascimento:
                dados.dataNascimento ?? pacienteExistente.dataNascimento
        };

        // Valida os dados completos antes de salvar
        const dadosValidados = this.validarDados(dadosAtualizados);

        // Verifica se o CPF já pertence a outro paciente
        if (
            dadosValidados.cpf &&
            await PacienteRepository.cpfExiste(dadosValidados.cpf, id)
        ) {
            throw new Error('CPF já cadastrado.');
        }

        // Salva os dados atualizados
        await PacienteRepository.atualizar(id, dadosValidados);

        // Retorna o paciente com os valores atualizados
        return await this.buscarPorId(id);
    }

    // DELETE
    static async excluir(id) {
        id = Number(id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID do paciente inválido.');
        }

        return await PacienteRepository.excluir(id);
    }
}

module.exports = Paciente;