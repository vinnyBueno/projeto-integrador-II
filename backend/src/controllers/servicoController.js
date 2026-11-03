
const Servico = require('../models/Servico');

// Identifica erros de validação
function statusErroValidacao(mensagem) {
    const termos = [
        'obrigatório',
        'inválido',
        'já cadastrado',
        'não encontrada',
        'já está vinculada'
    ];

    return termos.some(termo => mensagem.includes(termo)) ? 400 : 500;
}

// Cadastrar serviço
async function cadastrarServico(req, res) {
    try {
        const servico = await Servico.cadastrar(req.body);

        return res.status(201).json({
            mensagem: 'Serviço cadastrado com sucesso!',
            servico
        });

    } catch (error) {
        console.error(error);

        return res.status(statusErroValidacao(error.message)).json({
            erro: error.message
        });
    }
}

// Listar serviços
async function listarServicos(req, res) {
    try {
        const servicos = await Servico.listarTodos();

        return res.status(200).json(servicos);

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            erro: 'Erro ao listar serviços.'
        });
    }
}

// Buscar serviço por ID
async function buscarServicoPorId(req, res) {
    try {
        const servico = await Servico.buscarPorId(req.params.id);

        if (!servico) {
            return res.status(404).json({
                erro: 'Serviço não encontrado.'
            });
        }

        return res.status(200).json(servico);

    } catch (error) {
        console.error(error);

        return res.status(statusErroValidacao(error.message)).json({
            erro: error.message
        });
    }
}

// Atualizar serviço
async function atualizarServico(req, res) {
    try {
        const servico = await Servico.atualizar(
            req.params.id,
            req.body
        );

        if (!servico) {
            return res.status(404).json({
                erro: 'Serviço não encontrado.'
            });
        }

        return res.status(200).json({
            mensagem: 'Serviço atualizado com sucesso!',
            servico
        });

    } catch (error) {
        console.error(error);

        return res.status(statusErroValidacao(error.message)).json({
            erro: error.message
        });
    }
}

// Excluir serviço
async function excluirServico(req, res) {
    try {
        const excluido = await Servico.excluir(req.params.id);

        if (!excluido) {
            return res.status(404).json({
                erro: 'Serviço não encontrado.'
            });
        }

        return res.status(200).json({
            mensagem: 'Serviço excluído com sucesso!'
        });

    } catch (error) {
        console.error(error);

        // ORA-02292: existem registros dependentes
        if (error.errorNum === 2292) {
            return res.status(409).json({
                erro: 'Não é possível excluir este serviço porque existem registros vinculados a ele.'
            });
        }

        return res.status(statusErroValidacao(error.message)).json({
            erro: error.message
        });
    }
}

module.exports = {
    cadastrarServico,
    listarServicos,
    buscarServicoPorId,
    atualizarServico,
    excluirServico
};
