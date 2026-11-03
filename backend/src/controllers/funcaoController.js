
const Funcao = require('../models/Funcao');

function statusErroValidacao(error) {
    const mensagem = error.message.toLowerCase();

    const erros = [
        'obrigatório',
        'inválido',
        'já cadastrado',
        'no máximo'
    ];

    return erros.some(item => mensagem.includes(item)) ? 400 : 500;
}

// CREATE
const cadastrarFuncao = async (req, res) => {
    try {
        const funcao = await Funcao.cadastrar(req.body);

        return res.status(201).json({
            mensagem: 'Função cadastrada com sucesso!',
            funcao
        });
    } catch (error) {
        console.error('Erro ao cadastrar função:', error);

        const status = statusErroValidacao(error);

        return res.status(status).json({
            erro: status === 500
                ? 'Erro ao cadastrar função.'
                : error.message
        });
    }
};

// READ: listar todas
const listarFuncoes = async (req, res) => {
    try {
        const funcoes = await Funcao.listarTodos();

        return res.status(200).json(funcoes);
    } catch (error) {
        console.error('Erro ao listar funções:', error);

        return res.status(500).json({
            erro: 'Erro ao listar funções.'
        });
    }
};

// READ: buscar por ID
const buscarFuncaoPorId = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID da função inválido.'
            });
        }

        const funcao = await Funcao.buscarPorId(id);

        if (!funcao) {
            return res.status(404).json({
                erro: 'Função não encontrada.'
            });
        }

        return res.status(200).json(funcao);
    } catch (error) {
        console.error('Erro ao buscar função:', error);

        return res.status(500).json({
            erro: 'Erro ao buscar função.'
        });
    }
};

// UPDATE
const atualizarFuncao = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID da função inválido.'
            });
        }

        const funcao = await Funcao.atualizar(id, req.body);

        if (!funcao) {
            return res.status(404).json({
                erro: 'Função não encontrada.'
            });
        }

        return res.status(200).json({
            mensagem: 'Função atualizada com sucesso!',
            funcao
        });
    } catch (error) {
        console.error('Erro ao atualizar função:', error);

        const status = statusErroValidacao(error);

        return res.status(status).json({
            erro: status === 500
                ? 'Erro ao atualizar função.'
                : error.message
        });
    }
};

// DELETE
const excluirFuncao = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID da função inválido.'
            });
        }

        const excluida = await Funcao.excluir(id);

        if (!excluida) {
            return res.status(404).json({
                erro: 'Função não encontrada.'
            });
        }

        return res.status(200).json({
            mensagem: 'Função excluída com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao excluir função:', error);

        // ORA-02292: existem registros vinculados à função
        if (error.errorNum === 2292) {
            return res.status(409).json({
                erro: 'Não é possível excluir esta função porque existem profissionais ou serviços vinculados a ela.'
            });
        }

        return res.status(500).json({
            erro: 'Erro ao excluir função.'
        });
    }
};

module.exports = {
    cadastrarFuncao,
    listarFuncoes,
    buscarFuncaoPorId,
    atualizarFuncao,
    excluirFuncao
};
