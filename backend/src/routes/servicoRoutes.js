
const express = require('express');
const router = express.Router();

const {
    cadastrarServico,
    listarServicos,
    buscarServicoPorId,
    atualizarServico,
    excluirServico
} = require('../controllers/servicoController');

router.post('/cadastrar', cadastrarServico);
router.get('/listar', listarServicos);
router.get('/buscar/:id', buscarServicoPorId);
router.put('/atualizar/:id', atualizarServico);
router.delete('/excluir/:id', excluirServico);

module.exports = router;
