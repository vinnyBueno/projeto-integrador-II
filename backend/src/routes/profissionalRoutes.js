const express = require('express');
const router = express.Router();

const profissionalController = require('../controllers/profissionalController');

// rota para cadastrar um novo profissional
router.post('/cadastrar', profissionalController.cadastrarProfissional);

// rota para listar todos os profissionais
router.get('/listar', profissionalController.listarProfissionais);

// rota para buscar um profissional por ID
router.get('/buscar/:id', profissionalController.buscarProfissionalPorId);

// rota para atualizar um profissional por ID
router.put('/atualizar/:id', profissionalController.atualizarProfissional);

// rota para deletar um profissional por ID
router.delete('/excluir/:id', profissionalController.excluirProfissional);

module.exports = router;