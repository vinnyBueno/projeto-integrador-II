const Paciente = require('../models/Paciente');

function statusErroValidacao(error) {
    const mensagem = error.message.toLowerCase();

    const erros = [
        'obrigatório',
        'obrigatória',
        'inválido',
        'inválida',
        'use yyyy-mm-dd',
        'cpf já cadastrado'
    ];

    return erros.some(item => mensagem.includes(item)) ? 400 : 500;
}

// CREATE
const cadastrarPaciente = async (req, res) => {
    try {
        const paciente = await Paciente.cadastrar(req.body);

        return res.status(201).json({
            mensagem: 'Paciente cadastrado com sucesso!',
            paciente
        });
    } catch (error) {
        console.error('Erro ao cadastrar paciente:', error);

        const status = statusErroValidacao(error);

        return res.status(status).json({
            erro: status === 500
                ? 'Erro ao cadastrar paciente.'
                : error.message
        });
    }
};

// READ: listar todos
const listarPacientes = async (req, res) => {
    try {
        const pacientes = await Paciente.listarTodos();

        return res.status(200).json(pacientes);
    } catch (error) {
        console.error('Erro ao listar pacientes:', error);

        return res.status(500).json({
            erro: 'Erro ao listar pacientes.'
        });
    }
};

// READ: buscar por ID
const buscarPacientePorId = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do paciente inválido.'
            });
        }

        const paciente = await Paciente.buscarPorId(id);

        if (!paciente) {
            return res.status(404).json({
                erro: 'Paciente não encontrado.'
            });
        }

        return res.status(200).json(paciente);
    } catch (error) {
        console.error('Erro ao buscar paciente:', error);

        return res.status(500).json({
            erro: 'Erro ao buscar paciente.'
        });
    }
};

// UPDATE
const atualizarPaciente = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do paciente inválido.'
            });
        }

        const paciente = await Paciente.atualizar(id, req.body);

        if (!paciente) {
            return res.status(404).json({
                erro: 'Paciente não encontrado.'
            });
        }

        return res.status(200).json({
            mensagem: 'Paciente atualizado com sucesso!',
            paciente
        });
    } catch (error) {
        console.error('Erro ao atualizar paciente:', error);

        const status = statusErroValidacao(error);

        return res.status(status).json({
            erro: status === 500
                ? 'Erro ao atualizar paciente.'
                : error.message
        });
    }
};

// DELETE
const excluirPaciente = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: 'ID do paciente inválido.'
            });
        }

        const excluido = await Paciente.excluir(id);

        if (!excluido) {
            return res.status(404).json({
                erro: 'Paciente não encontrado.'
            });
        }

        return res.status(200).json({
            mensagem: 'Paciente excluído com sucesso!'
        });
    } catch (error) {
        console.error('Erro ao excluir paciente:', error);

        return res.status(500).json({
            erro: 'Erro ao excluir paciente. Verifique se existem atendimentos vinculados.'
        });
    }
};

module.exports = {
    cadastrarPaciente,
    listarPacientes,
    buscarPacientePorId,
    atualizarPaciente,
    excluirPaciente
};