(function () {
  const sessao = MedFlowSessao.exigir(["recepcao", "enfermagem", "medico"]);
  if (!sessao) return;

  const ui = MedFlowUI;
  const api = MedFlowAPI;
  ui.montarChrome("historico", sessao);

  const lista = document.getElementById("lista-historico");
  const busca = document.getElementById("busca-global");
  let termo = "";

  document.getElementById("btn-atualizar").addEventListener("click", render);

  if (busca) {
    busca.addEventListener("input", function () {
      termo = busca.value.trim().toLowerCase();
      render();
    });
  }

  function render() {
    const fonte = api.listarHistorico().filter(function (item) {
      if (!termo) return true;
      const blob = (item.paciente.nome + " " + item.paciente.cpf + " " + item.numero).toLowerCase();
      return blob.indexOf(termo) !== -1;
    });
    if (!fonte.length) {
      lista.innerHTML = '<tr><td colspan="6"><div class="empty">Nenhum atendimento concluído ou cancelado.</div></td></tr>';
      return;
    }
    lista.innerHTML = fonte.map(function (item) {
      const quando = item.finalizadoEm || item.canceladoEm || item.atualizadoEm;
      return "<tr>" +
        "<td>" + ui.esc(item.numero) + "</td>" +
        "<td>" + ui.esc(item.paciente.nome) + "</td>" +
        "<td>" + ui.esc(ui.rotuloStatus(item.status)) + "</td>" +
        "<td>" + ui.esc(item.protocolo ? item.protocolo.nome : "—") + "</td>" +
        "<td>" + ui.esc(item.queixaPrincipal) + "</td>" +
        "<td>" + ui.formatarData(quando) + "</td>" +
      "</tr>";
    }).join("");
  }

  render();
})();
