(function () {
  const sessao = MedFlowSessao.exigir(["recepcao", "enfermagem", "medico"]);
  if (!sessao) return;

  const ui = MedFlowUI;
  // Dados vêm do backend (Oracle) pelo cliente da API.
  const api = MedFlowRemoto;
  ui.montarChrome("historico", sessao);

  const lista = document.getElementById("lista-historico");
  const busca = document.getElementById("busca-global");
  let termo = "";
  // Último histórico recebido do servidor; a busca filtra aqui.
  let historico = [];
  const medico = sessao.id === "medico";
  document
    .getElementById("coluna-prontuario")
    .classList.toggle("hidden", !medico);

  document.getElementById("btn-atualizar").addEventListener("click", carregar);

  if (busca) {
    busca.addEventListener("input", function () {
      termo = busca.value.trim().toLowerCase();
      render();
    });
  }

  async function carregar() {
    try {
      historico = await api.listarHistorico();
    } catch (erro) {
      lista.innerHTML =
        '<tr><td colspan="7"><div class="empty">' +
        ui.esc(erro.message) +
        "</div></td></tr>";
      return;
    }
    render();
  }

  function render() {
    const fonte = historico.filter(function (item) {
      if (!termo) return true;
      const blob = (
        item.paciente.nome +
        " " +
        item.paciente.cpf +
        " " +
        item.numero
      ).toLowerCase();
      return blob.indexOf(termo) !== -1;
    });
    if (!fonte.length) {
      lista.innerHTML =
        '<tr><td colspan="7"><div class="empty">Nenhum atendimento concluído ou cancelado.</div></td></tr>';
      return;
    }
    lista.innerHTML = fonte
      .map(function (item) {
        const quando =
          item.finalizadoEm || item.canceladoEm || item.atualizadoEm;
        return (
          "<tr>" +
          "<td>" +
          ui.esc(item.numero) +
          "</td>" +
          "<td>" +
          ui.esc(item.paciente.nome) +
          "</td>" +
          "<td>" +
          ui.esc(ui.rotuloStatus(item.status)) +
          "</td>" +
          "<td>" +
          ui.esc(item.protocolo ? item.protocolo.nome : "—") +
          "</td>" +
          "<td>" +
          ui.esc(item.triagem ? item.triagem.queixas : item.queixaPrincipal) +
          "</td>" +
          "<td>" +
          ui.formatarData(quando) +
          "</td>" +
          (medico
            ? "<td>" +
              (item.atendimentoMedico &&
              (item.atendimentoMedico.medicoEmail
                ? item.atendimentoMedico.medicoEmail === sessao.email
                : item.atendimentoMedico.medico === sessao.nome)
                ? '<a class="ghost" href="prontuario.html?paciente=' +
                  encodeURIComponent(item.pacienteId) +
                  '">Ver prontuário</a>'
                : "—") +
              "</td>"
            : "") +
          "</tr>"
        );
      })
      .join("");
  }

  carregar();
})();
