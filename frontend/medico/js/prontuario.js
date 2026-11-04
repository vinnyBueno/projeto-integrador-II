(function () {
  const sessao = MedFlowSessao.exigir(["medico"]);
  if (!sessao) return;
  const ui = MedFlowUI;
  ui.montarChrome("historico", sessao);
  const host = document.getElementById("conteudo-prontuario");
  const pacienteId = new URLSearchParams(location.search).get("paciente");
  const registros = MedFlowAPI.listarAtendimentosRecepcao().filter(
    function (item) {
      const consulta = item.atendimentoMedico;
      return (
        String(item.pacienteId) === pacienteId &&
        consulta &&
        (consulta.medicoEmail
          ? consulta.medicoEmail === sessao.email
          : consulta.medico === sessao.nome)
      );
    },
  );
  const voltar =
    '<p><a class="ghost" href="../historico.html">← Voltar ao histórico</a></p>';
  if (!registros.length) {
    host.innerHTML =
      voltar +
      '<div class="empty">Nenhuma consulta sua encontrada para este paciente.</div>';
    return;
  }
  function dado(rotulo, valor) {
    return (
      "<p><strong>" +
      ui.esc(rotulo) +
      ":</strong> " +
      ui.esc(valor == null || valor === "" ? "Não informado" : valor) +
      "</p>"
    );
  }
  const paciente = registros[0].paciente;
  host.innerHTML =
    voltar +
    '<h2>Prontuário do paciente</h2><section class="card">' +
    dado("Nome", paciente.nome) +
    dado("CPF", paciente.cpf) +
    dado("Data de nascimento", paciente.dataNascimento) +
    dado("Nome da mãe", paciente.nomeMae) +
    dado("Telefone", paciente.telefone) +
    dado("Telefone de emergência", paciente.telefoneEmergencia) +
    "</section>" +
    '<p class="help">Consultas realizadas por você, em modo de leitura.</p>' +
    registros
      .map(function (item) {
        const t = item.triagem || {};
        const c = item.atendimentoMedico;
        const classificacao = item.classificacao;
        return (
          '<section class="card prontuario-registro"><h3>Atendimento nº ' +
          ui.esc(item.numero) +
          "</h3>" +
          dado("Status", ui.rotuloStatus(item.status)) +
          dado("Médico", c.medico) +
          dado(
            "Início da consulta",
            c.inicioEm ? ui.formatarData(c.inicioEm) : "",
          ) +
          dado(
            "Encerramento",
            item.finalizadoEm ? ui.formatarData(item.finalizadoEm) : "",
          ) +
          "<h3>Triagem</h3>" +
          dado("Profissional de enfermagem", t.enfermeira) +
          dado("Pressão arterial (mmHg)", t.pressaoArterial) +
          dado("Temperatura (°C)", t.temperatura) +
          dado("Frequência cardíaca (bpm)", t.frequenciaCardiaca) +
          dado("Frequência respiratória (irpm)", t.frequenciaRespiratoria) +
          dado("Queixas", t.queixas || item.queixaPrincipal) +
          dado(
            "Classificação registrada",
            classificacao
              ? classificacao.nome + " · " + classificacao.nivel
              : "",
          ) +
          '<h3>Consulta médica</h3><div class="prontuario-texto">' +
          dado("Anotações", c.anotacoes) +
          "</div>" +
          "<h3>Medicações</h3>" +
          (item.medicacoes.length
            ? "<ul>" +
              item.medicacoes
                .map(function (m) {
                  return (
                    "<li>" +
                    ui.esc(
                      m.nome +
                        " — " +
                        m.dose +
                        " · " +
                        m.via +
                        " · " +
                        m.frequencia,
                    ) +
                    "</li>"
                  );
                })
                .join("") +
              "</ul>"
            : "<p>Nenhuma medicação registrada.</p>") +
          "</section>"
        );
      })
      .join("");
})();
