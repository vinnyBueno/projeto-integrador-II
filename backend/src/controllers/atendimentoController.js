const Atendimento = require('../models/Atendimento');

function statusErroValidacao(error) {
    const mensagem = error.message.toLowerCase();

    const erros = [
        'inválido',
        'inválida',
        'não encontrado',
        'use yyyy-mm-dd',
        'use hh:mm',
        'status do atendimento inválido'
    ];

    return erros.some(item => mensagem.includes(item)) ? 400 : 500;
}

// CREATE
const cadastrarAtendimento = async (req, res) => {
    try {
        const atendimento = await Atendimento.cadastrar(req.body);

        return res.status(201).json({
            mensagem: 'Atendimento cadastrado com sucesso!',
            atendimento
        });
    } catch (error) {
        console.error('Erro ao cadastrar atendimento:', error);

        const status = statusErroValidacao(error);

        return res.status(status).json({
            erro: status === 500
                ? 'Erro ao cadastrar atendimento.'
                : error.message
        });
    }
};

// READ: listar todos
const listarAtendimentos = async (req, res) => {
    try {
        const atendimentos = await Atendimento.listarTodos();

        return res.status(200).json(atendimentos);
    } catch (error) {
        console.error('Erro ao listar atendimentos:', error);

        return res.status(500).json({
            erro: 'Erro ao listar atendimentos.'
        });
    }
};

// READ: buscar por ID
const buscarAtendimentoPorId = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do atendimento inválido.'
            });
        }

        const atendimento = await Atendimento.buscarPorId(id);

        if (!atendimento) {
            return res.status(404).json({
                erro: 'Atendimento não encontrado.'
            });
        }

        return res.status(200).json(atendimento);
    } catch (error) {
        console.error('Erro ao buscar atendimento:', error);

        return res.status(500).json({
            erro: 'Erro ao buscar atendimento.'
        });
    }
};

// UPDATE
const atualizarAtendimento = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do atendimento inválido.'
            });
        }

        const atendimento = await Atendimento.atualizar(id, req.body);

        if (!atendimento) {
            return res.status(404).json({
                erro: 'Atendimento não encontrado.'
            });
        }

        return res.status(200).json({
            mensagem: 'Atendimento atualizado com sucesso!',
            atendimento
        });
    } catch (error) {
        console.error('Erro ao atualizar atendimento:', error);

        const status = statusErroValidacao(error);

        return res.status(status).json({
            erro: status === 500
                ? 'Erro ao atualizar atendimento.'
                : error.message
        });
    }
};

// DELETE
const excluirAtendimento = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do atendimento inválido.'
            });
        }

        const excluido = await Atendimento.excluir(id);

        if (!excluido) {
            return res.status(404).json({
                erro: 'Atendimento não encontrado.'
            });
        }

        return res.status(200).json({
            mensagem: 'Atendimento excluído com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao excluir atendimento:', error);

        return res.status(500).json({
            erro: 'Erro ao excluir atendimento.'
        });
    }
};

module.exports = {
    cadastrarAtendimento,
    listarAtendimentos,
    buscarAtendimentoPorId,
    atualizarAtendimento,
    excluirAtendimento
};