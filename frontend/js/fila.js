(function () {
  const sessao = MedFlowSessao.exigir(["medico"]);
  if (!sessao) return;

  const ui = MedFlowUI;
  const api = MedFlowAPI;
  ui.montarChrome("inicio", sessao);

  const cards = document.getElementById("cards-manchester");
  const lista = document.getElementById("lista-fila");
  const busca = document.getElementById("busca-global");
  let termo = "";

  document.getElementById("btn-atualizar").addEventListener("click", function () {
    render();
    ui.toast("Fila atualizada.", "ok");
  });

  document.getElementById("btn-reset").addEventListener("click", function () {
    if (!window.confirm("Excluir todos os pacientes e atendimentos? Esta ação não pode ser desfeita.")) return;
    api.excluirDados();
    render();
    ui.toast("Dados de demonstração restaurados.", "ok");
  });

  if (busca) {
    busca.addEventListener("input", function () {
      termo = busca.value.trim().toLowerCase();
      render();
    });
  }

  lista.addEventListener("click", function (e) {
    const botao = e.target.closest("[data-iniciar]");
    if (!botao) return;
    try {
      const item = api.obterPorNumero(botao.getAttribute("data-iniciar"));
      api.iniciarAtendimentoMedico(item.id);
      window.location.href = "atendimento.html?atendimento=" + encodeURIComponent(item.numero);
    } catch (erro) {
      ui.toast(erro.message, "erro");
    }
  });

  function render() {
    const fila = api.listarFilaMedica();
    const espera = fila.filter(function (a) { return a.status === api.STATUS.AGUARDANDO_ATENDIMENTO_MEDICO; });
    document.getElementById("qtd-fila").textContent = espera.length;

    cards.innerHTML = api.MANCHESTER.map(function (m) {
      const qtd = espera.filter(function (a) { return a.protocolo && a.protocolo.cor === m.cor; }).length;
      const palavra = qtd === 1 ? "paciente" : "pacientes";
      return '<article class="risk-card risco-' + m.cor + '">' +
        '<span class="m-dot m-' + m.cor + '"></span>' +
        "<div><strong>" + m.nome + "</strong>" +
        "<span>" + qtd + " " + palavra + "</span>" +
        "<small>" + m.prazo + "</small></div></article>";
    }).join("");

    const visiveis = fila.filter(function (item) {
      if (!termo) return true;
      const blob = (item.paciente.nome + " " + item.paciente.cpf + " " + item.numero + " " + item.queixaPrincipal).toLowerCase();
      return blob.indexOf(termo) !== -1;
    });

    if (!visiveis.length) {
      lista.innerHTML = '<tr><td colspan="8"><div class="empty">Nenhum paciente aguardando atendimento médico.</div></td></tr>';
      return;
    }

    lista.innerHTML = visiveis.map(function (item) {
      const p = item.protocolo || { prioridade: "—", nome: "—", cor: "verde" };
      const prio = "cor-" + p.cor;
      const queixa = item.triagem && item.triagem.queixas ? item.triagem.queixas : item.queixaPrincipal;
      const acao = item.status === api.STATUS.EM_ATENDIMENTO_MEDICO
        ? '<button class="btn-triagem" type="button" data-iniciar="' + item.numero + '">Continuar</button>'
        : '<button class="btn-triagem" type="button" data-iniciar="' + item.numero + '">Iniciar Atendimento</button>';
      return "<tr>" +
        '<td><div class="prio ' + prio + '"><span class="dot m-' + p.cor + '"></span>' + ui.esc(p.nivel) + "</div></td>" +
        "<td>" + ui.esc(item.numero) + "</td>" +
        "<td><strong>" + ui.esc(item.paciente.nome) + "</strong></td>" +
        "<td>" + ui.formatarData(item.paciente.dataNascimento) + " (" + item.paciente.idade + " anos)</td>" +
        '<td><div class="prio"><span class="dot m-' + p.cor + '"></span>' + ui.esc(p.nome) + "<br><small>" + ui.esc(p.nivel || "") + "</small></div></td>" +
        "<td>" + ui.esc(queixa) + "</td>" +
        '<td class="wait ' + prio + '">' + ui.formatarEspera(item.tempoEsperaMin) + "</td>" +
        '<td><div class="actions">' + acao + "</div></td>" +
      "</tr>";
    }).join("");
  }

  render();
  setInterval(render, 10000);
})();
