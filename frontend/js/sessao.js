(function (global) {
  // Acesso demonstrativo do frontend; substituir pela API do grupo na integração.
  const chave = "medflow.sessao.demo";
  const perfis = [
    {
      email: "recepcionista@email.com",
      nome: "Recepcionista",
      id: "recepcao",
      cargo: "Recepcionista",
      inicio: "recepcao.html",
      iniciais: "RE",
    },
    {
      email: "enfermeiro@email.com",
      nome: "Enfermeira(o)",
      id: "enfermagem",
      cargo: "Enfermagem",
      inicio: "pacientes.html",
      iniciais: "EN",
    },
    {
      email: "medico@email.com",
      nome: "Médico(a)",
      id: "medico",
      cargo: "Médico",
      inicio: "fila.html",
      iniciais: "ME",
    },
  ];
  function obter() {
    const email = sessionStorage.getItem(chave);
    return (
      perfis.find(function (perfil) {
        return perfil.email === email;
      }) || null
    );
  }
  function entrar(email, senha) {
    const usuario = perfis.find(function (perfil) {
      return perfil.email === email.trim().toLowerCase();
    });
    if (!usuario || senha !== "12345")
      throw new Error("Use um dos e-mails de demonstração e a senha 12345.");
    sessionStorage.setItem(chave, usuario.email);
    return usuario;
  }
  function exigir(perfisPermitidos) {
    const usuario = obter();
    if (!usuario) {
      global.location.replace("index.html");
      return null;
    }
    if (perfisPermitidos && !perfisPermitidos.includes(usuario.id)) {
      global.location.replace(usuario.inicio);
      return null;
    }
    return usuario;
  }
  global.MedFlowSessao = {
    obter: obter,
    exigir: exigir,
    entrar: entrar,
    sair: function () {
      sessionStorage.removeItem(chave);
    },
  };
})(window);
