(async function () {
  const sessao = MedFlowSessao.exigir(["medico"]);
  if (!sessao) return;

  const ui = MedFlowUI;
  // Dados vêm do backend (Oracle) pelo cliente da API.
  const api = MedFlowRemoto;
  const validar = MedFlowValidacao;
  ui.montarChrome("atendimentos", sessao);

  const params = new URLSearchParams(window.location.search);
  const numero = params.get("atendimento");
  const host = document.getElementById("conteudo-medico");

  if (!numero) {
    host.innerHTML =
      '<div class="empty">Selecione um paciente na fila de atendimento.</div>';
    return;
  }

  let atendimento;
  try {
    atendimento = await api.obterPorNumero(numero);
    if (!atendimento) throw new Error("Atendimento não encontrado.");
    if (
      atendimento.status !== api.STATUS.FINALIZADO &&
      atendimento.status !== api.STATUS.CANCELADO
    ) {
      atendimento = await api.iniciarAtendimentoMedico(atendimento.id);
    }
  } catch (erro) {
    host.innerHTML = '<div class="empty">' + ui.esc(erro.message) + "</div>";
    return;
  }

  const somenteLeitura =
    atendimento.status === "FINALIZADO" || atendimento.status === "CANCELADO";

  function render() {
    const p = atendimento.paciente;
    const consulta = Object.assign(
      { anotacoes: "" },
      atendimento.atendimentoMedico,
    );
    // Mantém o texto que o médico está digitando (ainda não salvo)
    // quando a tela é redesenhada, por exemplo ao incluir medicação.
    const campoAnotacoes = document.getElementById("anotacoes");
    if (campoAnotacoes && !somenteLeitura) {
      consulta.anotacoes = campoAnotacoes.value;
    }
    const protocolo = atendimento.protocolo;
    const meds = atendimento.medicacoes || [];
    const inicio = consulta.inicioEm
      ? ui.formatarData(consulta.inicioEm)
      : ui.formatarData(atendimento.criadoEm);
    const duracao = consulta.inicioEm
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(consulta.inicioEm).getTime()) / 60000,
          ),
        )
      : atendimento.tempoEsperaMin;

    host.innerHTML =
      '<div class="triagem-grid medico-grid">' +
      '<aside class="card">' +
      '<button class="back" type="button" id="btn-voltar">← Voltar para a fila</button>' +
      '<div class="patient-hero">' +
      '<span class="avatar">' +
      ui.esc(ui.iniciais(p.nome)) +
      "</span>" +
      '<span class="patient-name"><strong>' +
      ui.esc(p.nome) +
      "</strong>" +
      "<small>CPF: " +
      ui.esc(p.cpf) +
      " · " +
      p.idade +
      " anos</small></span>" +
      "</div>" +
      '<div class="alert"><strong>Atendimento nº ' +
      ui.esc(atendimento.numero) +
      "</strong><br>" +
      (somenteLeitura ? "Atendimento concluído" : "Em atendimento") +
      "</div>" +
      '<div class="meta">' +
      '<div class="meta-row">Nascimento ' +
      ui.formatarData(p.dataNascimento) +
      "</div>" +
      '<div class="meta-row">Sexo ' +
      ui.esc(p.sexo) +
      "</div>" +
      '<div class="meta-row">Telefone ' +
      ui.esc(p.telefone) +
      "</div>" +
      '<div class="meta-row">Convênio ' +
      ui.esc(p.convenio) +
      "</div>" +
      "</div>" +
      (protocolo
        ? '<div class="note risco-' +
          protocolo.cor +
          '"><strong>Classificação de Risco</strong><br>' +
          ui.esc(protocolo.nome) +
          " · " +
          ui.esc(protocolo.nivel) +
          "</div>"
        : "") +
      '<div class="note"><strong>Principais Queixas</strong><br>' +
      ui.esc(
        (atendimento.triagem && atendimento.triagem.queixas) ||
          atendimento.queixaPrincipal,
      ) +
      "</div>" +
      "</aside>" +
      '<section class="card">' +
      "<h2>Consulta Médica</h2>" +
      '<p><a class="ghost" href="prontuario.html?paciente=' +
      encodeURIComponent(p.id) +
      '">Ver prontuário do paciente</a></p>' +
      '<div class="field">' +
      "<label>Anotações da Consulta</label>" +
      '<div class="control"><textarea id="anotacoes" maxlength="1000" placeholder="Descreva a conduta, orientações e evolução do paciente...">' +
      ui.esc(consulta.anotacoes || "") +
      "</textarea></div>" +
      '<div class="erro" id="erro-anotacoes"></div>' +
      '<div class="help"><span id="contador-anot">' +
      String(consulta.anotacoes || "").length +
      "/1000</span></div>" +
      "</div>" +
      "<h3>Medicações</h3>" +
      '<div class="med-add">' +
      '<input id="busca-med" placeholder="Nome do medicamento (opcional)">' +
      '<input id="dose" placeholder="Dose">' +
      '<input id="via" placeholder="Via" maxlength="10">' +
      '<input id="frequencia" placeholder="Frequência">' +
      '<button class="primary" type="button" id="btn-add-med" ' +
      (somenteLeitura ? "disabled" : "") +
      ">Adicionar</button>" +
      "</div>" +
      '<div class="erro" id="erro-nome"></div>' +
      '<div class="table-wrap">' +
      '<table class="patients"><thead><tr><th>Medicação</th><th>Dose</th><th>Via</th><th>Frequência</th><th></th></tr></thead>' +
      "<tbody>" +
      (meds.length
        ? meds
            .map(function (m) {
              return (
                "<tr><td>" +
                ui.esc(m.nome) +
                "</td><td>" +
                ui.esc(m.dose) +
                "</td><td>" +
                ui.esc(m.via) +
                "</td><td>" +
                ui.esc(m.frequencia) +
                "</td>" +
                "<td>" +
                (somenteLeitura
                  ? ""
                  : '<button class="ghost" type="button" data-remover="' +
                    m.id +
                    '">Excluir</button>') +
                "</td></tr>"
              );
            })
            .join("")
        : '<tr><td colspan="5"><div class="empty">Nenhuma medicação registrada.</div></td></tr>') +
      "</tbody></table>" +
      "</div>" +
      '<div class="consulta-finalizar">' +
      '<label class="check">' +
      '<input type="checkbox" id="confirma" ' +
      (somenteLeitura ? "disabled checked" : "") +
      ">" +
      "<span><strong>Confirmar Atendimento</strong><br>Após a confirmação, o atendimento será encerrado e não poderá mais ser editado ou cancelado.</span>" +
      "</label>" +
      '<div class="footer-bar">' +
      '<button class="primary" type="button" id="btn-finalizar" ' +
      (somenteLeitura ? "disabled" : "") +
      ">Finalizar Atendimento</button>" +
      "</div>" +
      "</div>" +
      "</section>" +
      "</div>";

    ligarEventos();
    if (somenteLeitura) {
      host.querySelectorAll("input, textarea").forEach(function (el) {
        el.disabled = true;
      });
    }
  }

  function ligarEventos() {
    document
      .getElementById("btn-voltar")
      .addEventListener("click", function () {
        window.location.href = "fila.html";
      });

    const anot = document.getElementById("anotacoes");
    anot.addEventListener("input", function () {
      document.getElementById("contador-anot").textContent =
        anot.value.length + "/1000";
    });
    anot.addEventListener("blur", async function () {
      if (somenteLeitura) return;
      try {
        const r = validar.anotacoes(anot.value);
        if (!r.ok) return;
        atendimento = await api.salvarConsultaMedica(atendimento.id, r.valor);
      } catch (erro) {
        ui.toast(erro.message, "erro");
      }
    });

    document
      .getElementById("btn-add-med")
      .addEventListener("click", async function () {
        const resultado = validar.medicacao({
          nome: document.getElementById("busca-med").value,
          dose: document.getElementById("dose").value,
          via: document.getElementById("via").value,
          frequencia: document.getElementById("frequencia").value,
        });
        ui.marcarCampo(
          "nome",
          resultado.ok
            ? ""
            : resultado.erros.nome ||
                resultado.erros.dose ||
                resultado.erros.via ||
                resultado.erros.frequencia,
        );
        if (!resultado.ok) {
          ui.toast(
            "Preencha nome, dose, via e frequência da medicação.",
            "erro",
          );
          return;
        }
        this.disabled = true;
        try {
          atendimento = await api.adicionarMedicacao(
            atendimento.id,
            resultado.dados,
          );
          ui.toast("Medicação incluída.", "ok");
          render();
        } catch (erro) {
          this.disabled = false;
          ui.toast(erro.message, "erro");
        }
      });

    host.querySelectorAll("[data-remover]").forEach(function (b) {
      b.addEventListener("click", async function () {
        b.disabled = true;
        try {
          atendimento = await api.removerMedicacao(
            atendimento.id,
            Number(b.getAttribute("data-remover")),
          );
          render();
        } catch (erro) {
          b.disabled = false;
          ui.toast(erro.message, "erro");
        }
      });
    });

    document
      .getElementById("btn-finalizar")
      .addEventListener("click", async function () {
        const notas = validar.anotacoes(
          document.getElementById("anotacoes").value,
        );
        ui.marcarCampo("anotacoes", notas.ok ? "" : notas.mensagem);
        if (!notas.ok) {
          ui.toast(notas.mensagem, "erro");
          return;
        }
        if (!document.getElementById("confirma").checked) {
          ui.toast("Marque a confirmação para encerrar o atendimento.", "erro");
          return;
        }
        const botao = this;
        botao.disabled = true;
        try {
          // Grava as anotações e encerra numa única chamada.
          await api.confirmarAtendimentoMedico(atendimento.id, notas.valor);
          ui.toast("Atendimento concluído. O paciente saiu da fila.", "ok");
          setTimeout(function () {
            window.location.href = "fila.html";
          }, 800);
        } catch (erro) {
          botao.disabled = false;
          ui.toast(erro.message, "erro");
        }
      });
  }

  render();
})();
