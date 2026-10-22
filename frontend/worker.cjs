const fs = require('fs');
const vm = require('vm');
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
let state = input.db;
const context = {window:null, console, Date, localStorage:{getItem:()=>state ? JSON.stringify(state):null, setItem:(k,v)=>{state=JSON.parse(v);}}};
context.window=context; context.MedFlowUsuario=input.usuario;
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname+'/js/api.js','utf8'),context);
vm.runInContext(fs.readFileSync(__dirname+'/js/validacao.js','utf8'),context);
try {
  const args=input.args || [], v=context.MedFlowValidacao;
  const check = r => {if(!r.ok) throw Error(r.mensagem || Object.values(r.erros).join(' ')); return r.dados;};
  if(input.nome==='salvarPacienteEAbrirAtendimento') { args[0]=check(v.paciente(args[0])); args[1]=check(v.atendimentoRecepcao(args[1])); }
  if(input.nome==='alterarAtendimento') {args[1]=check(v.atendimentoRecepcao(args[1])); args[2]=check(v.paciente(args[2]));}
  if(input.nome==='salvarTriagem') args[1]=check(v.triagem(args[1]));
  if(input.nome==='adicionarMedicacao') args[1]=check(v.medicacao(args[1]));
  if(input.nome==='salvarConsultaMedica') check(v.anotacoes(args[1]));
  const result=context.MedFlowAPI[input.nome](...args);
  process.stdout.write(JSON.stringify({result,db:state}));
} catch(e) {process.stdout.write(JSON.stringify({erro:e.message}));}
