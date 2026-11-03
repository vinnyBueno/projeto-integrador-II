
const Profissional = require('../models/Profissional');

function statusErroValidacao(error) {
    const mensagem = error.message.toLowerCase();

    const erros = [
        'obrigatórios',
        'obrigatório',
        'inválido',
        'inválida',
        'já cadastrado',
        'não encontrada',
        'função inválida',
        'não permitido',
        'é obrigatório'
    ];

    return erros.some(item => mensagem.includes(item)) ? 400 : 500;
}

// CREATE
const cadastrarProfissional = async (req, res) => {
    try {
        const profissional = await Profissional.cadastrar(req.body);

        return res.status(201).json({
            mensagem: 'Profissional cadastrado com sucesso!',
            profissional
        });
    } catch (error) {
        console.error('Erro ao cadastrar profissional:', error);

        const status = statusErroValidacao(error);

        return res.status(status).json({
            erro: status === 500
                ? 'Erro ao cadastrar profissional.'
                : error.message
        });
    }
};

// READ: listar todos
const listarProfissionais = async (req, res) => {
    try {
        const profissionais = await Profissional.listarTodos();

        return res.status(200).json(profissionais);
    } catch (error) {
        console.error('Erro ao listar profissionais:', error);

        return res.status(500).json({
            erro: 'Erro ao listar profissionais.'
        });
    }
};

// READ: buscar por ID
const buscarProfissionalPorId = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do profissional inválido.'
            });
        }

        const profissional = await Profissional.buscarPorId(id);

        if (!profissional) {
            return res.status(404).json({
                erro: 'Profissional não encontrado.'
            });
        }

        return res.status(200).json(profissional);
    } catch (error) {
        console.error('Erro ao buscar profissional:', error);

        return res.status(500).json({
            erro: 'Erro ao buscar profissional.'
        });
    }
};

// UPDATE
const atualizarProfissional = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do profissional inválido.'
            });
        }

        const profissional = await Profissional.atualizar(id, req.body);

        if (!profissional) {
            return res.status(404).json({
                erro: 'Profissional não encontrado.'
            });
        }

        return res.status(200).json({
            mensagem: 'Profissional atualizado com sucesso!',
            profissional
        });
    } catch (error) {
        console.error('Erro ao atualizar profissional:', error);

        const status = statusErroValidacao(error);

        return res.status(status).json({
            erro: status === 500
                ? 'Erro ao atualizar profissional.'
                : error.message
        });
    }
};

// DELETE
const excluirProfissional = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do profissional inválido.'
            });
        }

        const excluido = await Profissional.excluir(id);

        if (!excluido) {
            return res.status(404).json({
                erro: 'Profissional não encontrado.'
            });
        }

        return res.status(200).json({
            mensagem: 'Profissional excluído com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao excluir profissional:', error);

        return res.status(500).json({
            erro: 'Erro ao excluir profissional. Verifique se existem atendimentos vinculados.'
        });
    }
};

module.exports = {
    cadastrarProfissional,
    listarProfissionais,
    buscarProfissionalPorId,
    atualizarProfissional,
    excluirProfissional
};
