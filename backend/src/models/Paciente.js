const PacienteRepository = require('../repositories/PacienteRepository');

// Campos de texto e o tamanho máximo de cada coluna no banco (tables.sql).
const LIMITES = {
    nome: 100,
    rg: 20,
    genero: 20,
    email: 100,
    convenio: 40,
    nomePai: 80,
    nomeMae: 80,
    logradouro: 120,
    numeroEndereco: 20,
    complemento: 80,
    bairro: 80,
    cidade: 80,
    uf: 2
};

class Paciente {

    // Remove tudo que não for número (pontos, traços, parênteses, espaços)
    static somenteDigitos(valor) {
        return valor == null ? '' : String(valor).replace(/\D/g, '');
    }

    // Limpa um campo de texto e confere o tamanho. Vazio vira null.
    static texto(valor, campo, rotulo) {
        if (valor == null) return null;

        const limpo = String(valor).trim();
        if (!limpo) return null;

        if (limpo.length > LIMITES[campo]) {
            throw new Error(
                `${rotulo} inválido: máximo de ${LIMITES[campo]} caracteres.`
            );
        }

        return limpo;
    }

    // Telefone: só números, até 15 dígitos. Vazio vira null.
    static telefone(valor, rotulo) {
        const digitos = this.somenteDigitos(valor);
        if (!digitos) return null;

        if (digitos.length < 10 || digitos.length > 15) {
            throw new Error(`${rotulo} inválido.`);
        }

        return digitos;
    }

    // Valida os dados do paciente e devolve o objeto limpo
    static validarDados(dados) {
        const { dataNascimento } = dados;

        const nome = this.texto(dados.nome, 'nome', 'Nome');
        if (!nome) {
            throw new Error('Nome do paciente é obrigatório.');
        }

        const cpf = this.somenteDigitos(dados.cpf);
        if (!cpf) {
            throw new Error('CPF do paciente é obrigatório.');
        }
        if (cpf.length !== 11) {
            throw new Error('CPF inválido. Informe 11 números.');
        }

        if (dataNascimento) {
            if (
                typeof dataNascimento !== 'string' ||
                !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento) ||
                !this.dataValida(dataNascimento)
            ) {
                throw new Error('Data de nascimento inválida. Use YYYY-MM-DD.');
            }
        }

        const cep = this.somenteDigitos(dados.cep);
        if (cep && cep.length !== 8) {
            throw new Error('CEP inválido. Informe 8 números.');
        }

        const ufTexto = this.texto(dados.uf, 'uf', 'UF');
        const uf = ufTexto ? ufTexto.toUpperCase() : null;
        if (uf && !/^[A-Z]{2}$/.test(uf)) {
            throw new Error('UF inválida. Use a sigla com 2 letras.');
        }

        return {
            nome,
            cpf,
            rg: this.texto(dados.rg, 'rg', 'RG'),
            genero: this.texto(dados.genero, 'genero', 'Gênero'),
            dataNascimento: dataNascimento || null,
            telefone: this.telefone(dados.telefone, 'Telefone'),
            telefoneEmergencia: this.telefone(
                dados.telefoneEmergencia,
                'Telefone de emergência'
            ),
            email: this.texto(dados.email, 'email', 'E-mail'),
            convenio: this.texto(dados.convenio, 'convenio', 'Convênio'),
            nomePai: this.texto(dados.nomePai, 'nomePai', 'Nome do pai'),
            nomeMae: this.texto(dados.nomeMae, 'nomeMae', 'Nome da mãe'),
            cep: cep || null,
            logradouro: this.texto(dados.logradouro, 'logradouro', 'Logradouro'),
            numeroEndereco: this.texto(
                dados.numeroEndereco,
                'numeroEndereco',
                'Número do endereço'
            ),
            complemento: this.texto(dados.complemento, 'complemento', 'Complemento'),
            bairro: this.texto(dados.bairro, 'bairro', 'Bairro'),
            cidade: this.texto(dados.cidade, 'cidade', 'Cidade'),
            uf
        };
    }

    // Verifica se a data existe
    static dataValida(data) {
        const [ano, mes, dia] = data.split('-').map(Number);

        const dataTeste = new Date(Date.UTC(ano, mes - 1, dia));

        return dataTeste.getUTCFullYear() === ano &&
            dataTeste.getUTCMonth() === mes - 1 &&
            dataTeste.getUTCDate() === dia;
    }

    // CREATE
    static async cadastrar(dados) {
        const dadosValidados = this.validarDados(dados);

        if (await PacienteRepository.cpfExiste(dadosValidados.cpf)) {
            throw new Error('CPF já cadastrado.');
        }

        const id = await PacienteRepository.criar(dadosValidados);

        return { id, ...dadosValidados };
    }

    // READ: listar todos
    static async listarTodos() {
        return await PacienteRepository.listarTodos();
    }

    // READ: buscar por ID
    static async buscarPorId(id) {
        return await PacienteRepository.buscarPorId(Number(id));
    }

    // UPDATE
    static async atualizar(id, dados) {
        id = Number(id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID do paciente inválido.');
        }

        // Busca o paciente que já está cadastrado
        const existente = await this.buscarPorId(id);

        if (!existente) {
            return null;
        }

        // Mantém os valores antigos dos campos que não foram enviados
        const dadosAtualizados = {};
        for (const campo of Object.keys(existente)) {
            if (campo === 'id') continue;
            dadosAtualizados[campo] = dados[campo] ?? existente[campo];
        }

        // Valida os dados completos antes de salvar
        const dadosValidados = this.validarDados(dadosAtualizados);

        // Verifica se o CPF já pertence a outro paciente
        if (await PacienteRepository.cpfExiste(dadosValidados.cpf, id)) {
            throw new Error('CPF já cadastrado.');
        }

        await PacienteRepository.atualizar(id, dadosValidados);

        // Retorna o paciente com os valores atualizados
        return await this.buscarPorId(id);
    }

    // DELETE
    static async excluir(id) {
        id = Number(id);

        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('ID do paciente inválido.');
        }

        return await PacienteRepository.excluir(id);
    }
}

module.exports = Paciente;