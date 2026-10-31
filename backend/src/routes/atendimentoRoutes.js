const express = require('express');
const router = express.Router();

const {
    cadastrarAtendimento,
    listarAtendimentos,
    buscarAtendimentoPorId,
    atualizarAtendimento,
    excluirAtendimento
} = require('../controllers/atendimentoController');

// rota para criar um novo atendimento
router.post('/cadastrar', cadastrarAtendimento);

// rota para listar todos os atendimentos
router.get('/listar', listarAtendimentos);

// rota para buscar um atendimento por ID
router.get('/buscar/:id', buscarAtendimentoPorId);

// rota para atualizar um atendimento por ID
router.put('/atualizar/:id', atualizarAtendimento);

// rota para excluir um atendimento por ID
router.delete('/excluir/:id', excluirAtendimento);

module.exports = router;