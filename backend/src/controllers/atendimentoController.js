const Atendimento = require('../models/Atendimento');

// Define o código HTTP de um erro.
// Erros do model já trazem "status"; os demais viram 400 se forem
// de validação ou 500 se forem inesperados.
function statusDoErro(error) {
    if (error.status) return error.status;

    const mensagem = error.message.toLowerCase();

    const validacao = [
        'inválido',
        'inválida',
        'não encontrado'
    ];

    return validacao.some(item => mensagem.includes(item)) ? 400 : 500;
}

// Responde com o erro, escondendo detalhes internos nos erros 500.
function responderErro(res, error, mensagemPadrao) {
    console.error(`${mensagemPadrao}:`, error);

    const status = statusDoErro(error);

    return res.status(status).json({
        erro: status === 500 ? mensagemPadrao : error.message
    });
}

// CREATE
const cadastrarAtendimento = async (req, res) => {
    try {
        const atendimento = await Atendimento.cadastrar(req.body);

        return res.status(201).json({
            mensagem: 'Atendimento aberto com sucesso!',
            atendimento
        });
    } catch (error) {
        return responderErro(res, error, 'Erro ao cadastrar atendimento.');
    }
};

// READ: listar todos
const listarAtendimentos = async (req, res) => {
    try {
        const atendimentos = await Atendimento.listarTodos();

        return res.status(200).json(atendimentos);
    } catch (error) {
        return responderErro(res, error, 'Erro ao listar atendimentos.');
    }
};

// READ: buscar por ID
const buscarAtendimentoPorId = async (req, res) => {
    try {
        const id = Atendimento.validarId(req.params.id, 'atendimento');

        const atendimento = await Atendimento.buscarPorId(id);

        if (!atendimento) {
            return res.status(404).json({
                erro: 'Atendimento não encontrado.'
            });
        }

        return res.status(200).json(atendimento);
    } catch (error) {
        return responderErro(res, error, 'Erro ao buscar atendimento.');
    }
};

// UPDATE
const atualizarAtendimento = async (req, res) => {
    try {
        const atendimento = await Atendimento.atualizar(
            req.params.id,
            req.body
        );

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
        return responderErro(res, error, 'Erro ao atualizar atendimento.');
    }
};

// UPDATE: cancelar
const cancelarAtendimento = async (req, res) => {
    try {
        const atendimento = await Atendimento.cancelar(req.params.id);

        if (!atendimento) {
            return res.status(404).json({
                erro: 'Atendimento não encontrado.'
            });
        }

        return res.status(200).json({
            mensagem: 'Atendimento cancelado com sucesso!',
            atendimento
        });
    } catch (error) {
        return responderErro(res, error, 'Erro ao cancelar atendimento.');
    }
};

// DELETE
const excluirAtendimento = async (req, res) => {
    try {
        const excluido = await Atendimento.excluir(req.params.id);

        if (!excluido) {
            return res.status(404).json({
                erro: 'Atendimento não encontrado.'
            });
        }

        return res.status(200).json({
            mensagem: 'Atendimento excluído com sucesso!'
        });
    } catch (error) {
        return responderErro(res, error, 'Erro ao excluir atendimento.');
    }
};

module.exports = {
    cadastrarAtendimento,
    listarAtendimentos,
    buscarAtendimentoPorId,
    atualizarAtendimento,
    cancelarAtendimento,
    excluirAtendimento
};