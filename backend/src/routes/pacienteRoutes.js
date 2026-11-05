
const express = require('express');
const router = express.Router();

const {
    cadastrarPaciente,
    listarPacientes,
    buscarPacientePorId,
    atualizarPaciente
} = require('../controllers/pacienteController');

const { autenticarToken, autorizarFuncoes } = require('../middlewares/authMiddleware');

// CREATE: somente recepcionista pode cadastrar pacientes
router.post('/cadastrar', autenticarToken, autorizarFuncoes('RECEPCIONISTA'), cadastrarPaciente);

// READ: todas as funções podem listar e buscar pacientes
router.get('/listar', autenticarToken, autorizarFuncoes('RECEPCIONISTA', 'MEDICO', 'ENFERMEIRO'), listarPacientes);
router.get('/buscar/:id', autenticarToken, autorizarFuncoes('RECEPCIONISTA', 'MEDICO', 'ENFERMEIRO'), buscarPacientePorId);

// UPDATE: somente recepcionista pode atualizar dados dos pacientes
router.put('/atualizar/:id', autenticarToken, autorizarFuncoes('RECEPCIONISTA'), atualizarPaciente);

module.exports = router;
