const { executarTransacao } = require('../config/database');
const ProntuarioRepository = require('../repositories/ProntuarioRepository');
const AtendimentoRepository = require('../repositories/AtendimentoRepository');

const TAMANHO_MAXIMO_QUEIXA = 200;

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

    // Converte a linha do banco no formato que o frontend usa,
    // com os dados do paciente dentro de "paciente".
    static formatar(linha) {
        if (!linha) return null;

        const {
            pacienteNome,
            pacienteCpf,
            pacienteDataNascimento,
            ...atendimento
        } = linha;

        return {
            ...atendimento,
            paciente: {
                id: atendimento.pacienteId,
                nome: pacienteNome,
                cpf: pacienteCpf,
                dataNascimento: pacienteDataNascimento
            }
        };
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

    // READ: listar todos
    static async listarTodos() {
        const linhas = await AtendimentoRepository.listarTodos();
        return linhas.map(linha => this.formatar(linha));
    }

    // READ: buscar por ID
    static async buscarPorId(id) {
        const linha = await AtendimentoRepository.buscarPorId(Number(id));
        return this.formatar(linha);
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

    // DELETE
    static async excluir(id) {
        id = this.validarId(id, 'atendimento');

        return await AtendimentoRepository.excluir(id);
    }
}

module.exports = Atendimento;