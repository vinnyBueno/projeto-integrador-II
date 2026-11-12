/**
 * Cliente da API do backend (fetch).
 * Usado pela tela de recepção no lugar da simulação em localStorage (js/api.js).
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

  // Atendimento do backend -> formato da tela (com prioridade pela espera)
  function atendimentoDoServidor(a) {
    if (!a) return null;
    const espera = a.tempoEsperaMin || 0;
    return Object.assign({}, a, {
      paciente: Object.assign({}, a.paciente, {
        cpf: formatarCpf(a.paciente && a.paciente.cpf),
      }),
      prioridadeRecepcao:
        espera >= 30 ? "Alta" : espera >= 15 ? "Média" : "Baixa",
    });
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

  global.MedFlowRemoto = {
    buscarPacientePorCpf: buscarPacientePorCpf,
    buscarPacientePorId: buscarPacientePorId,
    salvarPacienteEAbrirAtendimento: salvarPacienteEAbrirAtendimento,
    alterarAtendimento: alterarAtendimento,
    cancelarAtendimento: cancelarAtendimento,
    listarAtendimentosRecepcao: listarAtendimentosRecepcao,
    obterPorNumero: obterPorNumero,
  };
})(window);