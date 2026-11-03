
const ServicoRepository = require('../repositories/ServicoRepository');

class Servico {

    // Valida o nome do serviço
    static validarNome(nome) {
        if (typeof nome !== 'string' || !nome.trim()) {
            throw new Error('Nome do serviço é obrigatório.');
        }

        return nome.trim();
    }

    // Valida a descrição
    static validarDescricao(descricao) {
        if (descricao === undefined || descricao === null) {
            return null;
        }

        if (typeof descricao !== 'string') {
            throw new Error('Descrição do serviço inválida.');
        }

        return descricao.trim() || null;
    }

    // Valida o ID da função
    static validarIdFuncao(idFuncao) {
        const id = Number(idFuncao);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID da função inválido.');
        }

        return id;
    }

    // Cadastra um serviço
    static async cadastrar(dados) {
        const nome = this.validarNome(dados.nome);
        const descricao = this.validarDescricao(dados.descricao);
        const idFuncao = this.validarIdFuncao(dados.idFuncao);

        if (await ServicoRepository.nomeExiste(nome)) {
            throw new Error('Nome do serviço já cadastrado.');
        }

        if (!await ServicoRepository.funcaoExiste(idFuncao)) {
            throw new Error('Função não encontrada.');
        }

        if (await ServicoRepository.funcaoVinculadaExiste(idFuncao)) {
            throw new Error('Esta função já está vinculada a outro serviço.');
        }

        const id = await ServicoRepository.criar({
            nome,
            descricao,
            idFuncao
        });

        return await this.buscarPorId(id);
    }

    // Lista todos os serviços
    static async listarTodos() {
        return await ServicoRepository.listarTodos();
    }

    // Busca um serviço pelo ID
    static async buscarPorId(id) {
        id = Number(id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID do serviço inválido.');
        }

        return await ServicoRepository.buscarPorId(id);
    }

    // Atualiza os dados de um serviço
    static async atualizar(id, dados) {
        id = Number(id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID do serviço inválido.');
        }

        const servicoExistente = await this.buscarPorId(id);

        if (!servicoExistente) {
            return null;
        }

        const nome = this.validarNome(
            dados.nome ?? servicoExistente.nome
        );

        const descricao = this.validarDescricao(
            dados.descricao ?? servicoExistente.descricao
        );

        const idFuncao = this.validarIdFuncao(
            dados.idFuncao ?? servicoExistente.idFuncao
        );

        if (await ServicoRepository.nomeExiste(nome, id)) {
            throw new Error('Nome do serviço já cadastrado.');
        }

        if (!await ServicoRepository.funcaoExiste(idFuncao)) {
            throw new Error('Função não encontrada.');
        }

        if (await ServicoRepository.funcaoVinculadaExiste(idFuncao, id)) {
            throw new Error('Esta função já está vinculada a outro serviço.');
        }

        await ServicoRepository.atualizar(id, {
            nome,
            descricao,
            idFuncao
        });

        return await this.buscarPorId(id);
    }

    // Exclui um serviço
    static async excluir(id) {
        id = Number(id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID do serviço inválido.');
        }

        return await ServicoRepository.excluir(id);
    }
}

module.exports = Servico;
