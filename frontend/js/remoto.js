(function() {
  // All data operations and role authorization execute on the server.
  const nomes = ["listarPacientes","buscarPacientePorCpf","listarAtendimentosRecepcao","listarParaTriagem","listarFilaMedica","resumoFilaMedica","listarHistorico","obterPorNumero","salvarPacienteEAbrirAtendimento","alterarAtendimento","cancelarAtendimento","iniciarTriagem","salvarTriagem","salvarClassificacao","iniciarAtendimentoMedico","salvarConsultaMedica","adicionarMedicacao","removerMedicacao","confirmarAtendimentoMedico","excluirDados"];
  nomes.forEach(nome => MedFlowAPI[nome] = function(...args) { return MedFlowRequest("/api/operacao", {nome,args}); });
})();
