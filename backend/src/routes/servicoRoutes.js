
const express = require('express');
const router = express.Router();

const {
    cadastrarServico,
    listarServicos,
    buscarServicoPorId,
    atualizarServico
} = require('../controllers/servicoController');

const { autenticarToken, autorizarFuncoes } = require('../middlewares/authMiddleware');

// CREATE: somente recepcionista pode cadastrar um novo serviço
router.post('/cadastrar', autenticarToken, autorizarFuncoes('RECEPCIONISTA'), cadastrarServico);

// READ: todas as funções podem listar e buscar serviços
router.get('/listar', autenticarToken, autorizarFuncoes('RECEPCIONISTA', 'MEDICO', 'ENFERMEIRO'), listarServicos);

router.get('/buscar/:id', autenticarToken, autorizarFuncoes('RECEPCIONISTA', 'MEDICO', 'ENFERMEIRO'), buscarServicoPorId);

// UPDATE: somente recepcionista pode atualizar dados dos serviços
router.put('/atualizar/:id', autenticarToken, autorizarFuncoes('RECEPCIONISTA'), atualizarServico);

module.exports = router;
