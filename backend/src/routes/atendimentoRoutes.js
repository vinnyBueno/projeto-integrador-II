
const express = require('express');
const router = express.Router();

const {
    cadastrarAtendimento,
    listarAtendimentos,
    buscarAtendimentoPorId,
    atualizarAtendimento
} = require('../controllers/atendimentoController');

const { autenticarToken, autorizarFuncoes } = require('../middlewares/authMiddleware');

// CREATE: somente recepcionista pode cadastrar um novo atendimento
router.post('/cadastrar', autenticarToken, autorizarFuncoes('RECEPCIONISTA'), cadastrarAtendimento);

// READ: todas as funções podem listar e buscar atendimentos
router.get('/listar', autenticarToken, autorizarFuncoes('RECEPCIONISTA', 'MEDICO', 'ENFERMEIRO'), listarAtendimentos);

router.get('/buscar/:id', autenticarToken, autorizarFuncoes('RECEPCIONISTA', 'MEDICO', 'ENFERMEIRO'), buscarAtendimentoPorId);

// UPDATE: todas as funções envolvidas no atendimento podem atualizar o atendimento
router.put('/atualizar/:id', autenticarToken, autorizarFuncoes('RECEPCIONISTA', 'ENFERMEIRO', 'MEDICO'), atualizarAtendimento);

module.exports = router;
