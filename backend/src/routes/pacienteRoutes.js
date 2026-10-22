const express = require('express');
const router = express.Router();

const {
    cadastrarPaciente,
    listarPacientes,
    buscarPacientePorId,
    atualizarPaciente,
    excluirPaciente
} = require('../controllers/pacienteController');

// rota para cadastrar um novo paciente
router.post('/cadastrar', cadastrarPaciente);

// rota para listar todos os pacientes
router.get('/listar', listarPacientes);

// rota para buscar um paciente por ID
router.get('/buscar/:id', buscarPacientePorId);

// rota para atualizar um paciente por ID
router.put('/atualizar/:id', atualizarPaciente);

// rota para excluir um paciente por ID
router.delete('/excluir/:id', excluirPaciente);

module.exports = router;