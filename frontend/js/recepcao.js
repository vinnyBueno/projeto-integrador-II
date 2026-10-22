(function () {
  const sessao = MedFlowSessao.exigir(["recepcao"]);
  if (!sessao) return;

  const ui = MedFlowUI;
  const api = MedFlowAPI;
  const validar = MedFlowValidacao;

  ui.montarChrome("inicio", sessao);

  const form = document.getElementById("form-recepcao");
  const abaNovo = document.getElementById("aba-novo");
  const abaLista = document.getElementById("aba-lista");
  const lista = document.getElementById("lista-recepcao");
  const busca = document.getElementById("busca-global");
  let termo = "";
  let editandoId = null;

  document.querySelectorAll(".tab").forEach(function (botao) {
    botao.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (t) {
        t.classList.toggle("ativo", t === botao);
      });
      const aba = botao.getAttribute("data-aba");
      abaNovo.classList.toggle("hidden", aba !== "novo");
      abaLista.classList.toggle("hidden", aba !== "lista");
      if (aba === "lista") renderLista();
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

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const paciente = validar.paciente({
      nome: document.getElementById("nome").value,
      cpf: document.getElementById("cpf").value,
      dataNascimento: document.getElementById("dataNascimento").value,
      sexo: document.getElementById("sexo").value,
      telefone: document.getElementById("telefone").value,
      convenio: document.getElementById("convenio").value,
    });
    const atendimento = validar.atendimentoRecepcao({
      queixaPrincipal: "",
      prioridadeRecepcao: document.getElementById("prioridadeRecepcao").value,
    });
    const erros = Object.assign({}, paciente.erros, atendimento.erros);
    ui.limparErros(["nome", "cpf", "dataNascimento", "sexo", "telefone", "convenio", "queixaPrincipal", "prioridadeRecepcao"]);
    Object.keys(erros).forEach(function (campo) { ui.marcarCampo(campo, erros[campo]); });
    if (!paciente.ok || !atendimento.ok) {
      ui.toast("Corrija os campos destacados antes de continuar.", "erro");
      return;
    }
    try {
      if (editandoId) {
        api.alterarAtendimento(editandoId, atendimento.dados, paciente.dados);
        ui.toast("Atendimento atualizado.", "ok");
        editandoId = null;
      } else {
        const criado = api.salvarPacienteEAbrirAtendimento(paciente.dados, atendimento.dados);
        ui.toast("Atendimento nº " + criado.numero + " gerado. Paciente encaminhado à triagem.", "ok");
      }
      form.reset();
    } catch (erro) {
      ui.toast(erro.message, "erro");
    }
  });

  document.getElementById("btn-reset").addEventListener("click", function () {
    if (!window.confirm("Excluir todos os pacientes e atendimentos? Esta ação não pode ser desfeita.")) return;
    api.excluirDados();
    form.reset();
    ui.toast("Dados de demonstração restaurados.", "ok");
  });

  document.getElementById("btn-atualizar").addEventListener("click", function () {
    renderLista();
    ui.toast("Lista atualizada.", "ok");
  });

  if (busca) {
    busca.addEventListener("input", function () {
      termo = busca.value.trim().toLowerCase();
      if (!abaLista.classList.contains("hidden")) renderLista();
    });
  }

  lista.addEventListener("click", function (e) {
    const alterar = e.target.closest("[data-alterar]");
    const cancelar = e.target.closest("[data-cancelar]");
    if (alterar) {
      const item = api.obterPorNumero(alterar.getAttribute("data-alterar"));
      if (!item) return;
      preencher(item.paciente);
      document.getElementById("prioridadeRecepcao").value = item.prioridadeRecepcao;
      editandoId = item.id;
      document.querySelector('[data-aba="novo"]').click();
      ui.toast("Confira os dados do paciente e salve.", "ok");
    }
    if (cancelar) {
      try {
        api.cancelarAtendimento(Number(cancelar.getAttribute("data-cancelar")));
        ui.toast("Atendimento cancelado.", "ok");
        renderLista();
      } catch (erro) {
        ui.toast(erro.message, "erro");
      }
    }
  });

  function buscarCpf() {
    const doc = validar.cpf(document.getElementById("cpf").value);
    ui.marcarCampo("cpf", doc.ok ? "" : doc.mensagem);
    if (!doc.ok) return;
    const paciente = api.buscarPacientePorCpf(doc.valor);
    if (!paciente) {
      ui.toast("Paciente não encontrado. Preencha o cadastro para incluir.", "info");
      return;
    }
    preencher(paciente);
    ui.toast("Paciente localizado. Confira os dados e abra o atendimento.", "ok");
  }

  function preencher(paciente) {
    document.getElementById("cpf").value = paciente.cpf;
    document.getElementById("nome").value = paciente.nome;
    document.getElementById("dataNascimento").value = paciente.dataNascimento;
    document.getElementById("sexo").value = paciente.sexo;
    document.getElementById("telefone").value = paciente.telefone;
    document.getElementById("convenio").value = paciente.convenio;
  }

  function acoes(item) {
    if (item.status === "FINALIZADO" || item.status === "CANCELADO") {
      return "<small>Sem ações</small>";
    }
    if (item.status === "AGUARDANDO_TRIAGEM") {
      return '<button class="ghost" type="button" data-alterar="' + item.numero + '">Alterar</button>' +
        '<button class="danger" type="button" data-cancelar="' + item.id + '">Cancelar</button>';
    }
    return "<small>Em andamento</small>";
  }

  function renderLista() {
    const fonte = api.listarAtendimentosRecepcao().filter(function (item) {
      if (!termo) return true;
      const blob = (item.paciente.nome + " " + item.paciente.cpf + " " + item.numero + " " + item.queixaPrincipal).toLowerCase();
      return blob.indexOf(termo) !== -1;
    });
    if (!fonte.length) {
      lista.innerHTML = '<tr><td colspan="6"><div class="empty">Nenhum atendimento encontrado.</div></td></tr>';
      return;
    }
    lista.innerHTML = fonte.map(function (item) {
      return "<tr>" +
        "<td>" + ui.esc(item.numero) + "</td>" +
        "<td>" + ui.esc(item.paciente.nome) + "</td>" +
        "<td>" + ui.esc(item.paciente.cpf) + "</td>" +
        
        "<td>" + ui.esc(ui.rotuloStatus(item.status)) + "</td>" +
        '<td><div class="actions">' + acoes(item) + "</div></td>" +
      "</tr>";
    }).join("");
  }
})();
