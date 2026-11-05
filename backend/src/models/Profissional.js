const bcrypt = require('bcrypt');
const ProfissionalRepository = require('../repositories/ProfissionalRepository');

class Profissional {

    // Padroniza o nome da função para comparação
    static normalizarFuncao(nome) {
        return nome
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toUpperCase();
    }

    // CREATE
    static async cadastrar({
        nome,
        email,
        senha,
        registroProfissional,
        idFuncao,
        especialidade
    }) {
        if (!nome || !email || !senha || idFuncao === undefined || idFuncao === null) {
            throw new Error('Nome, e-mail, senha e função são obrigatórios.');
        }

        if (
            typeof nome !== 'string' ||
            typeof email !== 'string' ||
            typeof senha !== 'string' ||
            !nome.trim() ||
            !email.trim() ||
            !senha
        ) {
            throw new Error('Nome, e-mail e senha são inválidos.');
        }

        idFuncao = Number(idFuncao);

        if (!Number.isInteger(idFuncao) || idFuncao <= 0) {
            throw new Error('ID da função inválido.');
        }

        // Busca a função no banco de dados
        const funcao = await ProfissionalRepository.buscarFuncaoPorId(idFuncao);

        if (!funcao) {
            throw new Error('Função não encontrada.');
        }

        const nomeFuncao = this.normalizarFuncao(funcao.nomeFuncao);

        if (!['RECEPCIONISTA', 'MEDICO', 'ENFERMEIRO'].includes(nomeFuncao)) {
            throw new Error('Função inválida para cadastro de profissional.');
        }

        const registro = registroProfissional?.trim() || null;

        // Médico e enfermeiro precisam de CRM ou COREN
        if (nomeFuncao !== 'RECEPCIONISTA' && !registro) {
            throw new Error('CRM ou COREN é obrigatório para esse profissional.');
        }

        if (await ProfissionalRepository.emailExiste(email.trim())) {
            throw new Error('E-mail já cadastrado.');
        }

        if (
            registro &&
            await ProfissionalRepository.registroExiste(registro)
        ) {
            throw new Error('Registro profissional já cadastrado.');
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const dados = {
            nome: nome.trim(),
            email: email.trim(),
            senha: senhaHash,
            registroProfissional: nomeFuncao === 'RECEPCIONISTA' ? null : registro,
            idFuncao,
            especialidade: especialidade?.trim() || null
        };

        const id = await ProfissionalRepository.criar(dados);

        return {
            id,
            nome: dados.nome,
            email: dados.email,
            registroProfissional: dados.registroProfissional,
            idFuncao,
            nomeFuncao: funcao.nomeFuncao,
            especialidade: dados.especialidade
        };
    }

    // READ: listar todos
    static async listarTodos() {
        return await ProfissionalRepository.listarTodos();
    }

    // READ: buscar por ID
    static async buscarPorId(id) {
        return await ProfissionalRepository.buscarPorId(Number(id));
    }

    // UPDATE
    static async atualizar(id, dados) {
        id = Number(id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID do profissional inválido.');
        }

        // Busca o profissional atual
        const profissional = await this.buscarPorId(id);

        if (!profissional) {
            return null;
        }

        // Mantém os valores antigos dos campos não enviados
        const dadosAtualizados = {
            nome: dados.nome ?? profissional.nome,
            email: dados.email ?? profissional.email,
            registroProfissional:
                dados.registroProfissional ?? profissional.registroProfissional,
            idFuncao: dados.idFuncao ?? profissional.idFuncao,
            especialidade: dados.especialidade ?? profissional.especialidade
        };

        const senha = dados.senha;

        if (
            typeof dadosAtualizados.nome !== 'string' ||
            !dadosAtualizados.nome.trim()
        ) {
            throw new Error('Nome do profissional é obrigatório.');
        }

        if (
            typeof dadosAtualizados.email !== 'string' ||
            !dadosAtualizados.email.trim()
        ) {
            throw new Error('E-mail do profissional é obrigatório.');
        }

        dadosAtualizados.nome = dadosAtualizados.nome.trim();
        dadosAtualizados.email = dadosAtualizados.email.trim();
        dadosAtualizados.idFuncao = Number(dadosAtualizados.idFuncao);

        if (
            !Number.isInteger(dadosAtualizados.idFuncao) ||
            dadosAtualizados.idFuncao <= 0
        ) {
            throw new Error('ID da função inválido.');
        }

        // Verifica se a função existe
        const funcao = await ProfissionalRepository.buscarFuncaoPorId(
            dadosAtualizados.idFuncao
        );

        if (!funcao) {
            throw new Error('Função não encontrada.');
        }

        const nomeFuncao = this.normalizarFuncao(funcao.nomeFuncao);

        if (!['RECEPCIONISTA', 'MEDICO', 'ENFERMEIRO'].includes(nomeFuncao)) {
            throw new Error('Função inválida para cadastro de profissional.');
        }

        // Se a função for Recepcionista, não precisa de registro
        if (nomeFuncao === 'RECEPCIONISTA') {
            dadosAtualizados.registroProfissional = null;
        } else {
            dadosAtualizados.registroProfissional =
                dadosAtualizados.registroProfissional?.trim() || null;

            if (!dadosAtualizados.registroProfissional) {
                throw new Error('CRM ou COREN é obrigatório para esse profissional.');
            }
        }

        // Verifica duplicidade de e-mail
        if (
            await ProfissionalRepository.emailExiste(
                dadosAtualizados.email,
                id
            )
        ) {
            throw new Error('E-mail já cadastrado.');
        }

        // Verifica duplicidade de CRM ou COREN
        if (
            dadosAtualizados.registroProfissional &&
            await ProfissionalRepository.registroExiste(
                dadosAtualizados.registroProfissional,
                id
            )
        ) {
            throw new Error('Registro profissional já cadastrado.');
        }

        // Prepara os dados para atualização
        if (dadosAtualizados.especialidade !== null) {
            dadosAtualizados.especialidade =
                dadosAtualizados.especialidade?.trim() || null;
        }

        // Atualiza a senha somente se uma nova senha for enviada
        if (senha) {
            dadosAtualizados.senha = await bcrypt.hash(senha, 10);
        }

        await ProfissionalRepository.atualizar(id, dadosAtualizados);

        return await this.buscarPorId(id);
    }

    // DELETE
    static async excluir(id) {
        id = Number(id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID do profissional inválido.');
        }

        return await ProfissionalRepository.excluir(id);
    }

    // AUTH: autenticar profissional
    static async autenticar(email, senha) {
        if (
            !email ||
            !senha ||
            typeof email !== 'string' ||
            typeof senha !== 'string'
        ) {
            throw new Error('E-mail e senha são obrigatórios.');
        }

        // Busca o profissional pelo e-mail
        const profissional = await ProfissionalRepository.buscarPorEmail(
            email.trim()
        );

        // Verifica se o profissional existe
        if (!profissional) {
            return null;
        }

        // Compara a senha informada com o hash armazenado
        const senhaValida = await bcrypt.compare(
            senha,
            profissional.senhaHash
        );

        if (!senhaValida) {
            return null;
        }

        // Retorna somente os dados necessários
        return {
            id: profissional.id,
            nome: profissional.nome,
            email: profissional.email,
            idFuncao: profissional.idFuncao,
            nomeFuncao: profissional.nomeFuncao
        };
    }

}

module.exports = Profissional;
