"""MedFlow: servidor local com autenticação e persistência SQLite."""
from contextlib import contextmanager
import argparse
import getpass
import hashlib
import hmac
import json
import secrets
import sqlite3
import subprocess
import time
import threading
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler
from http.cookies import SimpleCookie
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
DB = ROOT / "medflow.sqlite3"
ROLES = {"recepcao": ("Recepcionista", "recepcao.html"), "enfermagem": ("Enfermagem", "pacientes.html"), "medico": ("Médico", "fila.html")}
READ = {"listarPacientes", "buscarPacientePorCpf", "listarAtendimentosRecepcao", "listarHistorico", "obterPorNumero"}
ALLOW = {
 "recepcao": READ | {"salvarPacienteEAbrirAtendimento", "alterarAtendimento", "cancelarAtendimento"},
 "enfermagem": READ | {"listarParaTriagem", "listarFilaMedica", "iniciarTriagem", "salvarTriagem", "salvarClassificacao"},
 "medico": READ | {"listarFilaMedica", "resumoFilaMedica", "iniciarAtendimentoMedico", "salvarConsultaMedica", "adicionarMedicacao", "removerMedicacao", "confirmarAtendimentoMedico"},
}
PAGES = {"recepcao.html": "recepcao", "pacientes.html": "enfermagem", "triagem.html": "enfermagem", "fila.html": "medico", "atendimento.html": "medico"}

@contextmanager
def connect():
 db = sqlite3.connect(DB)
 try:
  with db: yield db
 finally: db.close()

def init():
 with connect() as db:
  db.execute("CREATE TABLE IF NOT EXISTS usuarios (email TEXT PRIMARY KEY, nome TEXT NOT NULL, perfil TEXT NOT NULL, salt TEXT NOT NULL, senha TEXT NOT NULL)")
  db.execute("CREATE TABLE IF NOT EXISTS sessoes (token TEXT PRIMARY KEY, email TEXT NOT NULL, expira REAL NOT NULL)")
  db.execute("CREATE TABLE IF NOT EXISTS recuperacoes (token TEXT PRIMARY KEY, email TEXT NOT NULL, expira REAL NOT NULL)")
  db.execute("CREATE TABLE IF NOT EXISTS estado (id INTEGER PRIMARY KEY CHECK(id=1), dados TEXT NOT NULL)")

  for email,nome,perfil in [("recepcionista@email.com","Recepcionista","recepcao"),("enfermeira@email.com","Enfermeira","enfermagem"),("medico@email.com","Médico","medico")]:
   if not db.execute("SELECT 1 FROM usuarios WHERE email=?",(email,)).fetchone():
    salt=secrets.token_hex(16)
    db.execute("INSERT INTO usuarios VALUES (?,?,?,?,?)",(email,nome,perfil,salt,password("12345",salt)))

def password(value, salt):
 return hashlib.pbkdf2_hmac("sha256", value.encode(), bytes.fromhex(salt), 600000).hex()

def public(row):
 email,nome,perfil,*_ = row
 return {"email":email,"nome":nome,"id":perfil,"cargo":ROLES[perfil][0],"inicio":ROLES[perfil][1],"iniciais":"".join(x[0] for x in nome.split()[:2]).upper()}

