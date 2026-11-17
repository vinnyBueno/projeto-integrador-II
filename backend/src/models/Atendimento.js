const { executarTransacao } = require('../config/database');
const ProntuarioRepository = require('../repositories/ProntuarioRepository');
const AtendimentoRepository = require('../repositories/AtendimentoRepository');

const TAMANHO_MAXIMO_QUEIXA = 200;

// Status possíveis do atendimento (iguais aos do banco e do frontend)
const STATUS_VALIDOS = [
    'AGUARDANDO_TRIAGEM',
    'EM_TRIAGEM',
    'AGUARDANDO_ATENDIMENTO_MEDICO',
    'EM_ATENDIMENTO_MEDICO',
    'FINALIZADO',
    'CANCELADO'
];

// Depois da classificação, a triagem não pode mais ser alterada
const STATUS_TRIAGEM_CONCLUIDA = [
    'AGUARDANDO_ATENDIMENTO_MEDICO',
    'EM_ATENDIMENTO_MEDICO'
];

// Protocolo de Manchester
const CORES_MANCHESTER = ['vermelho', 'laranja', 'amarelo', 'verde', 'azul'];

// Faixas aceitas para os sinais vitais
const FAIXAS = {
    sistolica: { min: 70, max: 250, rotulo: 'Pressão sistólica' },
    diastolica: { min: 40, max: 150, rotulo: 'Pressão diastólica' },
    temperatura: { min: 34, max: 42.5, rotulo: 'Temperatura' },
    frequenciaCardiaca: { min: 30, max: 220, rotulo: 'Frequência cardíaca' },
    frequenciaRespiratoria: { min: 8, max: 60, rotulo: 'Frequência respiratória' }
};

const QUEIXAS_MIN = 8;
const QUEIXAS_MAX = 500;

const ANOTACOES_MIN = 8;
const ANOTACOES_MAX = 1000;

// Tamanhos aceitos para os campos da medicação (iguais aos da tabela)
const CAMPOS_MEDICACAO = {
    nome: { min: 3, max: 80, rotulo: 'O nome da medicação' },
    dose: { min: 1, max: 40, rotulo: 'A dose' },
    via: { min: 2, max: 10, rotulo: 'A via' },
    frequencia: { min: 2, max: 30, rotulo: 'A frequência' }
};

// Nome de profissional enviado pelo frontend (opcional, até 100 caracteres)
function nomeProfissional(valor) {
    const nome = String(valor ?? '').trim();
    return nome ? nome.slice(0, 100) : null;
}

// Cria um erro que já carrega o código HTTP que o controller deve devolver.
function erro(mensagem, status = 400) {
    const e = new Error(mensagem);
    e.status = status;
    return e;
}

class Atendimento {

    // Valida o ID recebido na URL ou no corpo da requisição
    static validarId(valor, rotulo) {
        const id = Number(valor);

        if (!Number.isInteger(id) || id <= 0) {
            throw erro(`ID do ${rotulo} inválido.`);
        }

        return id;
    }

    // A queixa é opcional. Vazio vira null.
    static validarQueixa(valor) {
        if (valor == null) return null;

        const queixa = String(valor).trim();
        if (!queixa) return null;

        if (queixa.length > TAMANHO_MAXIMO_QUEIXA) {
            throw erro(
                `Queixa principal inválida: máximo de ${TAMANHO_MAXIMO_QUEIXA} caracteres.`
            );
        }

        return queixa;
    }

    // Converte um valor em número aceitando vírgula (36,5). Vazio vira NaN.
    static numero(valor) {
        if (valor === null || valor === undefined) return NaN;

        const texto = String(valor).trim().replace(',', '.');
        if (!texto) return NaN;

        return Number(texto);
    }

    // Confere se o número está na faixa e devolve o valor.
    static faixa(valor, regra) {
        const n = this.numero(valor);

        if (Number.isNaN(n) || n < regra.min || n > regra.max) {
            throw erro(
                `${regra.rotulo} inválida: informe um valor entre ${regra.min} e ${regra.max}.`
            );
        }

        return n;
    }

    // Valida os sinais vitais e as queixas da triagem.
    // Devolve o objeto limpo, pronto para gravar.
    static validarTriagem(dados) {
        const pa = String(dados.pressaoArterial ?? '')
            .trim()
            .match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);

        if (!pa) {
            throw erro('Pressão arterial inválida. Informe no formato 120/80.');
        }

