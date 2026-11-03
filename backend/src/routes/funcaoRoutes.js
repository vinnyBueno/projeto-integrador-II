
const express = require('express');
const router = express.Router();

const {
    cadastrarFuncao,
    listarFuncoes,
    buscarFuncaoPorId,
    atualizarFuncao,
    excluirFuncao
} = require('../controllers/funcaoController');

// CREATE
router.post('/cadastrar', cadastrarFuncao);

// READ
router.get('/listar', listarFuncoes);
router.get('/buscar/:id', buscarFuncaoPorId);

// UPDATE
router.put('/atualizar/:id', atualizarFuncao);

// DELETE
router.delete('/excluir/:id', excluirFuncao);

module.exports = router;
