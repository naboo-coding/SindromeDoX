CREATE DATABASE SindromeX
USE SindromeX

CREATE TABLE pessoa {
    id_pessoa INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(130) NOT NULL,
    CPF CHAR(11) NOT NULL UNIQUE,
    CEP VARCHAR(10) NOT NULL,
    email VARCHAR(150) NOT NULL,
    senha VARCHAR(150) NOT NULL,
}

CREATE TABLE funcionario{
    id_funcionario INT AUTO_INCREMENT PRIMARY KEY,
    acesso_total BOOLEAN NOT NULL,
    CONSTRAINT fk_funcionario_pessoa 
        FOREIGN KEY (id_funcionario) REFERENCES pessoa(id_pessoa) 
        ON DELETE CASCADE
}

CREATE TABLE responsavel_paciente{
    id_responsavel INT AUTO_INCREMENT PRIMARY KEY,
    CONSTRAINT fk_responsavel_pessoa
        FOREIGN KEY (id_responsavel) REFERENCES pessoa(id_pessoa),
        ON DELETE CASCADE
}

CREATE TABLE paciente{
    id_paciente INT AUTO_INCREMENT PRIMARY KEY,
    genero VARCHAR(8) NOT NULL,
    data_nascimento DATE,
    id_responsavel INT,
    id_triagem INT, 
    id_resultado INT,
    CONSTRAINT fk_paciente_pessoa 
        FOREIGN KEY (id_paciente) REFERENCES pessoa(id_pessoa) 
        ON DELETE CASCADE,
    CONSTRAINT fk_paciente_responsavel 
        FOREIGN KEY (id_responsavel) REFERENCES responsavel_paciente(id_user)
}

CREATE TABLE resultado_triagem{
    id_resultado_triagem INT AUTO_INCREMENT PRIMARY KEY,
    resultado INT NOT NULL,
    hora_realizada DATETIME,
    id_triagem INT,
    CONSTRAINT fk_id_triagem
        FOREIGN KEY (id_triagem) REFERENCES triagem(id_triagem)
}

CREATE TABLE triagem{
    id_triagem INT AUTO_INCREMENT PRIMARY KEY,
    hora_triagem DATETIME,
    fenotipo_facial BOOLEAN NOT NULL,
    sintoma_COLOQUEALGO BOOLEAN NOT NULL,
    id_paciente INT,
    id_resultado INT,
    CONSTRAINT fk_id_resultado
        FOREIGN KEY (id_resultado) REFERENCES resultado_triagem(id_resultado_triagem)
    CONSTRAINT fk_id_paciente
        FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente)

}

CREATE TABLE historico{
    id_historico INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT,
    id_responsavel INT,
    id_resultado INT,
    id_triagem
}