const bcrypt = require('bcrypt');
const ProfissionalRepository = require('../repositories/ProfissionalRepository');

class Profissional {
    static FUNCOES_PERMITIDAS = ['RECEPCIONISTA', 'MEDICO', 'ENFERMEIRO'];

    // CREATE
    static async cadastrar({ nome, email, senha, registroProfissional, tipoFuncao, especialidade }) {
        if (!nome || !email || !senha || !tipoFuncao) {
            throw new Error('Nome, e-mail, senha e tipo de função são obrigatórios.');
        }

        const funcao = tipoFuncao.trim().toUpperCase();

        if (!this.FUNCOES_PERMITIDAS.includes(funcao)) {
            throw new Error('Tipo de função inválido.');
        }

        const registro = registroProfissional?.trim() || null;

        if (funcao !== 'RECEPCIONISTA' && !registro) {
            throw new Error('CRM ou COREN é obrigatório para esse profissional.');
        }

        if (await ProfissionalRepository.emailExiste(email)) {
            throw new Error('E-mail já cadastrado.');
        }

        if (registro && await ProfissionalRepository.registroExiste(registro)) {
            throw new Error('Registro profissional já cadastrado.');
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const id = await ProfissionalRepository.criar({
            nome,
            email,
            senha: senhaHash,
            registroProfissional: registro,
            tipoFuncao: funcao,
            especialidade: especialidade?.trim() || null
        });

        return {
            id,
            nome,
            email,
            registroProfissional: registro,
            tipoFuncao: funcao,
            especialidade: especialidade?.trim() || null
        };
    }

    // READ: listar todos
    static async listarTodos() {
        return await ProfissionalRepository.listarTodos();
    }

    // READ: buscar por ID
    static async buscarPorId(id) {
        return await ProfissionalRepository.buscarPorId(Number(id));
    }

    // UPDATE
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
            tipoFuncao,
            especialidade
        } = dados;

        if (!nome || !email || !tipoFuncao) {
            throw new Error('Nome, e-mail e tipo de função são obrigatórios.');
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
            throw new Error('CRM ou COREN é obrigatório para esse profissional.');
        }

        if (await ProfissionalRepository.emailExiste(email, id)) {
            throw new Error('E-mail já cadastrado.');
        }

        if (registro && await ProfissionalRepository.registroExiste(registro, id)) {
            throw new Error('Registro profissional já cadastrado.');
        }

        // A senha só será atualizada se uma nova senha for enviada.
        const dadosAtualizados = {
            nome,
            email,
            registroProfissional: registro,
            tipoFuncao: funcao,
            especialidade: especialidade?.trim() || null
        };

        if (senha) {
            dadosAtualizados.senha = await bcrypt.hash(senha, 10);
        }

        await ProfissionalRepository.atualizar(id, dadosAtualizados);

        return await this.buscarPorId(id);
    }

    // DELETE
    static async excluir(id) {
        id = Number(id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID do profissional inválido.');
        }

        return await ProfissionalRepository.excluir(id);
    }
}

module.exports = Profissional;
