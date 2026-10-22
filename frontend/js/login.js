(function () {
  const el = id => document.getElementById(id);
  const token = new URLSearchParams(location.search).get("redefinir");
  let modo;
  function mostrar(novo) {
    modo = novo;
    const cadastro = modo === "cadastro", redefinir = modo === "redefinir", recuperar = modo === "recuperar";
    el("auth-titulo").textContent = cadastro ? "Criar conta" : recuperar ? "Esqueci a senha" : redefinir ? "Defina sua nova senha" : "Bem-vindo ao MedFlow";
    el("auth-descricao").textContent = cadastro ? "Cadastre seus dados e sua função para acessar o sistema." : recuperar ? "Informe o e-mail da sua conta para solicitar a recuperação." : redefinir ? "Escolha uma senha com pelo menos 5 caracteres." : "Entre com seu e-mail e senha para acessar sua área.";
    ["nome", "perfil", "email", "senha", "confirmar"].forEach(campo => {
      const visivel = campo === "nome" || campo === "perfil" ? cadastro : campo === "email" ? !redefinir : campo === "senha" ? !recuperar : cadastro || redefinir;
      el("campo-" + campo).classList.toggle("hidden", !visivel);
      el(campo).required = visivel; el(campo).disabled = !visivel;
    });
    el("senha").minLength = modo === "login" ? 1 : 5;
    el("senha").autocomplete = modo === "login" ? "current-password" : "new-password";
    el("senha").value = ""; el("confirmar").value = "";
    el("auth-enviar").textContent = cadastro ? "Criar conta" : recuperar ? "Solicitar recuperação" : redefinir ? "Salvar nova senha" : "Entrar";
    document.querySelectorAll("[data-modo]").forEach(b => b.classList.toggle("hidden", modo === "login" ? b.dataset.modo === "login" : b.dataset.modo !== "login"));
    el("login-erro").textContent = ""; el("login-mensagem").textContent = "";
  }
  document.querySelectorAll("[data-modo]").forEach(b => b.addEventListener("click", () => { if (modo === "redefinir") history.replaceState(null, "", "index.html"); mostrar(b.dataset.modo); }));
  el("login").addEventListener("submit", function (e) {
    e.preventDefault(); el("login-erro").textContent = ""; el("login-mensagem").textContent = "";
    try {
      if (modo === "login") { const sessao = MedFlowSessao.entrar(el("email").value, el("senha").value); location.href = sessao.inicio; return; }
      if ((modo === "cadastro" || modo === "redefinir") && el("senha").value !== el("confirmar").value) throw new Error("As senhas não coincidem.");
      let resposta;
      if (modo === "cadastro") resposta = MedFlowRequest("/api/cadastro", {nome:el("nome").value, email:el("email").value, perfil:el("perfil").value, senha:el("senha").value});
      if (modo === "recuperar") resposta = MedFlowRequest("/api/recuperar-senha", {email:el("email").value});
      if (modo === "redefinir") { resposta = MedFlowRequest("/api/redefinir-senha", {token, senha:el("senha").value}); history.replaceState(null, "", "index.html"); }
      if (modo !== "recuperar") mostrar("login");
      el("login-mensagem").textContent = resposta.mensagem;
    } catch (erro) { el("login-erro").textContent = erro.message; }
  });
  mostrar(token ? "redefinir" : "login");
  if (location.protocol === "file:") {
    const aviso = document.createElement("div");
    aviso.className = "servidor-aviso";
    aviso.setAttribute("role", "alert");
    aviso.innerHTML = '<strong>Inicie o MedFlow para acessar sua conta</strong><p>Na pasta do projeto, dê dois cliques em <b>Iniciar MedFlow.bat</b>. O sistema abrirá no navegador.</p><a href="http://localhost:8080">Abrir MedFlow em localhost:8080</a>';
    el("login").prepend(aviso);
  }
})();
