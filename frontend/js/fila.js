(function () {
  const sessao = MedFlowSessao.exigir(["medico"]);
  if (!sessao) return;

  const ui = MedFlowUI;
  // Dados vêm do backend (Oracle) pelo cliente da API.
  const api = MedFlowRemoto;
  ui.montarChrome("inicio", sessao);

  const cards = document.getElementById("cards-manchester");
  const lista = document.getElementById("lista-fila");
  const busca = document.getElementById("busca-global");
  let termo = "";
  // Última fila recebida do servidor; a busca filtra aqui.
  let fila = [];

  document
    .getElementById("btn-atualizar")
    .addEventListener("click", async function () {
      if (await carregar()) ui.toast("Fila atualizada.", "ok");
    });

  // Busca a fila no servidor e redesenha. Devolve true se deu certo.
  async function carregar() {
    try {
      fila = await api.listarFilaMedica();
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

  if (busca) {
    busca.addEventListener("input", function () {
      termo = busca.value.trim().toLowerCase();
      render();
    });
  }

  lista.addEventListener("click", async function (e) {
    const botao = e.target.closest("[data-iniciar]");
    if (!botao) return;
    // O número do atendimento é o próprio ID no banco.
    const numero = botao.getAttribute("data-iniciar");
    botao.disabled = true;
    try {
      await api.iniciarAtendimentoMedico(numero);
      window.location.href =
        "atendimento.html?atendimento=" + encodeURIComponent(numero);
    } catch (erro) {
      botao.disabled = false;
      ui.toast(erro.message, "erro");
    }
  });

  function render() {
    const espera = fila.filter(function (a) {
      return a.status === api.STATUS.AGUARDANDO_ATENDIMENTO_MEDICO;
    });
    document.getElementById("qtd-fila").textContent = espera.length;

    cards.innerHTML = api.MANCHESTER.map(function (m) {
      const qtd = espera.filter(function (a) {
        return a.classificacao && a.classificacao.cor === m.cor;
      }).length;
      const palavra = qtd === 1 ? "paciente" : "pacientes";
      return (
        '<article class="risk-card risco-' +
        m.cor +
        '">' +
        '<span class="m-dot m-' +
        m.cor +
        '"></span>' +
        "<div><strong>" +
        m.nome +
        "</strong>" +
        "<span>" +
        qtd +
        " " +
        palavra +
        "</span>" +
        "<small>" +
        m.prazo +
        "</small></div></article>"
      );
    }).join("");

    const visiveis = fila.filter(function (item) {
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
    });

    if (!visiveis.length) {
      lista.innerHTML =
        '<tr><td colspan="7"><div class="empty">Nenhum paciente aguardando atendimento médico.</div></td></tr>';
      return;
    }

    lista.innerHTML = visiveis
      .map(function (item) {
        const p = item.classificacao || {
          nome: "Não classificado",
          nivel: "",
          cor: "",
        };
        const prio = ui.classePrioridade(item.prioridadeRecepcao);
        const queixa =
          item.triagem && item.triagem.queixas
            ? item.triagem.queixas
            : item.queixaPrincipal;
        const acao =
          item.status === api.STATUS.EM_ATENDIMENTO_MEDICO
            ? '<button class="btn-triagem" type="button" data-iniciar="' +
              item.numero +
              '">Continuar</button>'
            : '<button class="btn-triagem" type="button" data-iniciar="' +
              item.numero +
              '">Iniciar Atendimento</button>';
        return (
          "<tr>" +
          "<td>" +
          ui.esc(item.numero) +
          "</td>" +
          "<td><strong>" +
          ui.esc(item.paciente.nome) +
          "</strong></td>" +
          "<td>" +
          ui.formatarData(item.paciente.dataNascimento) +
          " (" +
          item.paciente.idade +
          " anos)</td>" +
          '<td><div class="prio"><span class="dot m-' +
          p.cor +
          '"></span>' +
          ui.esc(p.nome) +
          "<br><small>" +
          ui.esc(p.nivel || "") +
          "</small></div></td>" +
          "<td>" +
          ui.esc(queixa) +
          "</td>" +
          '<td class="wait ' +
          prio +
          '">' +
          ui.formatarEspera(item.tempoEsperaMin) +
          "</td>" +
          '<td><div class="actions">' +
          acao +
          "</div></td>" +
          "</tr>"
        );
      })
      .join("");
  }

  carregar();
  setInterval(carregar, 10000);
})();
