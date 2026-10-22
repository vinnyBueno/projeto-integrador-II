# MedFlow

Requer Python 3 e Node.js (sem pacotes adicionais).

## Executar

**No Windows, dê dois cliques em `Iniciar MedFlow.bat`.** Ele verifica se o servidor está ativo, inicia em segundo plano quando necessário e abre http://127.0.0.1:8080 no navegador. O arquivo IniciarMedFlow.bat funciona da mesma forma. Os três acessos solicitados já são cadastrados automaticamente.

Para cadastrar outros profissionais pela linha de comando (opcional):

Na pasta que contém `server.py`, cadastre cada profissional com:

```
py server.py --criar-usuario
```

Informe nome, e-mail, função (`recepcao`, `enfermagem` ou `medico`) e senha. Repita para os demais profissionais. Os acessos `recepcionista@email.com`, `enfermeira@email.com` e `medico@email.com` são criados automaticamente com senha `12345`. Senhas de contas existentes não são sobrescritas ao reiniciar.

Inicie o servidor:

```
py server.py
```

Acesse http://localhost:8080. O login consulta os usuários cadastrados no SQLite e abre a tela da função. Abra pelo servidor, pois Live Server e abertura direta do HTML não executam a autenticação.

O banco `medflow.sqlite3` é criado automaticamente. As sessões duram 8 horas e usam cookie HttpOnly. Senhas usam PBKDF2 com salt. Dados antigos do navegador não são importados automaticamente.

Recepção cadastra e atualiza pacientes; enfermagem atende a fila por chegada, registra sinais vitais e classifica; médico registra consulta e pode prescrever medicações opcionais. Histórico disponível nos três perfis. O botão Excluir dados apaga pacientes e atendimentos após confirmação e preserva os usuários.

Antes da triagem: menos de 15 min = baixa/verde; de 15 a menos de 30 = média/amarelo; a partir de 30 = alta/vermelho. Após classificação, a prioridade usa a cor clínica e aumenta um nível por prazo de espera excedido (10/60/120/240 min); a classificação registrada permanece preservada. Essa regra operacional de espera precisa ser validada pela instituição antes de uso assistencial.

Servidor destinado a execução local. Não expõe o banco nem o código do servidor por HTTP.

## Cadastro e recuperação

A tela inicial oferece **Criar conta** e **Esqueci a senha**. A recuperação gera um link de uso único, válido por 15 minutos, exibido no terminal do servidor para o responsável entregar ao solicitante. Não há envio de e-mail configurado. A redefinição invalida as sessões anteriores. Novas senhas devem ter pelo menos 5 caracteres.
