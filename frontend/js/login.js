(function () {
  const el = function (id) {
    return document.getElementById(id);
  };
  el("login").addEventListener("submit", function (evento) {
    evento.preventDefault();
    el("login-erro").textContent = "";
    try {
      const sessao = MedFlowSessao.entrar(el("email").value, el("senha").value);
      location.href = sessao.inicio;
    } catch (erro) {
      el("login-erro").textContent = erro.message;
    }
  });
})();
