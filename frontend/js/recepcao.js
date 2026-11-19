(function () {
  const sessao = MedFlowSessao.exigir(["recepcao"]);
  if (!sessao) return;

  const ui = MedFlowUI;
  // Dados da recepção vêm do backend (Oracle) pelo cliente da API.
  const api = MedFlowRemoto;
  const validar = MedFlowValidacao;

  ui.montarChrome("inicio", sessao);

  const form = document.getElementById("form-recepcao");
  const abaNovo = document.getElementById("aba-novo");
  const abaLista = document.getElementById("aba-lista");
  const lista = document.getElementById("lista-recepcao");
  const busca = document.getElementById("busca-global");
  let termo = "";
  let editandoId = null;
  // Última lista recebida do servidor; a busca filtra aqui, sem nova consulta.
  let atendimentos = [];

  document.querySelectorAll(".tab").forEach(function (botao) {
    botao.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (t) {
        t.classList.toggle("ativo", t === botao);
      });
      const aba = botao.getAttribute("data-aba");
      abaNovo.classList.toggle("hidden", aba !== "novo");
      abaLista.classList.toggle("hidden", aba !== "lista");
      if (aba === "lista") carregarLista();
    });
  });

  document.getElementById("btn-buscar").addEventListener("click", buscarCpf);
  document.getElementById("cpf").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      buscarCpf();
    }
  });

  document.getElementById("cpf").addEventListener("input", function () {
    const r = validar.cpf(this.value);
    if (r.ok) this.value = r.valor;
  });

  document.getElementById("telefone").addEventListener("input", function () {
    const r = validar.telefone(this.value);
    if (r.ok) this.value = r.valor;
  });

  document
    .getElementById("telefoneEmergencia")
    .addEventListener("input", function () {
      const resultado = validar.telefone(this.value);
      if (resultado.ok) this.value = resultado.valor;
    });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const paciente = validar.paciente({
      nome: document.getElementById("nome").value,
      cpf: document.getElementById("cpf").value,
      dataNascimento: document.getElementById("dataNascimento").value,
      sexo: document.getElementById("sexo").value,
      telefone: document.getElementById("telefone").value,
      telefoneEmergencia: document.getElementById("telefoneEmergencia").value,
      convenio: document.getElementById("convenio").value,
      rg: document.getElementById("rg").value,
      nomePai: document.getElementById("nomePai").value,
      nomeMae: document.getElementById("nomeMae").value,
      cep: document.getElementById("cep").value,
      logradouro: document.getElementById("logradouro").value,
      numeroEndereco: document.getElementById("numeroEndereco").value,
      complemento: document.getElementById("complemento").value,
      bairro: document.getElementById("bairro").value,
      cidade: document.getElementById("cidade").value,
      uf: document.getElementById("uf").value,
    });
    const atendimento = validar.atendimentoRecepcao({
      queixaPrincipal: "",
    });
    const erros = Object.assign({}, paciente.erros, atendimento.erros);
    ui.limparErros([
      "nome",
      "cpf",
      "dataNascimento",
      "sexo",
      "telefone",
      "telefoneEmergencia",
      "convenio",
      "rg",
      "nomePai",
      "nomeMae",
      "cep",
      "logradouro",
      "numeroEndereco",
      "complemento",
      "bairro",
      "cidade",
      "uf",
      "queixaPrincipal",
    ]);
    Object.keys(erros).forEach(function (campo) {
      ui.marcarCampo(campo, erros[campo]);
    });
    if (!paciente.ok || !atendimento.ok) {
      ui.toast("Corrija os campos destacados antes de continuar.", "erro");
      return;
    }

    // Evita envio duplo enquanto o servidor responde.
    const botaoEnviar = form.querySelector('button[type="submit"]');
    botaoEnviar.disabled = true;
    try {
      if (editandoId) {
        await api.alterarAtendimento(
          editandoId,
          atendimento.dados,
          paciente.dados,
        );
        ui.toast("Atendimento atualizado.", "ok");
        editandoId = null;
      } else {
        const criado = await api.salvarPacienteEAbrirAtendimento(
          paciente.dados,
          atendimento.dados,
        );
        ui.toast(
          "Atendimento nº " +
            criado.numero +
            " gerado. Paciente encaminhado à triagem.",
          "ok",
        );
      }
      form.reset();
    } catch (erro) {
      ui.toast(erro.message, "erro");
    } finally {
      botaoEnviar.disabled = false;
    }
  });

  document
    .getElementById("btn-atualizar")
    .addEventListener("click", async function () {
      if (await carregarLista()) ui.toast("Lista atualizada.", "ok");
    });

  if (busca) {
    busca.addEventListener("input", function () {
      termo = busca.value.trim().toLowerCase();
      if (!abaLista.classList.contains("hidden")) renderLista();
    });
  }

  lista.addEventListener("click", async function (e) {
    const alterar = e.target.closest("[data-alterar]");
    const cancelar = e.target.closest("[data-cancelar]");
    if (alterar) {
      try {
        const item = await api.obterPorNumero(
          alterar.getAttribute("data-alterar"),
        );
        if (!item) return;
        const paciente = await api.buscarPacientePorId(item.pacienteId);
        if (!paciente) return;
        preencher(paciente);
        editandoId = item.id;
        document.querySelector('[data-aba="novo"]').click();
        ui.toast("Confira os dados do paciente e salve.", "ok");
      } catch (erro) {
        ui.toast(erro.message, "erro");
      }
    }
    if (cancelar) {
      try {
        await api.cancelarAtendimento(
          Number(cancelar.getAttribute("data-cancelar")),
        );
        ui.toast("Atendimento cancelado.", "ok");
        await carregarLista();
      } catch (erro) {
        ui.toast(erro.message, "erro");
      }
    }
  });

  async function buscarCpf() {
    const doc = validar.cpf(document.getElementById("cpf").value);
    ui.marcarCampo("cpf", doc.ok ? "" : doc.mensagem);
    if (!doc.ok) return;
    try {
      const paciente = await api.buscarPacientePorCpf(doc.valor);
      if (!paciente) {
        ui.toast(
          "Paciente não encontrado. Preencha o cadastro para incluir.",
          "info",
        );
        return;
      }
      preencher(paciente);
      ui.toast(
        "Paciente localizado. Confira os dados e abra o atendimento.",
        "ok",
      );
    } catch (erro) {
      ui.toast(erro.message, "erro");
    }
  }

  function preencher(paciente) {
    document.getElementById("cpf").value = paciente.cpf;
    document.getElementById("nome").value = paciente.nome;
    document.getElementById("dataNascimento").value = paciente.dataNascimento;
    document.getElementById("sexo").value = paciente.sexo;
    document.getElementById("telefone").value = paciente.telefone;
    document.getElementById("telefoneEmergencia").value =
      paciente.telefoneEmergencia || "";
    document.getElementById("convenio").value = paciente.convenio;
    document.getElementById("rg").value = paciente.rg || "";
    document.getElementById("nomePai").value = paciente.nomePai || "";
    document.getElementById("nomeMae").value = paciente.nomeMae || "";
    document.getElementById("cep").value = paciente.cep || "";
    document.getElementById("logradouro").value = paciente.logradouro || "";
    document.getElementById("numeroEndereco").value =
      paciente.numeroEndereco || "";
    document.getElementById("complemento").value = paciente.complemento || "";
    document.getElementById("bairro").value = paciente.bairro || "";
    document.getElementById("cidade").value = paciente.cidade || "";
    document.getElementById("uf").value = paciente.uf || "";
  }

  function acoes(item) {
    if (item.status === "FINALIZADO" || item.status === "CANCELADO") {
      return "<small>Sem ações</small>";
    }
    if (item.status === "AGUARDANDO_TRIAGEM") {
      return (
        '<button class="ghost" type="button" data-alterar="' +
        item.numero +
        '">Alterar</button>' +
        '<button class="danger" type="button" data-cancelar="' +
        item.id +
        '">Cancelar</button>'
      );
    }
    return "<small>Em andamento</small>";
  }

  // Busca a lista no servidor e desenha a tabela.
  // Devolve true se deu certo.
  async function carregarLista() {
    try {
      atendimentos = await api.listarAtendimentosRecepcao();
    } catch (erro) {
      lista.innerHTML =
        '<tr><td colspan="5"><div class="empty">' +
        ui.esc(erro.message) +
        "</div></td></tr>";
      return false;
    }
    renderLista();
    return true;
  }

  // Desenha a tabela a partir da última lista recebida, aplicando a busca.
  function renderLista() {
    const fonte = atendimentos.filter(function (item) {
      if (!termo) return true;
      const blob = (
        item.paciente.nome +
        " " +
        item.paciente.cpf +
        " " +
        item.numero +
        " " +
        (item.queixaPrincipal || "")
      ).toLowerCase();
      return blob.indexOf(termo) !== -1;
    });
    if (!fonte.length) {
      lista.innerHTML =
        '<tr><td colspan="5"><div class="empty">Nenhum atendimento encontrado.</div></td></tr>';
      return;
    }
    lista.innerHTML = fonte
      .map(function (item) {
        return (
          "<tr>" +
          "<td>" +
          ui.esc(item.numero) +
          "</td>" +
          "<td>" +
          ui.esc(item.paciente.nome) +
          "</td>" +
          "<td>" +
          ui.esc(item.paciente.cpf) +
          "</td>" +
          "<td>" +
          ui.esc(ui.rotuloStatus(item.status)) +
          "</td>" +
          '<td><div class="actions">' +
          acoes(item) +
          "</div></td>" +
          "</tr>"
        );
      })
      .join("");
  }
})();