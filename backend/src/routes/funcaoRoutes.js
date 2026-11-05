
const express = require('express');
const router = express.Router();

const {
    cadastrarFuncao,
    listarFuncoes,
    buscarFuncaoPorId,
    atualizarFuncao
} = require('../controllers/funcaoController');

const { autenticarToken, autorizarFuncoes } = require('../middlewares/authMiddleware');

// CREATE: somente recepcionista pode cadastrar uma nova função
router.post('/cadastrar', autenticarToken, autorizarFuncoes('RECEPCIONISTA'), cadastrarFuncao);

// READ: todas as funções podem listar e buscar funções
router.get('/listar', autenticarToken, autorizarFuncoes('RECEPCIONISTA', 'MEDICO', 'ENFERMEIRO'), listarFuncoes);

router.get('/buscar/:id', autenticarToken, autorizarFuncoes('RECEPCIONISTA', 'MEDICO', 'ENFERMEIRO'), buscarFuncaoPorId);

// UPDATE: somente recepcionista pode atualizar dados das funções
router.put('/atualizar/:id', autenticarToken, autorizarFuncoes('RECEPCIONISTA'), atualizarFuncao);

module.exports = router;
