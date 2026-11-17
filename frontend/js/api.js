/**
 * Constantes compartilhadas pelas telas.
 * Os dados vêm do backend pelo cliente da API (js/clienteApi.js).
 */
(function (global) {
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

  // Idade em anos a partir de "AAAA-MM-DD".
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

  // Remove a base da antiga simulação local, se ainda existir no navegador.
  try {
    global.localStorage.removeItem("medflow.db.v2");
  } catch (e) {
    // Navegador sem acesso ao localStorage: nada a limpar.
  }

  global.MedFlowAPI = {
    STATUS: STATUS,
    MANCHESTER: MANCHESTER,
    idadeDe: idadeDe,
  };
})(window);
