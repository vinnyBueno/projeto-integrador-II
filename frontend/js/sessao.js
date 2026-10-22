(function(global) {
  function request(path, dados) {
    if (global.location.protocol === "file:") throw new Error("Para entrar, execute Iniciar MedFlow.bat e acesse http://localhost:8080. O login precisa do servidor do sistema.");
    const xhr = new XMLHttpRequest();
    xhr.open(dados === undefined ? "GET" : "POST", path, false);
    xhr.setRequestHeader("Content-Type", "application/json");
    try { xhr.send(dados === undefined ? null : JSON.stringify(dados)); }
    catch (erro) { throw new Error("Não foi possível conectar ao MedFlow. Execute Iniciar MedFlow.bat e acesse http://localhost:8080."); }
    if (!(xhr.getResponseHeader("Content-Type") || "").includes("application/json")) throw new Error("Abra o sistema em http://localhost:8080 após executar Iniciar MedFlow.bat. O Live Server não executa o login.");
    const result = JSON.parse(xhr.responseText || "{}");
    if (xhr.status >= 400) throw new Error(result.erro || "Não foi possível acessar o servidor.");
    return result;
  }
  function obter() { try { return request("/api/sessao"); } catch(e) { return null; } }
  function exigir(perfis) {
    const user = obter();
    if (!user) { location.replace("index.html"); return null; }
    if (perfis && !perfis.includes(user.id)) { location.replace(user.inicio); return null; }
    return user;
  }
  global.MedFlowSessao = {obter, exigir, entrar:(email,senha)=>request("/api/login",{email,senha}), sair:()=>request("/api/logout",{})};
  global.MedFlowRequest = request;
})(window);
