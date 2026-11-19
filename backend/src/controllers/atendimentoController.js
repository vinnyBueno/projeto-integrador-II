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
        const atendimentos = await Atendimento.listarTodos(req.query);

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

// TRIAGEM: iniciar (AGUARDANDO_TRIAGEM -> EM_TRIAGEM)
const iniciarTriagem = async (req, res) => {
    try {
        const atendimento = await Atendimento.iniciarTriagem(req.params.id);

        return res.status(200).json({
            mensagem: 'Triagem iniciada.',
            atendimento
        });
    } catch (error) {
        return responderErro(res, error, 'Erro ao iniciar triagem.');
    }
};

// TRIAGEM: salvar sinais vitais e queixas
const salvarTriagem = async (req, res) => {
    try {
        const atendimento = await Atendimento.salvarTriagem(
            req.params.id,
            req.body
        );

        return res.status(200).json({
            mensagem: 'Triagem registrada com sucesso!',
            atendimento
        });
    } catch (error) {
        return responderErro(res, error, 'Erro ao salvar triagem.');
    }
};

// TRIAGEM: salvar classificação de risco (envia para a fila médica)
const salvarClassificacao = async (req, res) => {
    try {
        const atendimento = await Atendimento.salvarClassificacao(
            req.params.id,
            req.body
        );

        return res.status(200).json({
            mensagem: 'Classificação registrada. Atendimento enviado à fila médica.',
            atendimento
        });
    } catch (error) {
        return responderErro(res, error, 'Erro ao salvar classificação.');
    }
};

// Cria um handler que chama o model e responde 200 com { mensagem, atendimento }.
function acaoMedica(executar, mensagemOk, mensagemErro) {
    return async (req, res) => {
        try {
            const atendimento = await executar(req);

            return res.status(200).json({ mensagem: mensagemOk, atendimento });
        } catch (error) {
            return responderErro(res, error, mensagemErro);
        }
    };
}

// MÉDICO: abrir/retomar consulta (corpo: { medico, medicoEmail })
const iniciarConsulta = acaoMedica(
    req => Atendimento.iniciarConsulta(req.params.id, req.body),
    'Atendimento médico iniciado.',
    'Erro ao iniciar atendimento médico.'
);

// MÉDICO: salvar anotações (corpo: { anotacoes })
const salvarConsulta = acaoMedica(
    req => Atendimento.salvarConsulta(req.params.id, req.body),
    'Anotações registradas.',
    'Erro ao salvar anotações da consulta.'
);

// MÉDICO: adicionar medicação (corpo: { nome, dose, via, frequencia })
const adicionarMedicacao = acaoMedica(
    req => Atendimento.adicionarMedicacao(req.params.id, req.body),
    'Medicação incluída.',
    'Erro ao incluir medicação.'
);

// MÉDICO: remover medicação
const removerMedicacao = acaoMedica(
    req => Atendimento.removerMedicacao(req.params.id, req.params.idMedicacao),
    'Medicação removida.',
    'Erro ao remover medicação.'
);

// MÉDICO: confirmar e finalizar (corpo opcional: { anotacoes })
const finalizarAtendimento = acaoMedica(
    req => Atendimento.finalizar(req.params.id, req.body),
    'Atendimento concluído.',
    'Erro ao finalizar atendimento.'
);

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
    iniciarTriagem,
    salvarTriagem,
    salvarClassificacao,
    iniciarConsulta,
    salvarConsulta,
    adicionarMedicacao,
    removerMedicacao,
    finalizarAtendimento,
    excluirAtendimento
};