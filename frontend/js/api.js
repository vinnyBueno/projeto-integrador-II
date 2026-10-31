/**
 * Camada de dados (simula banco relacional no navegador).
 * Tabelas: pacientes, atendimentos, triagens, classificacoes,
 * atendimentosMedicos, medicacoes.
 */
(function (global) {
  const STORAGE_KEY = "medflow.db.v2";

  const STATUS = {
    AGUARDANDO_TRIAGEM: "AGUARDANDO_TRIAGEM",
    EM_TRIAGEM: "EM_TRIAGEM",
    AGUARDANDO_ATENDIMENTO_MEDICO: "AGUARDANDO_ATENDIMENTO_MEDICO",
    EM_ATENDIMENTO_MEDICO: "EM_ATENDIMENTO_MEDICO",
    FINALIZADO: "FINALIZADO",
    CANCELADO: "CANCELADO",
  };

  const MANCHESTER = [
    {
      cor: "vermelho",
      nome: "Vermelho",
      nivel: "Emergência",
      prazo: "Atendimento imediato",
      ordem: 1,
      prioridade: "Alta",
    },
    {
      cor: "laranja",
      nome: "Laranja",
      nivel: "Muito urgente",
      prazo: "Atendimento em até 10 min",
      ordem: 2,
      prioridade: "Muito alta",
    },
    {
      cor: "amarelo",
      nome: "Amarelo",
      nivel: "Urgente",
      prazo: "Atendimento em até 60 min",
      ordem: 3,
      prioridade: "Urgente",
    },
    {
      cor: "verde",
      nome: "Verde",
      nivel: "Pouco urgente",
      prazo: "Atendimento em até 120 min",
      ordem: 4,
      prioridade: "Pouco urgente",
    },
    {
      cor: "azul",
      nome: "Azul",
      nivel: "Não urgente",
      prazo: "Atendimento em até 240 min",
      ordem: 5,
      prioridade: "Não urgente",
    },
  ];

  const CATALOGO_MEDICACOES = [
    {
      nome: "Dipirona 500mg",
      dose: "1 comprimido",
      via: "VO",
      frequencia: "8/8h",
    },
    {
      nome: "Paracetamol 750mg",
      dose: "1 comprimido",
      via: "VO",
      frequencia: "6/6h",
    },
    {
      nome: "Ibuprofeno 400mg",
      dose: "1 comprimido",
      via: "VO",
      frequencia: "8/8h",
    },
    {
      nome: "Omeprazol 20mg",
      dose: "1 comprimido",
      via: "VO",
      frequencia: "1x ao dia",
    },
    {
      nome: "Soro Fisiológico 0,9%",
      dose: "500 ml",
      via: "EV",
      frequencia: "8/8h",
    },
    { nome: "Dipirona 1g", dose: "1 ampola", via: "EV", frequencia: "6/6h" },
    {
      nome: "Ondansetrona 8mg",
      dose: "1 comprimido",
      via: "VO",
      frequencia: "8/8h",
    },
    {
      nome: "Captopril 25mg",
      dose: "1 comprimido",
      via: "SL",
      frequencia: "Dose única",
    },
    {
      nome: "Salbutamol spray",
      dose: "2 jatos",
      via: "IN",
      frequencia: "Se necessário",
    },
    {
      nome: "Amoxicilina 500mg",
      dose: "1 cápsula",
      via: "VO",
      frequencia: "8/8h",
    },
  ];

  function nomeProfissional() {
    const usuario = global.MedFlowSessao && global.MedFlowSessao.obter();
    if (!usuario)
      throw new Error("Entre novamente para registrar o atendimento.");
    return usuario.nome;
  }

  function agoraIso() {
    return new Date().toISOString();
  }

  function minutosAtras(min) {
    return new Date(Date.now() - min * 60 * 1000).toISOString();
  }

  function semente() {
    return {
      pacientes: [],
      atendimentos: [],
      triagens: [],
      classificacoes: [],
      atendimentosMedicos: [],
      medicacoes: [],
      sequencias: {
        paciente: 1,
        atendimento: 1,
        numero: 1,
        triagem: 1,
        classificacao: 1,
        medico: 1,
        medicacao: 1,
      },
    };
  }

  function garantirIntegridade(db) {
    if (!db.pacientes || !db.atendimentos) {
      throw new Error("Base de dados incompleta.");
    }
    db.triagens = db.triagens || [];
    db.classificacoes = db.classificacoes || [];
    db.atendimentosMedicos = db.atendimentosMedicos || [];
    db.medicacoes = db.medicacoes || [];
    db.sequencias = db.sequencias || {};

    db.atendimentos.forEach(function (a) {
      const paciente = db.pacientes.filter(function (p) {
        return p.id === a.pacienteId;
      })[0];
      if (!paciente) {
        throw new Error("Integridade: atendimento sem paciente vinculado.");
      }
      if (a.triagemId) {
        const triagem = db.triagens.filter(function (t) {
          return t.id === a.triagemId;
        })[0];
        if (!triagem || triagem.atendimentoId !== a.id) {
          throw new Error("Integridade: triagem órfã ou inconsistente.");
        }
      }
      if (a.classificacaoId) {
        const classe = db.classificacoes.filter(function (c) {
          return c.id === a.classificacaoId;
        })[0];
        if (!classe || classe.atendimentoId !== a.id) {
          throw new Error("Integridade: classificação órfã ou inconsistente.");
        }
      }
      if (a.atendimentoMedicoId) {
        const medico = db.atendimentosMedicos.filter(function (m) {
          return m.id === a.atendimentoMedicoId;
        })[0];
        if (!medico || medico.atendimentoId !== a.id) {
          throw new Error(
            "Integridade: atendimento médico órfão ou inconsistente.",
          );
        }
      }
    });

    db.triagens.forEach(function (t) {
      const a = db.atendimentos.filter(function (x) {
        return x.id === t.atendimentoId;
      })[0];
      if (!a) throw new Error("Integridade: triagem sem atendimento.");
    });
    db.classificacoes.forEach(function (c) {
      const a = db.atendimentos.filter(function (x) {
        return x.id === c.atendimentoId;
      })[0];
      if (!a) throw new Error("Integridade: classificação sem atendimento.");
    });
    db.atendimentosMedicos.forEach(function (m) {
      const a = db.atendimentos.filter(function (x) {
        return x.id === m.atendimentoId;
      })[0];
      if (!a) throw new Error("Integridade: consulta médica sem atendimento.");
    });
    db.medicacoes.forEach(function (med) {
      const m = db.atendimentosMedicos.filter(function (x) {
        return x.id === med.atendimentoMedicoId;
      })[0];
      if (!m) throw new Error("Integridade: medicação sem atendimento médico.");
    });
  }

  function carregar() {
    try {
      const bruto = localStorage.getItem(STORAGE_KEY);
      if (!bruto) {
        const db = semente();
        salvar(db);
        return db;
      }
      const db = JSON.parse(bruto);
      garantirIntegridade(db);
      return db;
    } catch (erro) {
      console.warn("MedFlow: base inválida, restaurando semente.", erro);
      const db = semente();
      salvar(db);
      return db;
    }
  }

  function salvar(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function transacao(trabalho) {
    const atual = carregar();
    const copia = JSON.parse(JSON.stringify(atual));
    try {
      const resultado = trabalho(atual);
      garantirIntegridade(atual);
      salvar(atual);
      return resultado;
    } catch (erro) {
      salvar(copia);
      throw erro;
    }
  }

  function idadeDe(dataNascimento) {
    if (!dataNascimento) return 0;
    const partes = String(dataNascimento).split("-");
    if (partes.length !== 3) return 0;
    const nasc = new Date(
      Number(partes[0]),
      Number(partes[1]) - 1,
      Number(partes[2]),
    );
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade -= 1;
    return idade;
  }

  function bloquearSeEncerrado(atendimento) {
    if (atendimento.status === STATUS.FINALIZADO) {
      throw new Error(
        "Este atendimento já foi concluído e não pode ser alterado ou cancelado.",
      );
    }
    if (atendimento.status === STATUS.CANCELADO) {
      throw new Error(
        "Este atendimento foi cancelado e não pode ser alterado.",
      );
    }
  }

  function enriquecer(atendimento, db) {
    const paciente = db.pacientes.filter(function (p) {
      return p.id === atendimento.pacienteId;
    })[0];
    const triagem =
      db.triagens.filter(function (t) {
        return t.atendimentoId === atendimento.id;
      })[0] || null;
    const classificacao =
      db.classificacoes.filter(function (c) {
        return c.atendimentoId === atendimento.id;
      })[0] || null;
    const atendimentoMedico =
      db.atendimentosMedicos.filter(function (m) {
        return m.atendimentoId === atendimento.id;
      })[0] || null;
    const medicacoes = atendimentoMedico
      ? db.medicacoes.filter(function (x) {
          return x.atendimentoMedicoId === atendimentoMedico.id;
        })
      : [];
    let protocolo = classificacao
      ? MANCHESTER.filter(function (m) {
          return m.cor === classificacao.cor;
        })[0]
      : null;
    const espera = Math.max(
      0,
      (Date.now() - new Date(atendimento.criadoEm).getTime()) / 60000,
    );
    if (protocolo) {
      const limite = { laranja: 10, amarelo: 60, verde: 120, azul: 240 }[
        protocolo.cor
      ];
      if (limite && espera >= limite)
        protocolo =
          MANCHESTER[
            Math.max(0, protocolo.ordem - 1 - Math.floor(espera / limite))
          ];
    }
    const pacienteCheio = paciente
      ? Object.assign({}, paciente, { idade: idadeDe(paciente.dataNascimento) })
      : null;
    return Object.assign({}, atendimento, {
      paciente: pacienteCheio,
      prioridadeRecepcao:
        espera >= 30 ? "Alta" : espera >= 15 ? "Média" : "Baixa",
      triagem: triagem,
      classificacao: classificacao,
      atendimentoMedico: atendimentoMedico,
      medicacoes: medicacoes,
      protocolo: protocolo,
      tempoEsperaMin: Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(atendimento.criadoEm).getTime()) / 60000,
        ),
      ),
    });
  }

  function proximoNumero(db) {
    const n = db.sequencias.numero++;
    return String(n);
  }

  const api = {
    STATUS: STATUS,
    MANCHESTER: MANCHESTER,
    CATALOGO_MEDICACOES: CATALOGO_MEDICACOES,
    idadeDe: idadeDe,

    listarPacientes: function () {
      const db = carregar();
      return db.pacientes.map(function (p) {
        return Object.assign({}, p, { idade: idadeDe(p.dataNascimento) });
      });
    },

    buscarPacientePorCpf: function (cpf) {
      const db = carregar();
      const limpo = String(cpf || "").trim();
      const encontrado = db.pacientes.filter(function (p) {
        return p.cpf === limpo;
      })[0];
      if (!encontrado) return null;
      return Object.assign({}, encontrado, {
        idade: idadeDe(encontrado.dataNascimento),
      });
    },

    listarAtendimentosRecepcao: function () {
      const db = carregar();
      return db.atendimentos
        .map(function (a) {
          return enriquecer(a, db);
        })
        .sort(function (a, b) {
          return new Date(b.criadoEm) - new Date(a.criadoEm);
        });
    },

    listarParaTriagem: function () {
      const db = carregar();
      return db.atendimentos
        .filter(function (a) {
          return (
            a.status === STATUS.AGUARDANDO_TRIAGEM ||
            a.status === STATUS.EM_TRIAGEM
          );
        })
        .map(function (a) {
          return enriquecer(a, db);
        })
        .sort(function (a, b) {
          return new Date(a.criadoEm) - new Date(b.criadoEm);
        });
    },

    listarFilaMedica: function () {
      const db = carregar();
      return db.atendimentos
        .filter(function (a) {
          return (
            a.status === STATUS.AGUARDANDO_ATENDIMENTO_MEDICO ||
            a.status === STATUS.EM_ATENDIMENTO_MEDICO
          );
        })
        .map(function (a) {
          return enriquecer(a, db);
        })
        .sort(function (a, b) {
          const ordemA = a.protocolo ? a.protocolo.ordem : 99;
          const ordemB = b.protocolo ? b.protocolo.ordem : 99;
          if (ordemA !== ordemB) return ordemA - ordemB;
          return new Date(a.criadoEm) - new Date(b.criadoEm);
        });
    },

    resumoFilaMedica: function () {
      const fila = api.listarFilaMedica().filter(function (a) {
        return a.status === STATUS.AGUARDANDO_ATENDIMENTO_MEDICO;
      });
      const resumo = {};
      MANCHESTER.forEach(function (m) {
        resumo[m.cor] = fila.filter(function (a) {
          return a.protocolo && a.protocolo.cor === m.cor;
        }).length;
      });
      resumo.total = fila.length;
      return resumo;
    },

    listarHistorico: function () {
      const db = carregar();
      return db.atendimentos
        .filter(function (a) {
          return (
            a.status === STATUS.FINALIZADO || a.status === STATUS.CANCELADO
          );
        })
        .map(function (a) {
          return enriquecer(a, db);
        })
        .sort(function (a, b) {
          return (
            new Date(b.atualizadoEm || b.criadoEm) -
            new Date(a.atualizadoEm || a.criadoEm)
          );
        });
    },

    obterPorNumero: function (numero) {
      const db = carregar();
      const atendimento = db.atendimentos.filter(function (a) {
        return String(a.numero) === String(numero);
      })[0];
      if (!atendimento) return null;
      return enriquecer(atendimento, db);
    },

    salvarPacienteEAbrirAtendimento: function (
      dadosPaciente,
      dadosAtendimento,
    ) {
      return transacao(function (db) {
        let paciente = db.pacientes.filter(function (p) {
          return p.cpf === dadosPaciente.cpf;
        })[0];
        if (!paciente) {
          paciente = {
            id: db.sequencias.paciente++,
            nome: dadosPaciente.nome,
            cpf: dadosPaciente.cpf,
            dataNascimento: dadosPaciente.dataNascimento,
            sexo: dadosPaciente.sexo,
            telefone: dadosPaciente.telefone,
            convenio: dadosPaciente.convenio,
          };
          db.pacientes.push(paciente);
        } else {
          paciente.nome = dadosPaciente.nome;
          paciente.dataNascimento = dadosPaciente.dataNascimento;
          paciente.sexo = dadosPaciente.sexo;
          paciente.telefone = dadosPaciente.telefone;
          paciente.convenio = dadosPaciente.convenio;
        }

        [
          "telefoneEmergencia",
          "rg",
          "nomePai",
          "nomeMae",
          "cep",
          "logradouro",
          "numeroEndereco",
          "complemento",
          "bairro",
          "cidade",
          "uf",
        ].forEach(function (campo) {
          paciente[campo] = dadosPaciente[campo] || "";
        });

        const aberto = db.atendimentos.filter(function (a) {
          return (
            a.pacienteId === paciente.id &&
            a.status !== STATUS.FINALIZADO &&
            a.status !== STATUS.CANCELADO
          );
        })[0];
        if (aberto) {
          throw new Error(
            "Este paciente já possui um atendimento em aberto (nº " +
              aberto.numero +
              "). Finalize ou cancele o anterior antes de abrir outro.",
          );
        }

        const atendimento = {
          id: db.sequencias.atendimento++,
          numero: proximoNumero(db),
          pacienteId: paciente.id,
          queixaPrincipal: dadosAtendimento.queixaPrincipal,
          status: STATUS.AGUARDANDO_TRIAGEM,
          criadoEm: agoraIso(),
          atualizadoEm: agoraIso(),
          triagemId: null,
          classificacaoId: null,
          atendimentoMedicoId: null,
          canceladoEm: null,
          finalizadoEm: null,
        };
        db.atendimentos.push(atendimento);
        return enriquecer(atendimento, db);
      });
    },

    alterarAtendimento: function (atendimentoId, dados, dadosPaciente) {
      return transacao(function (db) {
        const atendimento = db.atendimentos.filter(function (a) {
          return a.id === atendimentoId;
        })[0];
        if (!atendimento) throw new Error("Atendimento não encontrado.");
        bloquearSeEncerrado(atendimento);
        if (atendimento.status !== STATUS.AGUARDANDO_TRIAGEM) {
          throw new Error(
            "Só é possível alterar um atendimento que ainda aguarda a triagem.",
          );
        }
        if (dadosPaciente) {
          const paciente = db.pacientes.find(
            (p) => p.id === atendimento.pacienteId,
          );
          if (
            db.pacientes.some(
              (p) => p.id !== paciente.id && p.cpf === dadosPaciente.cpf,
            )
          )
            throw new Error("CPF já cadastrado.");
          Object.assign(paciente, dadosPaciente);
        }
        atendimento.queixaPrincipal = dados.queixaPrincipal;
        atendimento.atualizadoEm = agoraIso();
        return enriquecer(atendimento, db);
      });
    },

    cancelarAtendimento: function (atendimentoId) {
      return transacao(function (db) {
        const atendimento = db.atendimentos.filter(function (a) {
          return a.id === atendimentoId;
        })[0];
        if (!atendimento) throw new Error("Atendimento não encontrado.");
        bloquearSeEncerrado(atendimento);
        if (
          atendimento.status === STATUS.EM_ATENDIMENTO_MEDICO ||
          atendimento.status === STATUS.AGUARDANDO_ATENDIMENTO_MEDICO
        ) {
          throw new Error(
            "Não é possível cancelar um atendimento que já está na fila ou em consulta médica.",
          );
        }
        atendimento.status = STATUS.CANCELADO;
        atendimento.canceladoEm = agoraIso();
        atendimento.atualizadoEm = agoraIso();
        return enriquecer(atendimento, db);
      });
    },

    iniciarTriagem: function (atendimentoId) {
      return transacao(function (db) {
        const atendimento = db.atendimentos.filter(function (a) {
          return a.id === atendimentoId;
        })[0];
        if (!atendimento) throw new Error("Atendimento não encontrado.");
        bloquearSeEncerrado(atendimento);
        if (
          atendimento.status === STATUS.AGUARDANDO_ATENDIMENTO_MEDICO ||
          atendimento.status === STATUS.EM_ATENDIMENTO_MEDICO
        ) {
          throw new Error("A triagem deste atendimento já foi concluída.");
        }
        if (atendimento.status === STATUS.AGUARDANDO_TRIAGEM) {
          atendimento.status = STATUS.EM_TRIAGEM;
          atendimento.atualizadoEm = agoraIso();
        }
        return enriquecer(atendimento, db);
      });
    },

    salvarTriagem: function (atendimentoId, dados) {
      return transacao(function (db) {
        const atendimento = db.atendimentos.filter(function (a) {
          return a.id === atendimentoId;
        })[0];
        if (!atendimento) throw new Error("Atendimento não encontrado.");
        bloquearSeEncerrado(atendimento);
        if (
          atendimento.status === STATUS.AGUARDANDO_ATENDIMENTO_MEDICO ||
          atendimento.status === STATUS.EM_ATENDIMENTO_MEDICO
        ) {
          throw new Error(
            "Não é possível alterar a triagem deste atendimento no estado atual.",
          );
        }

        let triagem = db.triagens.filter(function (t) {
          return t.atendimentoId === atendimento.id;
        })[0];
        if (!triagem) {
          triagem = {
            id: db.sequencias.triagem++,
            atendimentoId: atendimento.id,
            registradoEm: agoraIso(),
            enfermeira: nomeProfissional(),
          };
          db.triagens.push(triagem);
        }

        triagem.pressaoArterial = dados.pressaoArterial;
        triagem.temperatura = dados.temperatura;
        triagem.frequenciaCardiaca = dados.frequenciaCardiaca;
        triagem.frequenciaRespiratoria = dados.frequenciaRespiratoria;
        triagem.queixas = dados.queixas;
        triagem.atualizadoEm = agoraIso();

        atendimento.triagemId = triagem.id;
        atendimento.status = STATUS.EM_TRIAGEM;
        atendimento.atualizadoEm = agoraIso();
        return enriquecer(atendimento, db);
      });
    },

    salvarClassificacao: function (atendimentoId, cor) {
      return transacao(function (db) {
        const atendimento = db.atendimentos.filter(function (a) {
          return a.id === atendimentoId;
        })[0];
        if (!atendimento) throw new Error("Atendimento não encontrado.");
        bloquearSeEncerrado(atendimento);
        if (atendimento.status === STATUS.EM_ATENDIMENTO_MEDICO) {
          throw new Error("Este atendimento já está em consulta médica.");
        }

        const triagem = db.triagens.filter(function (t) {
          return t.atendimentoId === atendimento.id;
        })[0];
        if (!triagem) {
          throw new Error(
            "Registre os sinais vitais e as queixas antes de classificar o risco.",
          );
        }

        const protocolo = MANCHESTER.filter(function (m) {
          return m.cor === cor;
        })[0];
        if (!protocolo)
          throw new Error(
            "Selecione uma classificação válida do Protocolo de Manchester.",
          );

        let classificacao = db.classificacoes.filter(function (c) {
          return c.atendimentoId === atendimento.id;
        })[0];
        if (!classificacao) {
          classificacao = {
            id: db.sequencias.classificacao++,
            atendimentoId: atendimento.id,
            registradoEm: agoraIso(),
          };
          db.classificacoes.push(classificacao);
        }

        classificacao.cor = protocolo.cor;
        classificacao.nome = protocolo.nome;
        classificacao.nivel = protocolo.nivel;
        classificacao.prazo = protocolo.prazo;
        classificacao.ordem = protocolo.ordem;
        classificacao.atualizadoEm = agoraIso();

        atendimento.classificacaoId = classificacao.id;
        atendimento.status = STATUS.AGUARDANDO_ATENDIMENTO_MEDICO;
        atendimento.atualizadoEm = agoraIso();
        return enriquecer(atendimento, db);
      });
    },

    iniciarAtendimentoMedico: function (atendimentoId) {
      return transacao(function (db) {
        const atendimento = db.atendimentos.filter(function (a) {
          return a.id === atendimentoId;
        })[0];
        if (!atendimento) throw new Error("Atendimento não encontrado.");
        bloquearSeEncerrado(atendimento);
        if (
          atendimento.status !== STATUS.AGUARDANDO_ATENDIMENTO_MEDICO &&
          atendimento.status !== STATUS.EM_ATENDIMENTO_MEDICO
        ) {
          throw new Error(
            "Este paciente ainda não está disponível na fila médica.",
          );
        }

        let consulta = db.atendimentosMedicos.filter(function (m) {
          return m.atendimentoId === atendimento.id;
        })[0];
        if (!consulta) {
          consulta = {
            id: db.sequencias.medico++,
            atendimentoId: atendimento.id,
            medico: nomeProfissional(),
            medicoEmail: global.MedFlowSessao.obter().email,
            inicioEm: agoraIso(),
            anotacoes: "",
            confirmado: false,
          };
          db.atendimentosMedicos.push(consulta);
        }
        atendimento.atendimentoMedicoId = consulta.id;
        atendimento.status = STATUS.EM_ATENDIMENTO_MEDICO;
        atendimento.atualizadoEm = agoraIso();
        return enriquecer(atendimento, db);
      });
    },

    salvarConsultaMedica: function (atendimentoId, anotacoes) {
      return transacao(function (db) {
        const atendimento = db.atendimentos.filter(function (a) {
          return a.id === atendimentoId;
        })[0];
        if (!atendimento) throw new Error("Atendimento não encontrado.");
        bloquearSeEncerrado(atendimento);
        if (atendimento.status !== STATUS.EM_ATENDIMENTO_MEDICO) {
          throw new Error(
            "Abra o atendimento médico antes de registrar a conduta.",
          );
        }
        const consulta = db.atendimentosMedicos.filter(function (m) {
          return m.atendimentoId === atendimento.id;
        })[0];
        if (!consulta) throw new Error("Consulta médica não encontrada.");
        consulta.anotacoes = anotacoes;
        consulta.atualizadoEm = agoraIso();
        atendimento.atualizadoEm = agoraIso();
        return enriquecer(atendimento, db);
      });
    },

    adicionarMedicacao: function (atendimentoId, dados) {
      return transacao(function (db) {
        const atendimento = db.atendimentos.filter(function (a) {
          return a.id === atendimentoId;
        })[0];
        if (!atendimento) throw new Error("Atendimento não encontrado.");
        bloquearSeEncerrado(atendimento);
        if (atendimento.status !== STATUS.EM_ATENDIMENTO_MEDICO) {
          throw new Error(
            "Só é possível prescrever medicação em um atendimento médico aberto.",
          );
        }
        const consulta = db.atendimentosMedicos.filter(function (m) {
          return m.atendimentoId === atendimento.id;
        })[0];
        if (!consulta)
          throw new Error(
            "Abra a consulta médica antes de incluir medicações.",
          );
        db.medicacoes.push({
          id: db.sequencias.medicacao++,
          atendimentoMedicoId: consulta.id,
          nome: dados.nome,
          dose: dados.dose,
          via: dados.via,
          frequencia: dados.frequencia,
          registradoEm: agoraIso(),
        });
        atendimento.atualizadoEm = agoraIso();
        return enriquecer(atendimento, db);
      });
    },

    removerMedicacao: function (atendimentoId, medicacaoId) {
      return transacao(function (db) {
        const atendimento = db.atendimentos.filter(function (a) {
          return a.id === atendimentoId;
        })[0];
        if (!atendimento) throw new Error("Atendimento não encontrado.");
        bloquearSeEncerrado(atendimento);
        if (atendimento.status !== STATUS.EM_ATENDIMENTO_MEDICO) {
          throw new Error(
            "Não é possível alterar medicações de um atendimento encerrado.",
          );
        }
        db.medicacoes = db.medicacoes.filter(function (m) {
          return m.id !== medicacaoId;
        });
        return enriquecer(atendimento, db);
      });
    },

    confirmarAtendimentoMedico: function (atendimentoId) {
      return transacao(function (db) {
        const atendimento = db.atendimentos.filter(function (a) {
          return a.id === atendimentoId;
        })[0];
        if (!atendimento) throw new Error("Atendimento não encontrado.");
        bloquearSeEncerrado(atendimento);
        if (atendimento.status !== STATUS.EM_ATENDIMENTO_MEDICO) {
          throw new Error("Inicie o atendimento médico antes de confirmá-lo.");
        }
        const consulta = db.atendimentosMedicos.filter(function (m) {
          return m.atendimentoId === atendimento.id;
        })[0];
        if (!consulta) throw new Error("Consulta médica não encontrada.");
        const meds = db.medicacoes.filter(function (m) {
          return m.atendimentoMedicoId === consulta.id;
        });
        if (
          !consulta.anotacoes ||
          String(consulta.anotacoes).trim().length < 8
        ) {
          throw new Error(
            "Registre as anotações da consulta antes de finalizar.",
          );
        }

        consulta.confirmado = true;
        consulta.fimEm = agoraIso();
        atendimento.status = STATUS.FINALIZADO;
        atendimento.finalizadoEm = agoraIso();
        atendimento.atualizadoEm = agoraIso();
        return enriquecer(atendimento, db);
      });
    },

    excluirDados: function () {
      const db = semente();
      [
        "pacientes",
        "atendimentos",
        "triagens",
        "classificacoes",
        "atendimentosMedicos",
        "medicacoes",
      ].forEach((k) => (db[k] = []));
      salvar(db);
      return db;
    },
  };

  global.MedFlowAPI = api;
})(window);
