const jwt = require('jsonwebtoken');

// AUTENTICAÇÃO: verificar o token JWT
const autenticarToken = (req, res, next) => {
    try {
        const authorization = req.headers.authorization;

        // Verifica se o token foi enviado
        if (!authorization) {
            return res.status(401).json({
                erro: 'Token de autenticação não informado.'
            });
        }

        // Separa o tipo Bearer do token
        const [tipo, token] = authorization.split(' ');

        if (tipo !== 'Bearer' || !token) {
            return res.status(401).json({
                erro: 'Formato do token inválido.'
            });
        }

        // Verifica se a chave JWT está configurada
        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET não configurado.');

            return res.status(500).json({
                erro: 'Erro na configuração da autenticação.'
            });
        }

        // Valida o token
        const dadosToken = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Armazena os dados do profissional na requisição
        req.profissional = {
            id: dadosToken.id,
            idFuncao: dadosToken.idFuncao,
            nomeFuncao: dadosToken.nomeFuncao
        };

        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                erro: 'Token expirado. Faça login novamente.'
            });
        }

        return res.status(401).json({
            erro: 'Token inválido.'
        });
    }
};

// AUTORIZAÇÃO: verificar a função do profissional
const autorizarFuncoes = (...funcoesPermitidas) => {
    return (req, res, next) => {

        // Verifica se o profissional está autenticado
        if (!req.profissional) {
            return res.status(401).json({
                erro: 'Profissional não autenticado.'
            });
        }

        // Normaliza a função recebida
        const normalizar = (nome) => nome
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toUpperCase();

        const funcaoProfissional = normalizar(
            req.profissional.nomeFuncao
        );

        // Normaliza as funções permitidas
        const funcoes = funcoesPermitidas.map(normalizar);

        // Verifica se a função possui autorização
        if (!funcoes.includes(funcaoProfissional)) {
            return res.status(403).json({
                erro: 'Você não possui permissão para acessar este recurso.'
            });
        }

        next();
    };
};

module.exports = { autenticarToken, autorizarFuncoes };