class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):
  super().__init__(*args,directory=str(ROOT),**kwargs)
 def user(self):
  try:
   cookie=SimpleCookie(self.headers.get("Cookie", "")); token=cookie["medflow"].value
   with connect() as db:
    row=db.execute("SELECT u.* FROM usuarios u JOIN sessoes s ON s.email=u.email WHERE s.token=? AND s.expira>?",(hashlib.sha256(token.encode()).hexdigest(),time.time())).fetchone()
   return public(row) if row else None
  except (KeyError, ValueError): return None
 def reply(self,status,data,cookie=None):
  raw=json.dumps(data,ensure_ascii=False).encode()
  self.send_response(status);self.send_header("Content-Type","application/json; charset=utf-8");self.send_header("Cache-Control","no-store")
  if cookie:self.send_header("Set-Cookie",cookie)
  self.end_headers();self.wfile.write(raw)
 def do_GET(self):
  path=urlsplit(self.path).path
  user=self.user()
  if path=="/api/sessao":return self.reply(200 if user else 401,user or {"erro":"Faça login para continuar."})
  name=path.lstrip("/")
  if name in PAGES or name=="historico.html":
   if not user or (name in PAGES and user["id"]!=PAGES[name]):
    self.send_response(302);self.send_header("Location","/"+(user["inicio"] if user else "index.html"));self.end_headers();return
  if name not in {"", "index.html", "historico.html", *PAGES} and not (name.startswith("js/") and name.endswith(".js")) and name!="css/styles.css":
   return self.reply(404,{"erro":"Arquivo não encontrado."})
  super().do_GET()
 def do_POST(self):
  try:
   if self.headers.get("Sec-Fetch-Site") == "cross-site":return self.reply(403,{"erro":"Origem inválida."})
   size=int(self.headers.get("Content-Length",0))
   if size>100000:return self.reply(413,{"erro":"Requisição muito grande."})
   data=json.loads(self.rfile.read(size));path=urlsplit(self.path).path
   if path=="/api/cadastro":
    email=str(data.get("email", "")).strip().lower();nome=str(data.get("nome", "")).strip();perfil=data.get("perfil");senha=str(data.get("senha", ""))
    if not 3<=len(nome)<=80 or len(email)>254 or email.count("@")!=1 or not all(email.split("@")) or perfil not in ROLES or not 5<=len(senha)<=128:
     return self.reply(400,{"erro":"Informe nome, e-mail, função e senha com pelo menos 5 caracteres."})
    salt=secrets.token_hex(16)
    with connect() as db:
     if db.execute("SELECT 1 FROM usuarios WHERE email=?",(email,)).fetchone():return self.reply(409,{"erro":"Este e-mail já está cadastrado."})
     db.execute("INSERT INTO usuarios VALUES (?,?,?,?,?)",(email,nome,perfil,salt,password(senha,salt)))
    return self.reply(201,{"mensagem":"Conta criada. Entre com seu e-mail e senha."})
   if path=="/api/recuperar-senha":
    email=str(data.get("email", "")).strip().lower()
    with connect() as db:
     db.execute("DELETE FROM recuperacoes WHERE expira<?",(time.time(),))
     if db.execute("SELECT 1 FROM usuarios WHERE email=?",(email,)).fetchone():
      token=secrets.token_urlsafe(32)
      db.execute("DELETE FROM recuperacoes WHERE email=?",(email,))
      db.execute("INSERT INTO recuperacoes VALUES (?,?,?)",(hashlib.sha256(token.encode()).hexdigest(),email,time.time()+900))
      print(f"Recuperação para {email}: http://localhost:{self.server.server_port}/index.html?redefinir={token}",flush=True)
    return self.reply(200,{"mensagem":"Se o e-mail estiver cadastrado, o link de recuperação ficará disponível por 15 minutos no terminal do servidor. Solicite-o ao responsável pelo sistema."})
   if path=="/api/redefinir-senha":
    senha=str(data.get("senha", ""));token=hashlib.sha256(str(data.get("token", "")).encode()).hexdigest()
    if not 5<=len(senha)<=128:return self.reply(400,{"erro":"A senha precisa ter entre 5 e 128 caracteres."})
    with connect() as db:
     row=db.execute("SELECT email FROM recuperacoes WHERE token=? AND expira>?",(token,time.time())).fetchone()
     if not row:return self.reply(400,{"erro":"Link inválido ou expirado. Solicite uma nova recuperação."})
     salt=secrets.token_hex(16)
     db.execute("UPDATE usuarios SET salt=?, senha=? WHERE email=?",(salt,password(senha,salt),row[0]))
     db.execute("DELETE FROM recuperacoes WHERE email=?",(row[0],));db.execute("DELETE FROM sessoes WHERE email=?",(row[0],))
    return self.reply(200,{"mensagem":"Senha alterada. Entre com a nova senha."})
   if path=="/api/login":
    with connect() as db:
     row=db.execute("SELECT * FROM usuarios WHERE email=?",(str(data.get("email", "")).strip().lower(),)).fetchone()
     if not row or not hmac.compare_digest(password(str(data.get("senha", "")),row[3]),row[4]):return self.reply(401,{"erro":"E-mail ou senha inválidos."})
     token=secrets.token_urlsafe(32)
     db.execute("INSERT INTO sessoes VALUES (?,?,?)",(hashlib.sha256(token.encode()).hexdigest(),row[0],time.time()+28800))
    return self.reply(200,public(row),"medflow="+token+"; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800")
   user=self.user()
   if not user:return self.reply(401,{"erro":"Sessão expirada. Faça login novamente."})
   if path=="/api/logout":
    cookie=SimpleCookie(self.headers.get("Cookie", ""))
    with connect() as db:db.execute("DELETE FROM sessoes WHERE token=?",(hashlib.sha256(cookie["medflow"].value.encode()).hexdigest(),))
    return self.reply(200,{},"medflow=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0")
   if path!="/api/operacao":return self.reply(404,{"erro":"Rota inválida."})
   name=data.get("nome")
   if name not in ALLOW[user["id"]] | {"excluirDados"}:return self.reply(403,{"erro":"Sua função não tem permissão para esta ação."})
   with connect() as db:
    row=db.execute("SELECT dados FROM estado WHERE id=1").fetchone()
    payload={"nome":name,"args":data.get("args",[]),"usuario":user,"db":json.loads(row[0]) if row else None}
    proc=subprocess.run(["node",str(ROOT/"worker.cjs")],input=json.dumps(payload),capture_output=True,text=True,encoding="utf-8",timeout=15)
    result=json.loads(proc.stdout)
    if "erro" in result:return self.reply(400,{"erro":result["erro"]})
    db.execute("INSERT OR REPLACE INTO estado VALUES (1,?)",(json.dumps(result["db"]),))
   return self.reply(200,result.get("result"))
  except Exception as error:
   print(type(error).__name__, str(error))
   self.reply(400,{"erro":"Não foi possível concluir a operação."})

