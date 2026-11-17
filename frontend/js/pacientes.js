(function () {
  const sessao = MedFlowSessao.exigir(["enfermagem"]);
  if (!sessao) return;

  const ui = MedFlowUI;
  // Dados vêm do backend (Oracle) pelo cliente da API.
  const api = MedFlowRemoto;

  let aba = "fila";
  let termo = "";
  let prioridade = "";
  // Últimas listas recebidas do servidor; filtros e busca usam estas.
  let fila = [];
  let medico = [];

  ui.montarChrome("inicio", sessao);

  const busca = document.getElementById("busca-global");
  const lista = document.getElementById("lista-pacientes");
  const filtros = document.getElementById("filtros");

  document.querySelectorAll(".tab").forEach(function (botao) {
    botao.addEventListener("click", function () {
      aba = botao.getAttribute("data-aba");
      document.querySelectorAll(".tab").forEach(function (t) {
        t.classList.toggle("ativo", t === botao);
      });
      render();
    });
  });

  busca.addEventListener("input", function () {
    termo = busca.value.trim().toLowerCase();
    render();
  });

  document.getElementById("btn-filtros").addEventListener("click", function () {
    filtros.classList.toggle("open");
  });

  document
    .getElementById("filtro-prio")
    .addEventListener("change", function (e) {
      prioridade = e.target.value;
      render();
    });

  document
    .getElementById("btn-atualizar")
    .addEventListener("click", async function () {
      if (await carregar()) ui.toast("Lista atualizada.", "ok");
    });

  // Busca as duas listas no servidor e redesenha. Devolve true se deu certo.
  async function carregar() {
    try {
      const resultado = await Promise.all([
        api.listarParaTriagem(),
        api.listarFilaMedica(),
      ]);
      fila = resultado[0];
      medico = resultado[1];
    } catch (erro) {
      lista.innerHTML =
        '<tr><td colspan="7"><div class="empty">' +
        ui.esc(erro.message) +
        "</div></td></tr>";
      return false;
    }
    render();
    return true;
  }

  function corresponde(item) {
    if (
      prioridade &&
      (aba === "medico" ? item.protocolo.cor : item.prioridadeRecepcao) !==
        prioridade
    )
      return false;
    if (!termo) return true;
    const blob = (
      item.paciente.nome +
      " " +
      item.paciente.cpf +
      " " +
      item.numero +
      " " +
      item.queixaPrincipal
    ).toLowerCase();
    return blob.indexOf(termo) !== -1;
  }

  function acao(item) {
    if (
      item.status === api.STATUS.AGUARDANDO_ATENDIMENTO_MEDICO ||
      item.status === api.STATUS.EM_ATENDIMENTO_MEDICO
    ) {
      return '<span class="btn-triagem done">Na fila médica</span>';
    }
    const rotulo = item.triagem ? "Continuar triagem" : "Iniciar Triagem";
    return (
      '<button class="btn-triagem" type="button" data-abrir="' +
      item.numero +
      '">' +
      rotulo +
      "</button>" +
      '<button class="chev" type="button" data-abrir="' +
      item.numero +
      '">›</button>'
    );
  }

  function linha(item) {
    const prio = item.protocolo
      ? "cor-" + item.protocolo.cor
      : ui.classePrioridade(item.prioridadeRecepcao);
    const paciente = item.paciente;
    const risco = item.protocolo
      ? '<div class="prio ' +
        prio +
        '"><span class="dot m-' +
        item.protocolo.cor +
        '"></span>' +
        ui.esc(item.protocolo.nivel) +
        "</div>"
      : '<div class="prio ' +
        prio +
        '"><span class="dot"></span>' +
        ui.esc(item.prioridadeRecepcao) +
        "</div>";
    return (
      "<tr>" +
      "<td>" +
      risco +
      "</td>" +
      '<td><div class="who"><span class="avatar">' +
      ui.esc(ui.iniciais(paciente.nome)) +
      "</span>" +
      '<span class="patient-name"><strong>' +
      ui.esc(paciente.nome) +
      "</strong>" +
      "<small>" +
      paciente.idade +
      " anos · " +
      ui.esc(paciente.sexo) +
      "</small></span></div></td>" +
      "<td>" +
      ui.esc(paciente.cpf) +
      "</td>" +
      "<td>" +
      ui.esc(item.numero) +
      "</td>" +
      "<td>" +
      ui.esc(item.triagem ? item.triagem.queixas : "—") +
      "</td>" +
      '<td class="wait ' +
      prio +
      '">' +
      ui.formatarEspera(item.tempoEsperaMin) +
      "</td>" +
      '<td><div class="actions">' +
      acao(item) +
      "</div></td>" +
      "</tr>"
    );
  }

  function render() {
    const filtro = document.getElementById("filtro-prio");
    const modo = aba === "medico" ? "medico" : "fila";
    if (filtro.dataset.modo !== modo) {
      filtro.dataset.modo = modo;
      prioridade = "";
      filtro.innerHTML =
        '<option value="">Todas</option>' +
        (modo === "medico"
          ? api.MANCHESTER.map(
              (m) =>
                '<option value="' +
                m.cor +
                '">' +
                m.nome +
                " — " +
                m.nivel +
                "</option>",
            ).join("")
          : ["Baixa", "Média", "Alta"]
              .map((v) => "<option>" + v + "</option>")
              .join(""));
    }
    filtro.style.display = "none";
    let opcoes = document.getElementById("prioridades-opcoes");
    if (!opcoes) {
      opcoes = document.createElement("div");
      opcoes.id = "prioridades-opcoes";
      filtros.appendChild(opcoes);
    }
    const cores = { Baixa: "verde", Média: "amarelo", Alta: "vermelho" };
    opcoes.innerHTML = Array.from(filtro.options)
      .map(
        (o) =>
          '<button type="button" class="filtro-prioridade ' +
          (prioridade === o.value ? "selecionado" : "") +
          '" data-prioridade="' +
          ui.esc(o.value) +
          '">' +
          (o.value
            ? '<span class="m-dot m-' +
              (cores[o.value] || o.value) +
              '"></span>'
            : "") +
          ui.esc(o.textContent) +
          "</button>",
      )
      .join("");
    opcoes.querySelectorAll("[data-prioridade]").forEach((b) =>
      b.addEventListener("click", function () {
        prioridade = b.dataset.prioridade;
        filtro.value = prioridade;
        render();
      }),
    );
    document.getElementById("qtd-fila").textContent = fila.length;
    document.getElementById("qtd-medico").textContent = medico.length;

    const fonte = aba === "medico" ? medico : fila;
    const visiveis = fonte.filter(corresponde);

    document.querySelector(".section-head h2").textContent =
      aba === "medico" ? "Pacientes já classificados" : "Lista de pacientes";

    if (!visiveis.length) {
      lista.innerHTML =
        '<tr><td colspan="7"><div class="empty">Nenhum atendimento encontrado nesta lista.</div></td></tr>';
      return;
    }
    lista.innerHTML = visiveis.map(linha).join("");
  }

  lista.addEventListener("click", function (evento) {
    const alvo = evento.target.closest("[data-abrir]");
    if (!alvo) return;
    window.location.href =
      "triagem.html?atendimento=" +
      encodeURIComponent(alvo.getAttribute("data-abrir"));
  });

  carregar();
  setInterval(carregar, 30000);
})();
