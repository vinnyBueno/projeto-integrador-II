(function (global) {
  function iniciais(nome) {
    return String(nome || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (p) {
        return p[0];
      })
      .join("")
      .toUpperCase();
  }

  function esc(texto) {
    return String(texto == null ? "" : texto).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }

  function formatarEspera(minutos) {
    if (minutos < 60) return minutos + " min";
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m ? h + "h " + m + "min" : h + "h";
  }

  function formatarData(isoOuYmd) {
    if (!isoOuYmd) return "—";
    const texto = String(isoOuYmd);
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      const p = texto.split("-");
      return p[2] + "/" + p[1] + "/" + p[0];
    }
    const d = new Date(texto);
    if (isNaN(d.getTime())) return texto;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const aa = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return dd + "/" + mm + "/" + aa + " " + hh + ":" + mi;
  }

  function classePrioridade(prioridade) {
    const mapa = {
      Alta: "alta",
      "Muito alta": "alta",
      Média: "media",
      Media: "media",
      Urgente: "media",
      Baixa: "baixa",
      "Pouco urgente": "baixa",
      "Não urgente": "baixa",
    };
    return mapa[prioridade] || "media";
  }

  function rotuloStatus(status) {
    const mapa = {
      AGUARDANDO_TRIAGEM: "Aguardando triagem",
      EM_TRIAGEM: "Em triagem",
      AGUARDANDO_ATENDIMENTO_MEDICO: "Aguardando médico",
      EM_ATENDIMENTO_MEDICO: "Em atendimento",
      FINALIZADO: "Concluído",
      CANCELADO: "Cancelado",
    };
    return mapa[status] || status;
  }

  function toast(mensagem, tipo) {
    let host = document.getElementById("toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "toast-host";
      document.body.appendChild(host);
    }
    const el = document.createElement("div");
    el.className = "toast toast-" + (tipo || "info");
    el.textContent = mensagem;
    host.appendChild(el);
    setTimeout(function () {
      el.classList.add("visible");
    }, 20);
    setTimeout(function () {
      el.classList.remove("visible");
      setTimeout(function () {
        el.remove();
      }, 280);
    }, 4200);
  }

  function marcarCampo(id, mensagem) {
    const campo = document.getElementById(id);
    const erro = document.getElementById("erro-" + id);
    if (campo) {
      campo.classList.toggle("invalido", Boolean(mensagem));
      const control = campo.closest ? campo.closest(".control") : null;
      if (control) control.classList.toggle("invalido", Boolean(mensagem));
    }
    if (erro) erro.textContent = mensagem || "";
  }

  function limparErros(ids) {
    ids.forEach(function (id) {
      marcarCampo(id, "");
    });
  }

  const ICONES = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"/></svg>',
    users:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7.5" r="3.5"/><path d="M21 21v-2a3.8 3.8 0 0 0-3-3.7"/><path d="M16 4.1a3.5 3.5 0 0 1 0 6.8"/></svg>',
    clipboard:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 4.5h6V7H9V4.5Z"/><path d="M9 12h6M9 16h4"/></svg>',
    clock:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2.5"/></svg>',
  };

  function linksDoPerfil(perfil) {
    if (perfil === "recepcao") {
      return [
        {
          id: "inicio",
          href: "recepcao.html",
          rotulo: "Início",
          icone: "home",
        },
        {
          id: "historico",
          href: "historico.html",
          rotulo: "Histórico",
          icone: "clock",
        },
      ];
    }
    if (perfil === "medico") {
      return [
        { id: "inicio", href: "fila.html", rotulo: "Início", icone: "home" },
        {
          id: "historico",
          href: "historico.html",
          rotulo: "Histórico",
          icone: "clock",
        },
      ];
    }
    return [
      { id: "inicio", href: "pacientes.html", rotulo: "Início", icone: "home" },
      {
        id: "historico",
        href: "historico.html",
        rotulo: "Histórico",
        icone: "clock",
      },
    ];
  }

  function montarChrome(paginaAtiva, sessao) {
    const sidebar = document.getElementById("sidebar");
    const topbar = document.getElementById("topbar");
    if (paginaAtiva !== "historico") paginaAtiva = "inicio";
    const links = linksDoPerfil(sessao && sessao.id);

    if (sidebar) {
      const nav = links
        .map(function (l) {
          const ativo = paginaAtiva === l.id ? " ativo" : "";
          return (
            '<a class="' +
            ativo.trim() +
            '" href="' +
            l.href +
            '">' +
            ICONES[l.icone] +
            "<span>" +
            l.rotulo +
            "</span></a>"
          );
        })
        .join("");
      sidebar.innerHTML =
        '<a class="brand" href="' +
        (sessao ? sessao.inicio : "index.html") +
        '">' +
        '<span class="brand-mark">' +
        '<svg viewBox="0 0 36 36" aria-hidden="true"><path d="M4 18h6l3-8 5 16 3-8h11" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        "</span>" +
        "<span><strong>MedFlow</strong><small>Cuidando de cada vida</small></span>" +
        "</a>" +
        '<nav class="side-nav">' +
        nav +
        "</nav>" +
        '<div class="side-foot">' +
        '<span class="heart">♡</span>' +
        "<p>Mais do que<br>um sistema,<br>uma rede de cuidado.</p>" +
        '<button class="ghost sair" type="button" id="btn-sair">Sair</button>' +
        "</div>";
    }

    if (topbar && sessao) {
      topbar.innerHTML =
        '<label class="search">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>' +
        '<input id="busca-global" type="search" placeholder="Pesquisar paciente por nome, CPF, nº do atendimento..." autocomplete="off">' +
        "</label>" +
        '<div class="user-chip">' +
        '<span class="avatar">' +
        esc(sessao.iniciais) +
        "</span>" +
        "<span><strong>" +
        esc(sessao.nome) +
        "</strong><small>" +
        esc(sessao.cargo) +
        "</small></span>" +
        "</div>";
    }

    const btnSair = document.getElementById("btn-sair");
    if (btnSair) {
      btnSair.addEventListener("click", function () {
        if (global.MedFlowSessao) MedFlowSessao.sair();
        window.location.href = "index.html";
      });
    }
  }

  global.MedFlowUI = {
    iniciais: iniciais,
    esc: esc,
    formatarEspera: formatarEspera,
    formatarData: formatarData,
    classePrioridade: classePrioridade,
    rotuloStatus: rotuloStatus,
    toast: toast,
    marcarCampo: marcarCampo,
    limparErros: limparErros,
    montarChrome: montarChrome,
  };
})(window);
