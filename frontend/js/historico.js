(function () {
  const sessao = MedFlowSessao.exigir(["recepcao", "enfermagem", "medico"]);
  if (!sessao) return;

  const ui = MedFlowUI;
  // Dados vêm do backend (Oracle) pelo cliente da API.
  const api = MedFlowRemoto;
  ui.montarChrome("historico", sessao);

  const lista = document.getElementById("lista-historico");
  const busca = document.getElementById("busca-global");
  const paginacao = document.getElementById("paginacao");
  // Quantidade de registros por página
  const POR_PAGINA = 10;
  let paginaAtual = 1;
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
      paginaAtual = 1;
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
      renderPaginacao(0, 0);
      return;
    }

    const totalPaginas = Math.ceil(fonte.length / POR_PAGINA);
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
    if (paginaAtual < 1) paginaAtual = 1;

    const inicio = (paginaAtual - 1) * POR_PAGINA;
    const pagina = fonte.slice(inicio, inicio + POR_PAGINA);

    lista.innerHTML = pagina
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

    renderPaginacao(fonte.length, totalPaginas);
  }
    function paginasVisiveis(total) {
    const itens = [];
    for (let n = 1; n <= total; n++) {
      if (n === 1 || n === total || Math.abs(n - paginaAtual) <= 2) {
        itens.push(n);
      } else if (itens[itens.length - 1] !== "...") {
        itens.push("...");
      }
    }
    return itens;
  }

  function renderPaginacao(totalRegistros, totalPaginas) {
    if (totalPaginas <= 1) {
      paginacao.classList.add("hidden");
      paginacao.innerHTML = "";
      return;
    }
    paginacao.classList.remove("hidden");

    const de = (paginaAtual - 1) * POR_PAGINA + 1;
    const ate = Math.min(paginaAtual * POR_PAGINA, totalRegistros);

    const botoes = paginasVisiveis(totalPaginas)
      .map(function (n) {
        if (n === "...") {
          return '<span class="paginacao-reticencias">…</span>';
        }
        const ativo = n === paginaAtual;
        return (
          '<button type="button" class="ghost' + (ativo ? " ativo" : "") +
          '" data-pagina="' + n + '"' +
          (ativo ? ' aria-current="page"' : "") + ">" + n + "</button>"
        );
      })
      .join("");

    paginacao.innerHTML =
      '<span class="paginacao-info">Mostrando ' + de + "–" + ate +
      " de " + totalRegistros + " atendimentos</span>" +
      '<div class="paginacao-botoes">' +
      '<button type="button" class="ghost" data-pagina="' + (paginaAtual - 1) + '"' +
      (paginaAtual === 1 ? " disabled" : "") + ">← Anterior</button>" +
      botoes +
      '<button type="button" class="ghost" data-pagina="' + (paginaAtual + 1) + '"' +
      (paginaAtual === totalPaginas ? " disabled" : "") + ">Próxima →</button>" +
      "</div>";
  }

    paginacao.addEventListener("click", function (evento) {
      const botao = evento.target.closest("button[data-pagina]");
      if (!botao || botao.disabled) return;
      paginaAtual = Number(botao.dataset.pagina);
      render();
      lista.closest(".table-wrap").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  carregar();
})();