if __name__=="__main__":
 parser=argparse.ArgumentParser();parser.add_argument("--criar-usuario",action="store_true");parser.add_argument("--port",type=int,default=8080);parser.add_argument("--abrir",action="store_true");args=parser.parse_args();init()
 if args.criar_usuario:
  nome=input("Nome completo: ").strip();email=input("E-mail: ").strip().lower();perfil=input("Função (recepcao/enfermagem/medico): ").strip();senha=getpass.getpass("Senha (mínimo 5 caracteres): ")
  if perfil not in ROLES or "@" not in email or not nome or len(senha)<5:parser.error("Dados inválidos.")
  salt=secrets.token_hex(16)
  with connect() as db:db.execute("INSERT INTO usuarios VALUES (?,?,?,?,?)",(email,nome,perfil,salt,password(senha,salt)))
  print("Usuário cadastrado.")
 else:
  print(f"MedFlow em http://localhost:{args.port}. Use --criar-usuario para cadastrar profissionais.")
  try:
   servidor=HTTPServer(("127.0.0.1",args.port),Handler)
  except OSError:
   parser.exit(1,f"Não foi possível iniciar na porta {args.port}. Verifique se o MedFlow já está aberto em http://localhost:{args.port}.\n")
  if args.abrir:
   threading.Timer(0.5,lambda:webbrowser.open(f"http://localhost:{args.port}")).start()
  try: servidor.serve_forever()
  except KeyboardInterrupt: pass
  finally: servidor.server_close()
