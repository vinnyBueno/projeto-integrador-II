/**
 * Validações usadas nas telas. O backend aplica as mesmas regras
 * antes de gravar no banco.
 */
(function (global) {
  const FAIXAS = {
    sistolica: { min: 70, max: 250, rotulo: "pressão sistólica" },
    diastolica: { min: 40, max: 150, rotulo: "pressão diastólica" },
    temperatura: { min: 34, max: 42.5, rotulo: "temperatura" },
    frequenciaCardiaca: { min: 30, max: 220, rotulo: "frequência cardíaca" },
    frequenciaRespiratoria: {
      min: 8,
      max: 60,
      rotulo: "frequência respiratória",
    },
    queixas: { min: 8, max: 500 },
  };

  function numero(valor) {
    if (valor === null || valor === undefined) return NaN;
    return Number(String(valor).trim().replace(",", "."));
  }

  function soDigitos(valor) {
    return String(valor || "").replace(/\D/g, "");
  }

  function cpf(valor) {
    const d = soDigitos(valor);
    if (d.length !== 11) {
      return { ok: false, mensagem: "Informe um CPF com 11 números." };
    }
    const formatado =
      d.slice(0, 3) +
      "." +
      d.slice(3, 6) +
      "." +
      d.slice(6, 9) +
      "-" +
      d.slice(9);
    return { ok: true, valor: formatado };
  }

  function telefone(valor) {
    const d = soDigitos(valor);
    if (d.length < 10 || d.length > 11) {
      return {
        ok: false,
        mensagem: "Informe um telefone com DDD (10 ou 11 dígitos).",
      };
    }
    if (d.length === 11) {
      return {
        ok: true,
        valor: "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7),
      };
    }
    return {
      ok: true,
      valor: "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6),
    };
  }

  function dataNascimento(valor) {
    const texto = String(valor || "").trim();
    if (!texto) {
      return { ok: false, mensagem: "Informe a data de nascimento." };
    }
    const partes = texto.split("-");
    if (partes.length !== 3) {
      return { ok: false, mensagem: "Data de nascimento inválida." };
    }
    const data = new Date(
      Number(partes[0]),
      Number(partes[1]) - 1,
      Number(partes[2]),
    );
    if (isNaN(data.getTime())) {
      return { ok: false, mensagem: "Data de nascimento inválida." };
    }
    const hoje = new Date();
    if (data > hoje) {
      return {
        ok: false,
        mensagem: "A data de nascimento não pode ser no futuro.",
      };
    }
    const idade = global.MedFlowAPI ? global.MedFlowAPI.idadeDe(texto) : 0;
    if (idade > 120) {
      return {
        ok: false,
        mensagem: "Verifique a data de nascimento informada.",
      };
    }
    return { ok: true, valor: texto };
  }

  function pressaoArterial(valor) {
    const texto = String(valor || "").trim();
    const match = texto.match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
    if (!match) {
      return {
        ok: false,
        mensagem: "Informe a pressão arterial no formato 120/80.",
      };
    }
    const sistolica = Number(match[1]);
    const diastolica = Number(match[2]);
    if (sistolica < FAIXAS.sistolica.min || sistolica > FAIXAS.sistolica.max) {
      return {
        ok: false,
        mensagem:
          "A pressão sistólica deve estar entre " +
          FAIXAS.sistolica.min +
          " e " +
          FAIXAS.sistolica.max +
          " mmHg.",
      };
    }
    if (
      diastolica < FAIXAS.diastolica.min ||
      diastolica > FAIXAS.diastolica.max
    ) {
      return {
        ok: false,
        mensagem:
          "A pressão diastólica deve estar entre " +
          FAIXAS.diastolica.min +
          " e " +
          FAIXAS.diastolica.max +
          " mmHg.",
      };
    }
    if (diastolica >= sistolica) {
      return {
        ok: false,
        mensagem: "A pressão diastólica precisa ser menor que a sistólica.",
      };
    }
    return { ok: true, valor: sistolica + "/" + diastolica };
  }

  function faixa(valor, regra, unidade) {
    const n = numero(valor);
    if (!Number.isFinite(n)) {
      return {
        ok: false,
        mensagem: "Informe um valor numérico válido para " + regra.rotulo + ".",
      };
    }
    if (n < regra.min || n > regra.max) {
      return {
        ok: false,
        mensagem:
          "A " +
          regra.rotulo +
          " deve estar entre " +
          regra.min +
          " e " +
          regra.max +
          " " +
          unidade +
          ".",
      };
    }
    return { ok: true, valor: n };
  }

  function textoFaixa(valor, min, max, rotulo) {
    const texto = String(valor || "").trim();
    if (texto.length < min) {
      return {
        ok: false,
        mensagem: rotulo + " deve ter no mínimo " + min + " caracteres.",
      };
    }
    if (texto.length > max) {
      return {
        ok: false,
        mensagem: rotulo + " deve ter no máximo " + max + " caracteres.",
      };
    }
    return { ok: true, valor: texto };
  }

  function paciente(dados) {
    const erros = {};
    const limpo = {};

    const nome = textoFaixa(dados.nome, 3, 80, "O nome");
    if (!nome.ok) erros.nome = nome.mensagem;
    else limpo.nome = nome.valor;

    const doc = cpf(dados.cpf);
    if (!doc.ok) erros.cpf = doc.mensagem;
    else limpo.cpf = doc.valor;

    const nasc = dataNascimento(dados.dataNascimento);
    if (!nasc.ok) erros.dataNascimento = nasc.mensagem;
    else limpo.dataNascimento = nasc.valor;

    if (dados.sexo !== "Feminino" && dados.sexo !== "Masculino") {
      erros.sexo = "Selecione o sexo do paciente.";
    } else {
      limpo.sexo = dados.sexo;
    }

    const fone = telefone(dados.telefone);
    if (!fone.ok) erros.telefone = fone.mensagem;
    else limpo.telefone = fone.valor;

    const emergencia = telefone(dados.telefoneEmergencia);
    if (!emergencia.ok) erros.telefoneEmergencia = emergencia.mensagem;
    else limpo.telefoneEmergencia = emergencia.valor;
    const camposExtras = {
      rg: 20,
      nomePai: 80,
      nomeMae: 80,
      cep: 9,
      logradouro: 120,
      numeroEndereco: 20,
      complemento: 80,
      bairro: 80,
      cidade: 80,
      uf: 2,
    };
    Object.keys(camposExtras).forEach(function (campo) {
      const resultado = textoFaixa(
        dados[campo],
        campo === "nomeMae" ? 3 : campo === "rg" ? 1 : 0,
        camposExtras[campo],
        campo === "nomeMae"
          ? "O nome da mãe"
          : campo === "rg"
            ? "O RG"
            : "O campo",
      );
      if (!resultado.ok) erros[campo] = resultado.mensagem;
      else limpo[campo] = resultado.valor;
    });
    if (limpo.cep && !/^\d{5}-?\d{3}$/.test(limpo.cep))
      erros.cep = "Informe um CEP com 8 dígitos.";
    if (limpo.uf) {
      limpo.uf = limpo.uf.toUpperCase();
      if (
        ![
          "AC",
          "AL",
          "AP",
          "AM",
          "BA",
          "CE",
          "DF",
          "ES",
          "GO",
          "MA",
          "MT",
          "MS",
          "MG",
          "PA",
          "PB",
          "PR",
          "PE",
          "PI",
          "RJ",
          "RN",
          "RS",
          "RO",
          "RR",
          "SC",
          "SP",
          "SE",
          "TO",
        ].includes(limpo.uf)
      )
        erros.uf = "Informe uma UF válida.";
    }
    const conv = textoFaixa(dados.convenio, 2, 40, "O convênio");
    if (!conv.ok) erros.convenio = conv.mensagem;
    else limpo.convenio = conv.valor;

    return { ok: Object.keys(erros).length === 0, erros: erros, dados: limpo };
  }

  function atendimentoRecepcao(dados) {
    const erros = {};
    const limpo = {};
    limpo.queixaPrincipal = "";
    return { ok: Object.keys(erros).length === 0, erros: erros, dados: limpo };
  }

  function triagem(dados) {
    const erros = {};
    const limpo = {};

    const pa = pressaoArterial(dados.pressaoArterial);
    if (!pa.ok) erros.pressaoArterial = pa.mensagem;
    else limpo.pressaoArterial = pa.valor;

    const temp = faixa(dados.temperatura, FAIXAS.temperatura, "°C");
    if (!temp.ok) erros.temperatura = temp.mensagem;
    else limpo.temperatura = Number(temp.valor.toFixed(1));

    const fc = faixa(
      dados.frequenciaCardiaca,
      FAIXAS.frequenciaCardiaca,
      "bpm",
    );
    if (!fc.ok) erros.frequenciaCardiaca = fc.mensagem;
    else limpo.frequenciaCardiaca = Math.round(fc.valor);

    const fr = faixa(
      dados.frequenciaRespiratoria,
      FAIXAS.frequenciaRespiratoria,
      "irpm",
    );
    if (!fr.ok) erros.frequenciaRespiratoria = fr.mensagem;
    else limpo.frequenciaRespiratoria = Math.round(fr.valor);

    const q = textoFaixa(
      dados.queixas,
      FAIXAS.queixas.min,
      FAIXAS.queixas.max,
      "As queixas",
    );
    if (!q.ok) erros.queixas = q.mensagem;
    else limpo.queixas = q.valor;

    return { ok: Object.keys(erros).length === 0, erros: erros, dados: limpo };
  }

  function classificacao(cor) {
    if (!cor) {
      return {
        ok: false,
        mensagem:
          "Selecione a classificação de risco conforme o Protocolo de Manchester.",
      };
    }
    const lista = (global.MedFlowAPI && global.MedFlowAPI.MANCHESTER) || [];
    const valida = lista.some(function (m) {
      return m.cor === cor;
    });
    if (!valida) {
      return {
        ok: false,
        mensagem:
          "A classificação selecionada não é reconhecida pelo protocolo.",
      };
    }
    return { ok: true, valor: cor };
  }

  function medicacao(dados) {
    const erros = {};
    const limpo = {};
    const nome = textoFaixa(dados.nome, 3, 80, "O nome da medicação");
    if (!nome.ok) erros.nome = nome.mensagem;
    else limpo.nome = nome.valor;
    const dose = textoFaixa(dados.dose, 1, 40, "A dose");
    if (!dose.ok) erros.dose = dose.mensagem;
    else limpo.dose = dose.valor;
    const via = textoFaixa(dados.via, 2, 10, "A via");
    if (!via.ok) erros.via = via.mensagem;
    else limpo.via = via.valor.toUpperCase();
    const freq = textoFaixa(dados.frequencia, 2, 30, "A frequência");
    if (!freq.ok) erros.frequencia = freq.mensagem;
    else limpo.frequencia = freq.valor;
    return { ok: Object.keys(erros).length === 0, erros: erros, dados: limpo };
  }

  function anotacoes(valor) {
    return textoFaixa(valor, 8, 1000, "As anotações da consulta");
  }

  global.MedFlowValidacao = {
    FAIXAS: FAIXAS,
    cpf: cpf,
    telefone: telefone,
    pressaoArterial: pressaoArterial,
    paciente: paciente,
    atendimentoRecepcao: atendimentoRecepcao,
    triagem: triagem,
    classificacao: classificacao,
    medicacao: medicacao,
    anotacoes: anotacoes,
  };
})(window);
