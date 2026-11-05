
const express = require('express');
const router = express.Router();

const profissionalController = require('../controllers/profissionalController');

const { autenticarToken, autorizarFuncoes } = require('../middlewares/authMiddleware');

// CREATE: somente recepcionista pode cadastrar um novo profissional
router.post(
    '/cadastrar',
    autenticarToken,
    autorizarFuncoes('RECEPCIONISTA'),
    profissionalController.cadastrarProfissional
);

// READ: todas as funções podem listar e buscar profissionais
router.get(
    '/listar',
    autenticarToken,
    autorizarFuncoes('RECEPCIONISTA', 'MEDICO', 'ENFERMEIRO'),
    profissionalController.listarProfissionais
);

router.get(
    '/buscar/:id',
    autenticarToken,
    autorizarFuncoes('RECEPCIONISTA', 'MEDICO', 'ENFERMEIRO'),
    profissionalController.buscarProfissionalPorId
);

// UPDATE: somente recepcionista pode atualizar dados dos profissionais
router.put(
    '/atualizar/:id',
    autenticarToken,
    autorizarFuncoes('RECEPCIONISTA'),
    profissionalController.atualizarProfissional
);


module.exports = router;
