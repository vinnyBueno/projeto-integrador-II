/**
 * Cliente da API do backend (fetch).
 * Usado por todas as telas para ler e gravar dados no backend.
 * Todas as funções são assíncronas: use sempre com await.
 */
(function (global) {
  // Endereço do backend. Se mudar a porta no .env, mude aqui também.
  const BASE_URL = "http://localhost:3000/api";

  const validar = global.MedFlowValidacao;

  // Faz a requisição e devolve o JSON. Em caso de erro, lança um Error
  // com a mensagem que o backend enviou (campo "erro").
  async function requisitar(metodo, caminho, corpo) {
    let resposta;
    try {
      resposta = await fetch(BASE_URL + caminho, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      });
    } catch (e) {
      throw new Error(
        "Não foi possível conectar ao servidor. Confira se o backend está rodando.",
      );
    }

    let dados = null;
    try {
      dados = await resposta.json();
    } catch (e) {
      dados = null;
    }

    if (!resposta.ok) {
      const erro = new Error(
        (dados && dados.erro) ||
          "Erro inesperado no servidor (" + resposta.status + ").",
      );
      erro.status = resposta.status;
      throw erro;
    }
    return dados;
  }

  // ---- Formatação: o backend guarda só números; a tela mostra com máscara ----

  function formatarCpf(valor) {
    if (!valor) return "";
    const r = validar.cpf(valor);
    return r.ok ? r.valor : valor;
  }

  function formatarTelefone(valor) {
    if (!valor) return "";
    const r = validar.telefone(valor);
    return r.ok ? r.valor : valor;
  }

  function formatarCep(valor) {
    const d = String(valor || "").replace(/\D/g, "");
    return d.length === 8 ? d.slice(0, 5) + "-" + d.slice(5) : valor || "";
  }

  // Paciente do backend -> formato que a tela usa (genero vira sexo)
  function pacienteDoServidor(p) {
    if (!p) return null;
    return {
      id: p.id,
      nome: p.nome || "",
      cpf: formatarCpf(p.cpf),
      dataNascimento: p.dataNascimento || "",
      sexo: p.genero || "",
      telefone: formatarTelefone(p.telefone),
      telefoneEmergencia: formatarTelefone(p.telefoneEmergencia),
      convenio: p.convenio || "",
      rg: p.rg || "",
      nomePai: p.nomePai || "",
      nomeMae: p.nomeMae || "",
      cep: formatarCep(p.cep),
      logradouro: p.logradouro || "",
      numeroEndereco: p.numeroEndereco || "",
      complemento: p.complemento || "",
      bairro: p.bairro || "",
      cidade: p.cidade || "",
      uf: p.uf || "",
    };
  }

  // Paciente da tela -> formato do backend (sexo vira genero)
  function pacienteParaServidor(d) {
    return {
      nome: d.nome,
      cpf: d.cpf,
      rg: d.rg,
      genero: d.sexo,
      dataNascimento: d.dataNascimento,
      telefone: d.telefone,
      telefoneEmergencia: d.telefoneEmergencia,
      convenio: d.convenio,
      nomePai: d.nomePai,
      nomeMae: d.nomeMae,
      cep: d.cep,
      logradouro: d.logradouro,
      numeroEndereco: d.numeroEndereco,
      complemento: d.complemento,
      bairro: d.bairro,
      cidade: d.cidade,
      uf: d.uf,
    };
  }

  // Constantes compartilhadas (definidas em js/api.js).
  const STATUS = global.MedFlowAPI.STATUS;
  const MANCHESTER = global.MedFlowAPI.MANCHESTER;
  const idadeDe = global.MedFlowAPI.idadeDe;

  function protocoloDaCor(cor) {
    return (
      MANCHESTER.filter(function (m) {
        return m.cor === cor;
      })[0] || null
    );
  }

  // Protocolo efetivo: se o paciente passou do prazo da cor, sobe de prioridade.
  function protocoloComEspera(cor, espera) {
    const protocolo = protocoloDaCor(cor);
    if (!protocolo) return null;
    const limite = { laranja: 10, amarelo: 60, verde: 120, azul: 240 }[
      protocolo.cor
    ];
    if (limite && espera >= limite) {
      return MANCHESTER[
        Math.max(0, protocolo.ordem - 1 - Math.floor(espera / limite))
      ];
    }
    return protocolo;
  }

  // Atendimento do backend -> formato da tela (com prioridade pela espera,
  // idade do paciente e dados do Protocolo de Manchester).
  function atendimentoDoServidor(a) {
    if (!a) return null;
    const espera = a.tempoEsperaMin || 0;
    const p = a.paciente || {};
    const classificacao = a.classificacao
      ? Object.assign({}, protocoloDaCor(a.classificacao.cor), a.classificacao)
      : null;
    return Object.assign({}, a, {
      paciente: Object.assign({}, p, {
        cpf: formatarCpf(p.cpf),
        sexo: p.genero || "",
        idade: idadeDe(p.dataNascimento),
        telefone: formatarTelefone(p.telefone),
        telefoneEmergencia: formatarTelefone(p.telefoneEmergencia),
        convenio: p.convenio || "",
      }),
      prioridadeRecepcao:
        espera >= 30 ? "Alta" : espera >= 15 ? "Média" : "Baixa",
      classificacao: classificacao,
      protocolo: classificacao
        ? protocoloComEspera(classificacao.cor, espera)
        : null,
      medicacoes: a.medicacoes || [],
    });
  }

  function porCriacao(a, b) {
    return new Date(a.criadoEm) - new Date(b.criadoEm);
  }

  // Quando o backend responde 404, devolve null em vez de lançar erro.
  async function ou404(promessa) {
    try {
      return await promessa;
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  // ---- Pacientes ----

  async function buscarPacientePorCpf(cpf) {
    const digitos = String(cpf || "").replace(/\D/g, "");
    const p = await ou404(requisitar("GET", "/pacientes/cpf/" + digitos));
    return pacienteDoServidor(p);
  }

  async function buscarPacientePorId(id) {
    const p = await ou404(requisitar("GET", "/pacientes/buscar/" + id));
    return pacienteDoServidor(p);
  }

  // ---- Atendimentos ----

  // Cadastra (ou atualiza) o paciente e abre o atendimento.
  async function salvarPacienteEAbrirAtendimento(dadosPaciente, dadosAtendimento) {
    const corpo = pacienteParaServidor(dadosPaciente);
    const existente = await buscarPacientePorCpf(dadosPaciente.cpf);

    let idPaciente;
    if (existente) {
      await requisitar("PUT", "/pacientes/atualizar/" + existente.id, corpo);
      idPaciente = existente.id;
    } else {
      const criado = await requisitar("POST", "/pacientes/cadastrar", corpo);
      idPaciente = criado.paciente.id;
    }

    const resposta = await requisitar("POST", "/atendimentos/cadastrar", {
      idPaciente: idPaciente,
      queixaPrincipal: dadosAtendimento.queixaPrincipal,
    });
    return atendimentoDoServidor(resposta.atendimento);
  }

  // Altera a queixa do atendimento e, se vier, os dados do paciente.
  async function alterarAtendimento(atendimentoId, dadosAtendimento, dadosPaciente) {
    const resposta = await requisitar(
      "PUT",
      "/atendimentos/atualizar/" + atendimentoId,
      { queixaPrincipal: dadosAtendimento.queixaPrincipal },
    );

    if (dadosPaciente) {
      await requisitar(
        "PUT",
        "/pacientes/atualizar/" + resposta.atendimento.pacienteId,
        pacienteParaServidor(dadosPaciente),
      );
    }
    return atendimentoDoServidor(resposta.atendimento);
  }

  async function cancelarAtendimento(atendimentoId) {
    const resposta = await requisitar(
      "PUT",
      "/atendimentos/cancelar/" + atendimentoId,
    );
    return atendimentoDoServidor(resposta.atendimento);
  }

  async function listarAtendimentosRecepcao() {
    const lista = await requisitar("GET", "/atendimentos/listar");
    return lista.map(atendimentoDoServidor);
  }

  // O número do atendimento é o próprio ID no banco.
  async function obterPorNumero(numero) {
    const a = await ou404(requisitar("GET", "/atendimentos/buscar/" + numero));
    return atendimentoDoServidor(a);
  }

  // Lista atendimentos nos status informados (lista vazia = todos).
  async function listarPorStatus(statuses) {
    const filtro = statuses.length
      ? "?status=" + encodeURIComponent(statuses.join(","))
      : "";
    const lista = await requisitar("GET", "/atendimentos/listar" + filtro);
    return lista.map(atendimentoDoServidor);
  }

  // ---- Triagem (enfermagem) ----

  async function listarParaTriagem() {
    const lista = await listarPorStatus([
      STATUS.AGUARDANDO_TRIAGEM,
      STATUS.EM_TRIAGEM,
    ]);
    return lista.sort(porCriacao);
  }

  // Ações que respondem { mensagem, atendimento }: devolve só o atendimento.
  async function acao(metodo, caminho, corpo) {
    const resposta = await requisitar(metodo, caminho, corpo);
    return atendimentoDoServidor(resposta.atendimento);
  }

  function iniciarTriagem(atendimentoId) {
    return acao("PUT", "/atendimentos/iniciar-triagem/" + atendimentoId);
  }

  function salvarTriagem(atendimentoId, dados) {
    const usuario = global.MedFlowSessao && global.MedFlowSessao.obter();
    return acao(
      "PUT",
      "/atendimentos/triagem/" + atendimentoId,
      Object.assign({}, dados, { enfermeira: usuario ? usuario.nome : null }),
    );
  }

  function salvarClassificacao(atendimentoId, cor) {
    return acao("PUT", "/atendimentos/classificacao/" + atendimentoId, {
      cor: cor,
    });
  }

  // ---- Fila e consulta médica ----

  async function listarFilaMedica() {
    const lista = await listarPorStatus([
      STATUS.AGUARDANDO_ATENDIMENTO_MEDICO,
      STATUS.EM_ATENDIMENTO_MEDICO,
    ]);
    return lista.sort(function (a, b) {
      const ordemA = a.protocolo ? a.protocolo.ordem : 99;
      const ordemB = b.protocolo ? b.protocolo.ordem : 99;
      if (ordemA !== ordemB) return ordemA - ordemB;
      return porCriacao(a, b);
    });
  }

  function iniciarAtendimentoMedico(atendimentoId) {
    const usuario = global.MedFlowSessao && global.MedFlowSessao.obter();
    if (!usuario) {
      return Promise.reject(
        new Error("Entre novamente para registrar o atendimento."),
      );
    }
    return acao("PUT", "/atendimentos/iniciar-consulta/" + atendimentoId, {
      medico: usuario.nome,
      medicoEmail: usuario.email,
    });
  }

  function salvarConsultaMedica(atendimentoId, anotacoes) {
    return acao("PUT", "/atendimentos/consulta/" + atendimentoId, {
      anotacoes: anotacoes,
    });
  }

  function adicionarMedicacao(atendimentoId, dados) {
    return acao("POST", "/atendimentos/medicacoes/" + atendimentoId, dados);
  }

  function removerMedicacao(atendimentoId, medicacaoId) {
    return acao(
      "DELETE",
      "/atendimentos/medicacoes/" + atendimentoId + "/" + medicacaoId,
    );
  }

  // Grava as anotações (se vierem) e encerra o atendimento.
  function confirmarAtendimentoMedico(atendimentoId, anotacoes) {
    return acao("PUT", "/atendimentos/finalizar/" + atendimentoId, {
      anotacoes: anotacoes,
    });
  }

  // ---- Histórico e prontuário ----

  async function listarHistorico() {
    const lista = await listarPorStatus([STATUS.FINALIZADO, STATUS.CANCELADO]);
    return lista.sort(function (a, b) {
      return (
        new Date(b.atualizadoEm || b.criadoEm) -
        new Date(a.atualizadoEm || a.criadoEm)
      );
    });
  }

  async function listarDoPaciente(pacienteId) {
    const lista = await requisitar(
      "GET",
      "/atendimentos/listar?paciente=" + encodeURIComponent(pacienteId),
    );
    return lista.map(atendimentoDoServidor);
  }

  global.MedFlowRemoto = {
    STATUS: STATUS,
    MANCHESTER: MANCHESTER,
    listarParaTriagem: listarParaTriagem,
    iniciarTriagem: iniciarTriagem,
    salvarTriagem: salvarTriagem,
    salvarClassificacao: salvarClassificacao,
    listarFilaMedica: listarFilaMedica,
    iniciarAtendimentoMedico: iniciarAtendimentoMedico,
    salvarConsultaMedica: salvarConsultaMedica,
    adicionarMedicacao: adicionarMedicacao,
    removerMedicacao: removerMedicacao,
    confirmarAtendimentoMedico: confirmarAtendimentoMedico,
    listarHistorico: listarHistorico,
    listarDoPaciente: listarDoPaciente,
    buscarPacientePorCpf: buscarPacientePorCpf,
    buscarPacientePorId: buscarPacientePorId,
    salvarPacienteEAbrirAtendimento: salvarPacienteEAbrirAtendimento,
    alterarAtendimento: alterarAtendimento,
    cancelarAtendimento: cancelarAtendimento,
    listarAtendimentosRecepcao: listarAtendimentosRecepcao,
    obterPorNumero: obterPorNumero,
  };
})(window);