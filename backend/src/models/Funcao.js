
const FuncaoRepository = require('../repositories/FuncaoRepository');

class Funcao {

    // Valida o nome da função
    static validarNome(nome) {
        if (typeof nome !== 'string' || !nome.trim()) {
            throw new Error('Nome da função é obrigatório.');
        }

        nome = nome.trim();

        if (nome.length > 50) {
            throw new Error('Nome da função deve ter no máximo 50 caracteres.');
        }

        return nome;
    }

    // CREATE: cadastrar função
    static async cadastrar(dados) {
        const nome = this.validarNome(dados.nome);

        if (await FuncaoRepository.nomeExiste(nome)) {
            throw new Error('Nome da função já cadastrado.');
        }

        const id = await FuncaoRepository.criar({ nome });

        return {
            id,
            nome
        };
    }

    // READ: listar todas
    static async listarTodos() {
        return await FuncaoRepository.listarTodos();
    }

    // READ: buscar por ID
    static async buscarPorId(id) {
        return await FuncaoRepository.buscarPorId(Number(id));
    }

    // UPDATE: atualizar função
    static async atualizar(id, dados) {
        id = Number(id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID da função inválido.');
        }

        const funcaoExistente = await this.buscarPorId(id);

        if (!funcaoExistente) {
            return null;
        }

        // Mantém o nome antigo caso não seja enviado
        const nome = this.validarNome(
            dados.nome ?? funcaoExistente.nome
        );

        // Verifica se o nome já pertence a outra função
        if (await FuncaoRepository.nomeExiste(nome, id)) {
            throw new Error('Nome da função já cadastrado.');
        }

        await FuncaoRepository.atualizar(id, { nome });

        return await this.buscarPorId(id);
    }

    // DELETE: excluir função
    static async excluir(id) {
        id = Number(id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID da função inválido.');
        }

        return await FuncaoRepository.excluir(id);
    }
}

module.exports = Funcao;