        const pressaoSistolica = this.faixa(pa[1], FAIXAS.sistolica);
        const pressaoDiastolica = this.faixa(pa[2], FAIXAS.diastolica);

        const temperatura = Number(
            this.faixa(dados.temperatura, FAIXAS.temperatura).toFixed(1)
        );
        const frequenciaCardiaca = Math.round(
            this.faixa(dados.frequenciaCardiaca, FAIXAS.frequenciaCardiaca)
        );
        const frequenciaRespiratoria = Math.round(
            this.faixa(dados.frequenciaRespiratoria, FAIXAS.frequenciaRespiratoria)
        );

        const queixas = String(dados.queixas ?? '').trim();
        if (queixas.length < QUEIXAS_MIN || queixas.length > QUEIXAS_MAX) {
            throw erro(
                `Queixas inválidas: informe entre ${QUEIXAS_MIN} e ${QUEIXAS_MAX} caracteres.`
            );
        }

        if (pressaoDiastolica >= pressaoSistolica) {
            throw erro('A pressão diastólica precisa ser menor que a sistólica.');
        }

        return {
            pressaoSistolica,
            pressaoDiastolica,
            temperatura,
            frequenciaCardiaca,
            frequenciaRespiratoria,
            queixas,
            profissional: nomeProfissional(dados.enfermeira)
        };
    }

    // Valida o texto das anotações da consulta.
    static validarAnotacoes(valor) {
        const anotacoes = String(valor ?? '').trim();

        if (anotacoes.length < ANOTACOES_MIN || anotacoes.length > ANOTACOES_MAX) {
            throw erro(
                `As anotações da consulta devem ter entre ${ANOTACOES_MIN} e ${ANOTACOES_MAX} caracteres.`
            );
        }

        return anotacoes;
    }

    // Valida nome, dose, via e frequência da medicação.
    static validarMedicacao(dados) {
        const limpo = {};

        for (const [campo, regra] of Object.entries(CAMPOS_MEDICACAO)) {
            const texto = String(dados[campo] ?? '').trim();

            if (texto.length < regra.min || texto.length > regra.max) {
                throw erro(
                    `${regra.rotulo} deve ter entre ${regra.min} e ${regra.max} caracteres.`
                );
            }

            limpo[campo] = texto;
        }

        limpo.via = limpo.via.toUpperCase();

        return limpo;
    }

    // Trava o atendimento e confere se ele está em consulta médica.
    // Devolve a consulta ({ id, anotacoes }).
    static async exigirEmConsulta(id, conexao, mensagem) {
        const status = await AtendimentoRepository.bloquearPorId(id, conexao);

        if (!status) throw erro('Atendimento não encontrado.', 404);

        this.bloquearSeEncerrado(status);

        if (status !== 'EM_ATENDIMENTO_MEDICO') {
            throw erro(mensagem, 409);
        }

        const consulta = await AtendimentoRepository.buscarConsulta(id, conexao);

        if (!consulta) throw erro('Consulta médica não encontrada.', 409);

        return consulta;
    }

    // Atendimento encerrado não aceita mais alterações
    static bloquearSeEncerrado(status) {
        if (status === 'FINALIZADO') {
            throw erro(
                'Este atendimento já foi concluído e não pode ser alterado ou cancelado.',
                409
            );
        }

        if (status === 'CANCELADO') {
            throw erro(
                'Este atendimento foi cancelado e não pode ser alterado.',
                409
            );
        }
    }

    // Converte a linha do banco no formato que o frontend usa:
    // paciente, triagem, classificação e consulta viram objetos aninhados.
    // "medicacoes" são as medicações deste atendimento.
    static formatar(linha, medicacoes = []) {
        if (!linha) return null;

        const {
            pacienteNome,
            pacienteCpf,
            pacienteDataNascimento,
            pacienteGenero,
            pacienteTelefone,
            pacienteConvenio,
            pacienteNomeMae,
            pacienteTelefoneEmergencia,
            triagemId,
            triagemSistolica,
            triagemDiastolica,
            triagemTemperatura,
            triagemFrequenciaCardiaca,
            triagemFrequenciaRespiratoria,
            triagemQueixas,
            triagemProfissional,
            triagemRegistradoEm,
            classificacaoCor,
            classificacaoRegistradoEm,
            consultaId,
            consultaMedico,
            consultaMedicoEmail,
            consultaAnotacoes,
            consultaConfirmado,
            consultaInicioEm,
            consultaFimEm,
            ...atendimento
        } = linha;

        return {
            ...atendimento,
            paciente: {
                id: atendimento.pacienteId,
                nome: pacienteNome,
                cpf: pacienteCpf,
                dataNascimento: pacienteDataNascimento,
                genero: pacienteGenero,
                telefone: pacienteTelefone,
                convenio: pacienteConvenio,
                nomeMae: pacienteNomeMae,
                telefoneEmergencia: pacienteTelefoneEmergencia
            },
            triagem: triagemId == null ? null : {
                id: triagemId,
                pressaoArterial: `${triagemSistolica}/${triagemDiastolica}`,
                temperatura: triagemTemperatura,
                frequenciaCardiaca: triagemFrequenciaCardiaca,
                frequenciaRespiratoria: triagemFrequenciaRespiratoria,
                queixas: triagemQueixas,
                enfermeira: triagemProfissional,
                registradoEm: triagemRegistradoEm
            },
            classificacao: classificacaoCor == null ? null : {
                cor: classificacaoCor,
                registradoEm: classificacaoRegistradoEm
            },
            atendimentoMedico: consultaId == null ? null : {
                id: consultaId,
                medico: consultaMedico,
                medicoEmail: consultaMedicoEmail,
                anotacoes: consultaAnotacoes || '',
                confirmado: consultaConfirmado === 1,
                inicioEm: consultaInicioEm,
                fimEm: consultaFimEm
            },
            medicacoes: medicacoes.map(({ atendimentoId, ...m }) => m)
        };
    }

    // Busca linhas + medicações com o mesmo filtro e junta tudo.
    static async listarFormatado(filtro) {
        const [linhas, medicacoes] = await Promise.all([
            AtendimentoRepository.listarTodos(filtro),
            AtendimentoRepository.listarMedicacoes(filtro)
        ]);

        const porAtendimento = {};
        for (const m of medicacoes) {
            (porAtendimento[m.atendimentoId] ||= []).push(m);
        }

        return linhas.map(linha =>
            this.formatar(linha, porAtendimento[linha.id] || [])
        );
    }

    // CREATE: abre um atendimento para um paciente já cadastrado
    static async cadastrar(dados) {
        const idPaciente = this.validarId(dados.idPaciente, 'paciente');
        const queixa = this.validarQueixa(dados.queixaPrincipal);

        const id = await executarTransacao(async (conexao) => {

            // Trava o paciente e obtém (ou cria) o prontuário.
            // Lança "Paciente não encontrado." se o ID não existir.
            const idProntuario = await ProntuarioRepository.obterOuCriar(
                idPaciente,
                conexao
            );

            // Um paciente só pode ter um atendimento em aberto
            const aberto = await AtendimentoRepository.buscarAbertoDoPaciente(
                idPaciente,
                conexao
            );

            if (aberto) {
                throw erro(
                    `Este paciente já possui um atendimento em aberto (nº ${aberto}). ` +
                    'Finalize ou cancele o anterior antes de abrir outro.',
                    409
                );
            }

            return await AtendimentoRepository.criar(
                idPaciente,
                idProntuario,
                queixa,
                conexao
            );
        });

        return await this.buscarPorId(id);
    }

    // READ: listar. Filtros opcionais da query string:
    //   status=EM_TRIAGEM,AGUARDANDO_TRIAGEM
    //   paciente=5
    static async listarTodos(query = {}) {
        const statuses = String(query.status ?? '')
            .split(',')
            .map(status => status.trim())
            .filter(Boolean);

        for (const status of statuses) {
            if (!STATUS_VALIDOS.includes(status)) {
                throw erro(`Status inválido: ${status}.`);
            }
        }

        const filtro = { statuses };

        if (query.paciente != null && query.paciente !== '') {
            filtro.idPaciente = this.validarId(query.paciente, 'paciente');
        }

        return await this.listarFormatado(filtro);
    }

    // READ: buscar por ID
    static async buscarPorId(id) {
        const [atendimento] = await this.listarFormatado({ id: Number(id) });
        return atendimento || null;
    }

    // UPDATE: só a queixa principal, e só enquanto aguarda a triagem
    static async atualizar(id, dados) {
        id = this.validarId(id, 'atendimento');

        const existente = await this.buscarPorId(id);
        if (!existente) return null;

        if (existente.status !== 'AGUARDANDO_TRIAGEM') {
            throw erro(
                'Só é possível alterar um atendimento que ainda aguarda a triagem.',
                409
            );
        }

        const queixa = this.validarQueixa(
            dados.queixaPrincipal ?? existente.queixaPrincipal
        );

        await AtendimentoRepository.atualizarQueixa(id, queixa);

        return await this.buscarPorId(id);
    }

    // UPDATE: cancelar
    static async cancelar(id) {
        id = this.validarId(id, 'atendimento');

        const existente = await this.buscarPorId(id);
        if (!existente) return null;

        if (existente.status === 'FINALIZADO') {
            throw erro(
                'Este atendimento já foi concluído e não pode ser cancelado.',
                409
            );
        }

        if (existente.status === 'CANCELADO') {
            throw erro('Este atendimento já foi cancelado.', 409);
        }

        if (
            existente.status === 'AGUARDANDO_ATENDIMENTO_MEDICO' ||
            existente.status === 'EM_ATENDIMENTO_MEDICO'
        ) {
            throw erro(
                'Não é possível cancelar um atendimento que já está na fila ou em consulta médica.',
                409
            );
        }

        await AtendimentoRepository.cancelar(id);

        return await this.buscarPorId(id);
    }

    // TRIAGEM: a enfermagem abre o atendimento (AGUARDANDO_TRIAGEM -> EM_TRIAGEM)
    static async iniciarTriagem(id) {
        id = this.validarId(id, 'atendimento');

        await executarTransacao(async (conexao) => {
            const status = await AtendimentoRepository.bloquearPorId(id, conexao);

            if (!status) throw erro('Atendimento não encontrado.', 404);

            this.bloquearSeEncerrado(status);

            if (STATUS_TRIAGEM_CONCLUIDA.includes(status)) {
                throw erro('A triagem deste atendimento já foi concluída.', 409);
            }

            if (status === 'AGUARDANDO_TRIAGEM') {
                await AtendimentoRepository.atualizarStatus(
                    id,
                    'EM_TRIAGEM',
                    conexao
                );
            }
        });

        return await this.buscarPorId(id);
    }

    // TRIAGEM: grava (ou corrige) sinais vitais e queixas
    static async salvarTriagem(id, dados) {
        id = this.validarId(id, 'atendimento');
        const triagem = this.validarTriagem(dados);

        await executarTransacao(async (conexao) => {
            const status = await AtendimentoRepository.bloquearPorId(id, conexao);

            if (!status) throw erro('Atendimento não encontrado.', 404);

            this.bloquearSeEncerrado(status);

            if (STATUS_TRIAGEM_CONCLUIDA.includes(status)) {
                throw erro(
                    'Não é possível alterar a triagem deste atendimento no estado atual.',
                    409
                );
            }

            await AtendimentoRepository.salvarTriagem(id, triagem, conexao);
            await AtendimentoRepository.atualizarStatus(id, 'EM_TRIAGEM', conexao);
        });

        return await this.buscarPorId(id);
    }

    // TRIAGEM: grava a cor de Manchester e envia o paciente para a fila médica
    static async salvarClassificacao(id, dados) {
        id = this.validarId(id, 'atendimento');

        const cor = String(dados.cor ?? '').trim().toLowerCase();

        if (!cor) {
            throw erro(
                'Selecione a classificação de risco conforme o Protocolo de Manchester.'
            );
        }

        if (!CORES_MANCHESTER.includes(cor)) {
            throw erro(
                'A classificação selecionada não é reconhecida pelo protocolo.'
            );
        }

        await executarTransacao(async (conexao) => {
            const status = await AtendimentoRepository.bloquearPorId(id, conexao);

            if (!status) throw erro('Atendimento não encontrado.', 404);

            this.bloquearSeEncerrado(status);

            if (status === 'EM_ATENDIMENTO_MEDICO') {
                throw erro('Este atendimento já está em consulta médica.', 409);
            }

            if (!(await AtendimentoRepository.existeTriagem(id, conexao))) {
                throw erro(
                    'Registre os sinais vitais e as queixas antes de classificar o risco.',
                    409
                );
            }

            await AtendimentoRepository.salvarClassificacao(id, cor, conexao);
            await AtendimentoRepository.atualizarStatus(
                id,
                'AGUARDANDO_ATENDIMENTO_MEDICO',
                conexao
            );
        });

        return await this.buscarPorId(id);
    }

    // MÉDICO: abre (ou retoma) a consulta.
    // AGUARDANDO_ATENDIMENTO_MEDICO -> EM_ATENDIMENTO_MEDICO
    static async iniciarConsulta(id, dados = {}) {
        id = this.validarId(id, 'atendimento');

        const medico = nomeProfissional(dados.medico);
        const medicoEmail = nomeProfissional(dados.medicoEmail);

        await executarTransacao(async (conexao) => {
            const status = await AtendimentoRepository.bloquearPorId(id, conexao);

            if (!status) throw erro('Atendimento não encontrado.', 404);

            this.bloquearSeEncerrado(status);

            if (
                status !== 'AGUARDANDO_ATENDIMENTO_MEDICO' &&
                status !== 'EM_ATENDIMENTO_MEDICO'
            ) {
                throw erro(
                    'Este paciente ainda não está disponível na fila médica.',
                    409
                );
            }

            const consulta = await AtendimentoRepository.buscarConsulta(id, conexao);

            if (!consulta) {
                if (!medico) {
                    throw erro('Informe o médico responsável pela consulta.');
                }

                await AtendimentoRepository.criarConsulta(
                    id,
                    medico,
                    medicoEmail,
                    conexao
                );
            }

            if (status === 'AGUARDANDO_ATENDIMENTO_MEDICO') {
                await AtendimentoRepository.atualizarStatus(
                    id,
                    'EM_ATENDIMENTO_MEDICO',
                    conexao
                );
            }
        });

        return await this.buscarPorId(id);
    }

    // MÉDICO: grava as anotações da consulta
    static async salvarConsulta(id, dados = {}) {
        id = this.validarId(id, 'atendimento');
        const anotacoes = this.validarAnotacoes(dados.anotacoes);

        await executarTransacao(async (conexao) => {
            await this.exigirEmConsulta(
                id,
                conexao,
                'Abra o atendimento médico antes de registrar a conduta.'
            );

            await AtendimentoRepository.salvarAnotacoes(id, anotacoes, conexao);
            await AtendimentoRepository.atualizarStatus(
                id,
                'EM_ATENDIMENTO_MEDICO',
                conexao
            );
        });

        return await this.buscarPorId(id);
    }

    // MÉDICO: prescreve uma medicação
    static async adicionarMedicacao(id, dados = {}) {
        id = this.validarId(id, 'atendimento');
        const medicacao = this.validarMedicacao(dados);

        await executarTransacao(async (conexao) => {
            const consulta = await this.exigirEmConsulta(
                id,
                conexao,
                'Só é possível prescrever medicação em um atendimento médico aberto.'
            );

            await AtendimentoRepository.adicionarMedicacao(
                consulta.id,
                medicacao,
                conexao
            );
        });

        return await this.buscarPorId(id);
    }

    // MÉDICO: remove uma medicação prescrita
    static async removerMedicacao(id, idMedicacao) {
        id = this.validarId(id, 'atendimento');
        idMedicacao = this.validarId(idMedicacao, 'medicação');

        await executarTransacao(async (conexao) => {
            const consulta = await this.exigirEmConsulta(
                id,
                conexao,
                'Não é possível alterar medicações de um atendimento encerrado.'
            );

            const removida = await AtendimentoRepository.removerMedicacao(
                consulta.id,
                idMedicacao,
                conexao
            );

            if (!removida) throw erro('Medicação não encontrada.', 404);
        });

        return await this.buscarPorId(id);
    }

    // MÉDICO: confirma a consulta e encerra o atendimento.
    // Se vierem "anotacoes" no corpo, grava antes de encerrar.
    static async finalizar(id, dados = {}) {
        id = this.validarId(id, 'atendimento');

        const novasAnotacoes =
            dados.anotacoes != null ? this.validarAnotacoes(dados.anotacoes) : null;

        await executarTransacao(async (conexao) => {
            const consulta = await this.exigirEmConsulta(
                id,
                conexao,
                'Inicie o atendimento médico antes de confirmá-lo.'
            );

            if (novasAnotacoes) {
                await AtendimentoRepository.salvarAnotacoes(
                    id,
                    novasAnotacoes,
                    conexao
                );
            } else {
                // Garante que já existem anotações válidas gravadas
                try {
                    this.validarAnotacoes(consulta.anotacoes);
                } catch (e) {
                    throw erro(
                        'Registre as anotações da consulta antes de finalizar.',
                        409
                    );
                }
            }

            await AtendimentoRepository.finalizar(id, conexao);
        });

        return await this.buscarPorId(id);
    }

    // DELETE
    static async excluir(id) {
        id = this.validarId(id, 'atendimento');

        return await AtendimentoRepository.excluir(id);
    }
}

module.exports = Atendimento;