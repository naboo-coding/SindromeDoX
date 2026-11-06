DROP DATABASE IF EXISTS SindromeX;
CREATE DATABASE IF NOT EXISTS SindromeX
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;
USE SindromeX;
 
-- 1. Dados gerais das pessoas
CREATE TABLE pessoa (
    id_pessoa INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(130) NOT NULL,
    cpf CHAR(11) NOT NULL UNIQUE,            -- somente dígitos
    cep CHAR(8),                             -- somente dígitos
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,        -- hash (bcrypt/argon2), nunca a senha pura
    ativo BOOLEAN NOT NULL DEFAULT TRUE,     -- soft delete
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 
    CONSTRAINT chk_pessoa_cpf CHECK (cpf REGEXP '^[0-9]{11}$'),
    CONSTRAINT chk_pessoa_cep CHECK (cep IS NULL OR cep REGEXP '^[0-9]{8}$')
);
 
-- 2. Funcionários
CREATE TABLE funcionario (
    id_funcionario INT PRIMARY KEY,
    acesso_total BOOLEAN NOT NULL DEFAULT FALSE,
 
    CONSTRAINT fk_funcionario_pessoa
        FOREIGN KEY (id_funcionario)
        REFERENCES pessoa(id_pessoa)
        ON DELETE RESTRICT
);
 
-- 3. Responsáveis pelos pacientes
CREATE TABLE responsavel_paciente (
    id_responsavel INT PRIMARY KEY,
 
    CONSTRAINT fk_responsavel_pessoa
        FOREIGN KEY (id_responsavel)
        REFERENCES pessoa(id_pessoa)
        ON DELETE RESTRICT
);
 
-- 4. Pacientes
CREATE TABLE paciente (
    id_paciente INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(130) NOT NULL,
    genero ENUM('feminino', 'masculino', 'outro', 'nao_informado') NOT NULL DEFAULT 'nao_informado',
    data_nascimento DATE,
    id_responsavel INT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 
    CONSTRAINT fk_paciente_responsavel
        FOREIGN KEY (id_responsavel)
        REFERENCES responsavel_paciente(id_responsavel)
        ON DELETE RESTRICT
);
 
CREATE INDEX idx_paciente_responsavel ON paciente(id_responsavel);
 
-- 5. Triagens
CREATE TABLE triagem (
    id_triagem INT AUTO_INCREMENT PRIMARY KEY,
    hora_triagem DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    respostas JSON NOT NULL,
    id_paciente INT NOT NULL,
    id_funcionario INT NOT NULL,
 
    CONSTRAINT fk_triagem_paciente
        FOREIGN KEY (id_paciente)
        REFERENCES paciente(id_paciente)
        ON DELETE RESTRICT,
 
    CONSTRAINT fk_triagem_funcionario
        FOREIGN KEY (id_funcionario)
        REFERENCES funcionario(id_funcionario)
        ON DELETE RESTRICT
);
 
CREATE INDEX idx_triagem_paciente ON triagem(id_paciente, hora_triagem);
CREATE INDEX idx_triagem_funcionario ON triagem(id_funcionario);
 
-- 6. Resultados das triagens (1:1 com triagem)
CREATE TABLE resultado_triagem (
    id_resultado_triagem INT AUTO_INCREMENT PRIMARY KEY,
    pontuacao INT NOT NULL,                  -- soma do checklist
    classificacao VARCHAR(100),              -- faixa de risco
    observacoes TEXT,
    hora_calculo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_triagem INT NOT NULL UNIQUE,
 
    CONSTRAINT chk_resultado_pontuacao CHECK (pontuacao >= 0),
 
    CONSTRAINT fk_resultado_triagem
        FOREIGN KEY (id_triagem)
        REFERENCES triagem(id_triagem)
        ON DELETE CASCADE
);
 