const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const pool = mysql.createPool({
  host: 'BD-ACD',
  user: 'BD240226128',
  password: 'Zgmem3',
  database: 'hospital',
});

async function iniciar() {
  await pool.query(`
    CREATE TABLE IF profissional (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      login VARCHAR(50) NOT NULL UNIQUE,
      senha VARCHAR(100) NOT NULL,
      funcao ENUM('recepcionista','enfermeiro','medico') NOT NULL
    )`);

  await pool.query(`
    CREATE TABLE paciente (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      cpf VARCHAR(14) NOT NULL UNIQUE,
      data_nascimento DATE,
      telefone VARCHAR(20)
    )`);

  await pool.query(`
    CREATE TABLE prontuario (
      id INT AUTO_INCREMENT PRIMARY KEY,
      paciente_id INT NOT NULL UNIQUE,
      historico TEXT,
      FOREIGN KEY (paciente_id) REFERENCES paciente(id)
    )`);

  await pool.query(`
    CREATE TABLE atendimento (
      id INT AUTO_INCREMENT PRIMARY KEY,
      paciente_id INT NOT NULL,
      servico ENUM('recepcao','triagem','consulta') NOT NULL,
      status ENUM('aguardando','finalizado') NOT NULL,
      profissional_id INT,
      triagem TEXT,
      diagnostico TEXT,
      data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (paciente_id) REFERENCES paciente(id),
      FOREIGN KEY (profissional_id) REFERENCES profissional(id)
    )`);

  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM profissional');
  if (n === 0) {
    const sql = 'INSERT INTO profissional (nome, login, senha, funcao) VALUES (?, ?, ?, ?)';
    await pool.query(sql, ['Ana Recepção', 'ana', bcrypt.hashSync('123456', 10), 'recepcionista']);
    await pool.query(sql, ['Bruno Enfermeiro', 'bruno', bcrypt.hashSync('123456', 10), 'enfermeiro']);
    await pool.query(sql, ['Carla Médica', 'carla', bcrypt.hashSync('123456', 10), 'medico']);
  }
}

module.exports = { pool, iniciar };