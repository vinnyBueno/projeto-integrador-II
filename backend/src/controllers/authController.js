const jwt = require('jsonwebtoken');
const Profissional = require('../models/Profissional');

// LOGIN
const login = async (req, res) => {
    try {
        const { email, senha } = req.body;

        // Verifica se os campos foram preenchidos
        if (!email || !senha) {
            return res.status(400).json({
                erro: 'E-mail e senha são obrigatórios.'
            });
        }

        // Realiza a autenticação
        const profissional = await Profissional.autenticar(email, senha);

        // Verifica se as credenciais estão corretas
        if (!profissional) {
            return res.status(401).json({
                erro: 'E-mail ou senha incorretos.'
            });
        }

        // Gera o token JWT
        const token = jwt.sign(
            {
                id: profissional.id,
                idFuncao: profissional.idFuncao,
                nomeFuncao: profissional.nomeFuncao
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '8h'
            }
        );

        return res.status(200).json({
            mensagem: 'Login realizado com sucesso!',
            token,
            profissional
        });

    } catch (error) {
        console.error('Erro ao realizar login:', error);

        return res.status(500).json({
            erro: 'Erro interno ao realizar login.'
        });
    }
};

module.exports = { login };
