(async function () {
  const sessao = MedFlowSessao.exigir(["enfermagem"]);
  if (!sessao) return;

  const ui = MedFlowUI;
  // Dados vêm do backend (Oracle) pelo cliente da API.
  const api = MedFlowRemoto;
  const validar = MedFlowValidacao;

  ui.montarChrome("pacientes", sessao);

  const params = new URLSearchParams(window.location.search);
  const numero = params.get("atendimento");
  const host = document.getElementById("conteudo-triagem");

  if (!numero) {
    host.innerHTML =
      '<div class="empty">Selecione um atendimento na lista de pacientes.</div>';
    return;
  }

  let atendimento;
  try {
    atendimento = await api.obterPorNumero(numero);
    if (!atendimento) throw new Error("Atendimento não encontrado.");
    if (atendimento.status === api.STATUS.AGUARDANDO_TRIAGEM) {
      atendimento = await api.iniciarTriagem(atendimento.id);
    }
  } catch (erro) {
    host.innerHTML = '<div class="empty">' + ui.esc(erro.message) + "</div>";
    return;
  }

  let aba = atendimento.classificacao ? "risco" : "enfermagem";
  let corSelecionada = atendimento.classificacao
    ? atendimento.classificacao.cor
    : "";
  const somenteLeitura =
    [
      "AGUARDANDO_ATENDIMENTO_MEDICO",
      "EM_ATENDIMENTO_MEDICO",
      "FINALIZADO",
      "CANCELADO",
    ].indexOf(atendimento.status) !== -1;

  function statusRotulo() {
    if (atendimento.status === "AGUARDANDO_ATENDIMENTO_MEDICO") {
      return {
        titulo: "Aguardando atendimento médico",
        texto:
          "Triagem concluída e classificação vinculada a este atendimento.",
      };
    }
    if (atendimento.status === "EM_ATENDIMENTO_MEDICO") {
      return {
        titulo: "Em atendimento médico",
        texto: "A triagem não pode mais ser alterada.",
      };
    }
    if (atendimento.status === "CANCELADO") {
      return {
        titulo: "Atendimento cancelado",
        texto: "Registros desta triagem não podem ser alterados.",
      };
    }
    if (atendimento.status === "FINALIZADO") {
      return {
        titulo: "Atendimento finalizado",
        texto: "Registros desta triagem não podem ser alterados.",
      };
    }
    return {
      titulo: "Atendimento em aberto",
      texto: "Aguardando triagem de enfermagem",
    };
  }

  function iconePessoa() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3"/><path d="M6 19c.8-3 3-5 6-5s5.2 2 6 5"/></svg>';
  }

  function renderManchester() {
    return api.MANCHESTER.map(function (m) {
      return (
        '<button type="button" data-cor="' +
        m.cor +
        '" class="' +
        (corSelecionada === m.cor ? "sel" : "") +
        '" ' +
        (somenteLeitura ? "disabled" : "") +
        ">" +
        '<span class="m-dot m-' +
        m.cor +
        '"></span>' +
        "<span><strong>" +
        m.nome +
        "</strong><small>" +
        m.nivel +
        "<br>" +
        m.prazo +
        "</small></span>" +
        "</button>"
      );
    }).join("");
  }

  function render() {
    const p = atendimento.paciente;
    const t = atendimento.triagem || {};
    const queixas = t.queixas || "";

    host.innerHTML =
      '<div class="triagem-grid">' +
      '<aside class="card">' +
      '<button class="back" type="button" id="btn-voltar">← Voltar</button>' +
      '<div class="patient-hero">' +
      '<span class="avatar">' +
      ui.esc(ui.iniciais(p.nome)) +
      "</span>" +
      '<span class="patient-name"><strong>' +
      ui.esc(p.nome) +
      "</strong>" +
      "<small>CPF: " +
      ui.esc(p.cpf) +
      " · Nº Atendimento: " +
      ui.esc(atendimento.numero) +
      "</small></span>" +
      "</div>" +
      '<div class="meta">' +
      '<div class="meta-row">' +
      iconePessoa() +
      " Idade " +
      p.idade +
      " anos</div>" +
      '<div class="meta-row">' +
      iconePessoa() +
      " Sexo " +
      ui.esc(p.sexo) +
      "</div>" +
      '<div class="meta-row">' +
      iconePessoa() +
      " Telefone " +
      ui.esc(p.telefone) +
      "</div>" +
      '<div class="meta-row">' +
      iconePessoa() +
      " Convênio " +
      ui.esc(p.convenio) +
      "</div>" +
      "</div>" +
      '<div class="alert"><strong>' +
      statusRotulo().titulo +
      "</strong><br>" +
      statusRotulo().texto +
      "</div>" +
      "</aside>" +
      '<section class="card">' +
      '<div class="subtabs">' +
      '<button class="subtab ' +
      (aba === "enfermagem" ? "ativo" : "") +
      '" type="button" data-aba="enfermagem">Triagem de Enfermagem</button>' +
      '<button class="subtab ' +
      (aba === "risco" ? "ativo" : "") +
      '" type="button" data-aba="risco">Classificação de Risco</button>' +
      "</div>" +
      '<div id="painel-enfermagem" class="' +
      (aba === "enfermagem" ? "" : "hidden") +
      '">' +
      "<h3>Sinais Vitais</h3>" +
      '<p class="help">Informe os sinais vitais do paciente.</p>' +
      '<div class="vitals">' +
      '<div class="field"><label>Pressão Arterial</label><div class="control"><input id="pressaoArterial" maxlength="7" placeholder="Ex: 120/80" value="' +
      ui.esc(t.pressaoArterial || "") +
      '"><span class="sufixo">mmHg</span></div><div class="erro" id="erro-pressaoArterial"></div></div>' +
      '<div class="field"><label>Temperatura</label><div class="control"><input id="temperatura" inputmode="decimal" placeholder="Ex: 36,5" value="' +
      (t.temperatura != null ? t.temperatura : "") +
      '"><span class="sufixo">°C</span></div><div class="erro" id="erro-temperatura"></div></div>' +
      '<div class="field"><label>Frequência Cardíaca</label><div class="control"><input id="frequenciaCardiaca" inputmode="numeric" placeholder="Ex: 72" value="' +
      (t.frequenciaCardiaca != null ? t.frequenciaCardiaca : "") +
      '"><span class="sufixo">bpm</span></div><div class="erro" id="erro-frequenciaCardiaca"></div></div>' +
      '<div class="field"><label>Frequência Respiratória</label><div class="control"><input id="frequenciaRespiratoria" inputmode="numeric" placeholder="Ex: 16" value="' +
      (t.frequenciaRespiratoria != null ? t.frequenciaRespiratoria : "") +
      '"><span class="sufixo">irpm</span></div><div class="erro" id="erro-frequenciaRespiratoria"></div></div>' +
      "</div>" +
      '<div class="field"><label>Principais Queixas</label><div class="control"><textarea id="queixas" maxlength="500" placeholder="Ex: Dor no peito, falta de ar, náuseas, tontura...">' +
      ui.esc(queixas) +
      "</textarea></div>" +
      '<div class="erro" id="erro-queixas"></div><div class="help"><span id="contador">' +
      queixas.length +
      "/500</span></div></div>" +
      '<p class="help">Os dados informados serão vinculados ao atendimento selecionado.</p>' +
      '<div class="form-actions">' +
      '<button class="ghost" type="button" id="btn-limpar" ' +
      (somenteLeitura ? "disabled" : "") +
      ">Limpar</button>" +
      '<button class="primary" type="button" id="btn-avancar" ' +
      (somenteLeitura ? "disabled" : "") +
      ">Continuar para classificação</button>" +
      "</div>" +
      "</div>" +
      '<div id="painel-risco" class="' +
      (aba === "risco" ? "" : "hidden") +
      '">' +
      "<h3>Classificação de Risco</h3>" +
      '<p class="help">Selecione a prioridade conforme o Protocolo de Manchester. Ao salvar, o atendimento vai para a fila médica nessa ordem de urgência.</p>' +
      '<div class="manchester" id="lista-manchester">' +
      renderManchester() +
      "</div>" +
      '<div class="erro" id="erro-classificacao"></div>' +
      '<div class="footer-bar"><button class="primary" type="button" id="btn-salvar-tudo" ' +
      (somenteLeitura ? "disabled" : "") +
      ">Salvar Triagem e Classificação</button></div></div>" +
      "</section>" +
      "</div>";

    ligarEventos();
    if (somenteLeitura) {
      host.querySelectorAll("input, textarea").forEach(function (el) {
        el.disabled = true;
      });
    }
  }

  function coletar() {
    return {
      pressaoArterial: document.getElementById("pressaoArterial").value,
      temperatura: document.getElementById("temperatura").value,
      frequenciaCardiaca: document.getElementById("frequenciaCardiaca").value,
      frequenciaRespiratoria: document.getElementById("frequenciaRespiratoria")
        .value,
      queixas: document.getElementById("queixas").value,
    };
  }

  function mostrarErros(erros) {
    ui.limparErros([
      "pressaoArterial",
      "temperatura",
      "frequenciaCardiaca",
      "frequenciaRespiratoria",
      "queixas",
    ]);
    Object.keys(erros || {}).forEach(function (campo) {
      ui.marcarCampo(campo, erros[campo]);
    });
  }

  function irPara(nome) {
    aba = nome;
    const enfermagem = document.getElementById("painel-enfermagem");
    const risco = document.getElementById("painel-risco");
    if (enfermagem) enfermagem.classList.toggle("hidden", aba !== "enfermagem");
    if (risco) risco.classList.toggle("hidden", aba !== "risco");
    document.querySelectorAll(".subtab").forEach(function (t) {
      t.classList.toggle("ativo", t.getAttribute("data-aba") === aba);
    });
  }

  async function salvarTriagemParcial() {
    const resultado = validar.triagem(coletar());
    mostrarErros(resultado.erros);
    if (!resultado.ok) {
      irPara("enfermagem");
      ui.toast("Corrija os dados inválidos antes de salvar a triagem.", "erro");
      return false;
    }
    try {
      atendimento = await api.salvarTriagem(atendimento.id, resultado.dados);
      return true;
    } catch (erro) {
      ui.toast(erro.message, "erro");
      return false;
    }
  }

  // Desabilita os botões de salvar enquanto o servidor responde.
  function ocupado(sim) {
    ["btn-avancar", "btn-salvar-tudo"].forEach(function (id) {
      const botao = document.getElementById(id);
      if (botao) botao.disabled = sim;
    });
  }

  async function salvarTudo() {
    ocupado(true);
    try {
      await salvarTudoInterno();
    } finally {
      ocupado(false);
    }
  }

  async function salvarTudoInterno() {
    if (!(await salvarTriagemParcial())) return;
    const classe = validar.classificacao(corSelecionada);
    const erroBox = document.getElementById("erro-classificacao");
    if (erroBox) erroBox.textContent = classe.ok ? "" : classe.mensagem;
    if (!classe.ok) {
      irPara("risco");
      ui.toast(classe.mensagem, "erro");
      return;
    }
    try {
      atendimento = await api.salvarClassificacao(
        atendimento.id,
        corSelecionada,
      );
      ui.toast("Triagem registrada e atendimento enviado à fila médica.", "ok");
      setTimeout(function () {
        window.location.href = "pacientes.html";
      }, 700);
    } catch (erro) {
      ui.toast(erro.message, "erro");
    }
  }

  function ligarEventos() {
    document
      .getElementById("btn-voltar")
      .addEventListener("click", function () {
        window.location.href = "pacientes.html";
      });

    document.querySelectorAll(".subtab").forEach(function (botao) {
      botao.addEventListener("click", function () {
        irPara(botao.getAttribute("data-aba"));
      });
    });

    const queixas = document.getElementById("queixas");
    queixas.addEventListener("input", function () {
      document.getElementById("contador").textContent =
        queixas.value.length + "/500";
    });

    const pa = document.getElementById("pressaoArterial");
    pa.addEventListener("input", function () {
      const v = pa.value.replace(/[^\d]/g, "").slice(0, 5);
      if (v.length <= 2) pa.value = v;
      else if (v[0] === "1" || v[0] === "2") {
        pa.value = v.length <= 3 ? v : v.slice(0, 3) + "/" + v.slice(3);
      } else {
        pa.value = v.slice(0, 2) + "/" + v.slice(2);
      }
    });

    document
      .getElementById("btn-limpar")
      .addEventListener("click", function () {
        [
          "pressaoArterial",
          "temperatura",
          "frequenciaCardiaca",
          "frequenciaRespiratoria",
          "queixas",
        ].forEach(function (id) {
          document.getElementById(id).value = "";
        });
        document.getElementById("contador").textContent = "0/500";
        mostrarErros({});
      });

    document
      .getElementById("btn-avancar")
      .addEventListener("click", async function () {
        ocupado(true);
        const salvou = await salvarTriagemParcial();
        ocupado(false);
        if (!salvou) return;
        irPara("risco");
        ui.toast(
          "Sinais vitais salvos. Selecione a classificação de risco.",
          "ok",
        );
      });

    document.querySelectorAll("[data-cor]").forEach(function (botao) {
      botao.addEventListener("click", function () {
        if (somenteLeitura) return;
        corSelecionada = botao.getAttribute("data-cor");
        document.querySelectorAll("[data-cor]").forEach(function (b) {
          b.classList.toggle(
            "sel",
            b.getAttribute("data-cor") === corSelecionada,
          );
        });
      });
    });

    document
      .getElementById("btn-salvar-tudo")
      .addEventListener("click", salvarTudo);
  }

  render();
})();
