const express = require('express');
const router = express.Router();

const {
    cadastrarAtendimento,
    listarAtendimentos,
    buscarAtendimentoPorId,
    atualizarAtendimento,
    cancelarAtendimento,
    iniciarTriagem,
    salvarTriagem,
    salvarClassificacao,
    iniciarConsulta,
    salvarConsulta,
    adicionarMedicacao,
    removerMedicacao,
    finalizarAtendimento,
    excluirAtendimento
} = require('../controllers/atendimentoController');

// rota para abrir um novo atendimento
router.post('/cadastrar', cadastrarAtendimento);

// rota para listar todos os atendimentos
router.get('/listar', listarAtendimentos);

// rota para buscar um atendimento por ID
router.get('/buscar/:id', buscarAtendimentoPorId);

// rota para atualizar um atendimento por ID
router.put('/atualizar/:id', atualizarAtendimento);

// rota para cancelar um atendimento por ID
router.put('/cancelar/:id', cancelarAtendimento);

// rota para a enfermagem iniciar a triagem
router.put('/iniciar-triagem/:id', iniciarTriagem);

// rota para registrar sinais vitais e queixas da triagem
router.put('/triagem/:id', salvarTriagem);

// rota para registrar a classificação de risco (Manchester)
router.put('/classificacao/:id', salvarClassificacao);

// rota para o médico abrir (ou retomar) a consulta
router.put('/iniciar-consulta/:id', iniciarConsulta);

// rota para registrar as anotações da consulta
router.put('/consulta/:id', salvarConsulta);

// rotas para incluir e remover medicações da consulta
router.post('/medicacoes/:id', adicionarMedicacao);
router.delete('/medicacoes/:id/:idMedicacao', removerMedicacao);

// rota para confirmar e finalizar o atendimento
router.put('/finalizar/:id', finalizarAtendimento);

// rota para excluir um atendimento por ID
router.delete('/excluir/:id', excluirAtendimento);

module.exports = router;