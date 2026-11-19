-- Sistema de Triagem da Síndrome do X Frágil (MySQL 8.0.16+)

CREATE DATABASE IF NOT EXISTS SindromeX
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;
USE SindromeX;

-- USUÁRIOS
-- senha_hash vazio = contato cadastrado pela equipe, sem login. CPF, CEP e telefones: só dígitos.
CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(130) NOT NULL,
    cpf CHAR(11) NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefone VARCHAR(11) NULL,
    whatsapp VARCHAR(11) NULL,
    telefone2 VARCHAR(11) NULL,
    senha_hash VARCHAR(255) NULL,
    perfil ENUM('responsavel', 'profissional', 'admin') NOT NULL DEFAULT 'responsavel',
    email_confirmado_em DATETIME NULL,
    aceite_termos_em DATETIME NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_usuario_cpf CHECK (cpf IS NULL OR cpf REGEXP '^[0-9]{11}$'),
    CONSTRAINT chk_usuario_telefone CHECK (telefone IS NULL OR telefone REGEXP '^[0-9]{10,11}$'),
    CONSTRAINT chk_usuario_whatsapp CHECK (whatsapp IS NULL OR whatsapp REGEXP '^[0-9]{10,11}$'),
    CONSTRAINT chk_usuario_telefone2 CHECK (telefone2 IS NULL OR telefone2 REGEXP '^[0-9]{10,11}$'),

    CONSTRAINT chk_usuario_resp_cpf CHECK (perfil <> 'responsavel' OR cpf IS NOT NULL),
    CONSTRAINT chk_usuario_resp_telefone CHECK (perfil <> 'responsavel' OR telefone IS NOT NULL),
    CONSTRAINT chk_usuario_staff_senha CHECK (perfil = 'responsavel' OR senha_hash IS NOT NULL)
);

CREATE TABLE token_usuario (
    id_token INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    tipo ENUM('recuperacao_senha', 'confirmacao_email') NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expira_em DATETIME NOT NULL,
    usado_em DATETIME NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_token_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
);

CREATE INDEX idx_token_usuario ON token_usuario(id_usuario);

-- PACIENTES E RESPONSÁVEIS
CREATE TABLE paciente (
    id_paciente INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(130) NOT NULL,
    sexo_biologico ENUM('M', 'F') NOT NULL,
    data_nascimento DATE NOT NULL,
    nome_mae VARCHAR(130) NOT NULL,
    nome_pai VARCHAR(130) NULL,
    cep CHAR(8) NULL,
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(60) NOT NULL,
    pais VARCHAR(60) NOT NULL DEFAULT 'Brasil',
    observacoes TEXT NULL,
    id_usuario_cadastro INT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_paciente_cep CHECK (cep IS NULL OR cep REGEXP '^[0-9]{8}$'),

    CONSTRAINT fk_paciente_cadastro
        FOREIGN KEY (id_usuario_cadastro)
        REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT
);

CREATE INDEX idx_paciente_cadastro ON paciente(id_usuario_cadastro);
CREATE INDEX idx_paciente_nome ON paciente(nome);

CREATE TABLE paciente_responsavel (
    id_paciente INT NOT NULL,
    id_usuario INT NOT NULL,
    parentesco VARCHAR(50) NOT NULL,
    principal BOOLEAN NOT NULL DEFAULT FALSE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    principal_unico INT GENERATED ALWAYS AS (IF(principal AND ativo, id_paciente, NULL)) STORED,  -- garante um único principal ativo por paciente
    CONSTRAINT uq_pacresp_um_principal UNIQUE (principal_unico),

    PRIMARY KEY (id_paciente, id_usuario),

    CONSTRAINT fk_pacresp_paciente
        FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE RESTRICT,
    CONSTRAINT fk_pacresp_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE RESTRICT
);

CREATE INDEX idx_pacresp_usuario ON paciente_responsavel(id_usuario);

-- DOCUMENTOS E CONSENTIMENTO
CREATE TABLE documento_paciente (
    id_documento INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    tamanho_bytes INT UNSIGNED NOT NULL,
    caminho_arquivo VARCHAR(500) NOT NULL,
    id_usuario_envio INT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    enviado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_documento_tamanho CHECK (tamanho_bytes <= 10485760),
    CONSTRAINT chk_documento_tipo CHECK (tipo_mime IN (
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png'
    )),

    CONSTRAINT fk_documento_paciente
        FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE RESTRICT,
    CONSTRAINT fk_documento_usuario
        FOREIGN KEY (id_usuario_envio) REFERENCES usuario(id_usuario) ON DELETE RESTRICT
);

CREATE INDEX idx_documento_paciente ON documento_paciente(id_paciente);

CREATE TABLE consentimento_lgpd (
    id_consentimento INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT NOT NULL,
    id_usuario_titular INT NOT NULL,
    versao_termo VARCHAR(20) NOT NULL,
    aceito_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revogado_em DATETIME NULL,
    id_usuario_registro INT NOT NULL,

    CONSTRAINT uq_consent_titular_versao UNIQUE (id_paciente, id_usuario_titular, versao_termo),

    CONSTRAINT fk_consent_paciente
        FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE RESTRICT,
    CONSTRAINT fk_consent_titular
        FOREIGN KEY (id_usuario_titular) REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    CONSTRAINT fk_consent_registro
        FOREIGN KEY (id_usuario_registro) REFERENCES usuario(id_usuario) ON DELETE RESTRICT
);

CREATE INDEX idx_consent_paciente ON consentimento_lgpd(id_paciente);

-- CHECKLIST
CREATE TABLE checklist_versao (
    id_checklist_versao INT AUTO_INCREMENT PRIMARY KEY,
    fonte VARCHAR(255) NOT NULL,
    limiar_m DECIMAL(6,4) NULL,
    limiar_f DECIMAL(6,4) NULL,
    ativa BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    ativa_unica TINYINT GENERATED ALWAYS AS (IF(ativa, 1, NULL)) STORED,  -- garante uma única versão ativa
    CONSTRAINT uq_checklist_uma_ativa UNIQUE (ativa_unica)
);

CREATE TABLE checklist_sintoma (
    id_sintoma INT AUTO_INCREMENT PRIMARY KEY,
    id_checklist_versao INT NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    rotulo VARCHAR(200) NOT NULL,
    grupo ENUM('comportamento', 'fisico') NOT NULL,
    sexo_restrito ENUM('M', 'F') NULL,
    peso_m DECIMAL(6,4) NULL,
    peso_f DECIMAL(6,4) NULL,

    CONSTRAINT uq_sintoma_versao_codigo UNIQUE (id_checklist_versao, codigo),
    CONSTRAINT chk_sintoma_peso_m CHECK (peso_m IS NULL OR peso_m >= 0),
    CONSTRAINT chk_sintoma_peso_f CHECK (peso_f IS NULL OR peso_f >= 0),

    CONSTRAINT fk_sintoma_versao
        FOREIGN KEY (id_checklist_versao)
        REFERENCES checklist_versao(id_checklist_versao)
        ON DELETE RESTRICT
);

CREATE VIEW vw_checklist_prontidao AS
SELECT
    v.id_checklist_versao,
    'M' AS sexo,
    (v.limiar_m IS NOT NULL
     AND EXISTS (
        SELECT 1 FROM checklist_sintoma s
        WHERE s.id_checklist_versao = v.id_checklist_versao
          AND (s.sexo_restrito IS NULL OR s.sexo_restrito = 'M')
     )
     AND NOT EXISTS (
        SELECT 1 FROM checklist_sintoma s
        WHERE s.id_checklist_versao = v.id_checklist_versao
          AND (s.sexo_restrito IS NULL OR s.sexo_restrito = 'M')
          AND s.peso_m IS NULL
     )) AS pronto
FROM checklist_versao v
UNION ALL
SELECT
    v.id_checklist_versao,
    'F' AS sexo,
    (v.limiar_f IS NOT NULL
     AND EXISTS (
        SELECT 1 FROM checklist_sintoma s
        WHERE s.id_checklist_versao = v.id_checklist_versao
          AND (s.sexo_restrito IS NULL OR s.sexo_restrito = 'F')
     )
     AND NOT EXISTS (
        SELECT 1 FROM checklist_sintoma s
        WHERE s.id_checklist_versao = v.id_checklist_versao
          AND (s.sexo_restrito IS NULL OR s.sexo_restrito = 'F')
          AND s.peso_f IS NULL
     )) AS pronto
FROM checklist_versao v;

-- TRIAGENS
CREATE TABLE triagem (
    id_triagem INT AUTO_INCREMENT PRIMARY KEY,
    hora_triagem DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    respostas JSON NOT NULL,
    id_paciente INT NOT NULL,
    id_usuario INT NOT NULL,
    id_checklist_versao INT NOT NULL,
    id_usuario_edicao INT NULL,
    editado_em DATETIME NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_triagem_respostas CHECK (JSON_TYPE(respostas) = 'OBJECT'),

    CONSTRAINT fk_triagem_paciente
        FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE RESTRICT,
    CONSTRAINT fk_triagem_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    CONSTRAINT fk_triagem_checklist
        FOREIGN KEY (id_checklist_versao) REFERENCES checklist_versao(id_checklist_versao) ON DELETE RESTRICT,
    CONSTRAINT fk_triagem_edicao
        FOREIGN KEY (id_usuario_edicao) REFERENCES usuario(id_usuario) ON DELETE RESTRICT
);

CREATE INDEX idx_triagem_paciente ON triagem(id_paciente, hora_triagem);
CREATE INDEX idx_triagem_usuario ON triagem(id_usuario);

CREATE TABLE resultado_triagem (
    id_resultado_triagem INT AUTO_INCREMENT PRIMARY KEY,
    pontuacao DECIMAL(6,2) NULL,
    limiar DECIMAL(6,4) NULL,
    hora_calculo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_triagem INT NOT NULL UNIQUE,

    status VARCHAR(15) GENERATED ALWAYS AS (
        CASE
            WHEN pontuacao IS NULL THEN 'pendente'
            WHEN pontuacao >= limiar THEN 'atingido'
            ELSE 'nao_atingido'
        END
    ) STORED,

    CONSTRAINT chk_resultado_pontuacao CHECK (pontuacao IS NULL OR pontuacao >= 0),

    CONSTRAINT chk_resultado_limiar CHECK (pontuacao IS NULL OR limiar IS NOT NULL),

    CONSTRAINT fk_resultado_triagem
        FOREIGN KEY (id_triagem)
        REFERENCES triagem(id_triagem)
        ON DELETE CASCADE
);

CREATE INDEX idx_resultado_status ON resultado_triagem(status);

-- ACOMPANHAMENTO PÓS-TRIAGEM
CREATE TABLE acompanhamento_paciente (
    id_evento INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT NOT NULL,
    tipo ENUM(
        'encaminhado_exame',
        'exame_realizado',
        'resultado_dna',
        'auxilio_concedido',
        'auxilio_negado'
    ) NOT NULL,
    resultado_dna ENUM('positivo', 'negativo') NULL,
    data_evento DATE NOT NULL,
    id_triagem INT NULL,
    observacao TEXT NULL,
    id_usuario_registro INT NOT NULL,
    registrado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT chk_acomp_resultado_dna CHECK (
        (tipo = 'resultado_dna' AND resultado_dna IS NOT NULL)
        OR (tipo <> 'resultado_dna' AND resultado_dna IS NULL)
    ),

    CONSTRAINT fk_acomp_paciente
        FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE RESTRICT,
    CONSTRAINT fk_acomp_triagem
        FOREIGN KEY (id_triagem) REFERENCES triagem(id_triagem) ON DELETE RESTRICT,
    CONSTRAINT fk_acomp_usuario
        FOREIGN KEY (id_usuario_registro) REFERENCES usuario(id_usuario) ON DELETE RESTRICT
);

CREATE INDEX idx_acomp_paciente ON acompanhamento_paciente(id_paciente, data_evento);

CREATE VIEW vw_situacao_paciente AS
SELECT
    p.id_paciente,
    (SELECT a.tipo
       FROM acompanhamento_paciente a
      WHERE a.id_paciente = p.id_paciente AND a.ativo
      ORDER BY a.data_evento DESC, a.id_evento DESC
      LIMIT 1) AS ultima_etapa,
    (SELECT a.resultado_dna
       FROM acompanhamento_paciente a
      WHERE a.id_paciente = p.id_paciente AND a.ativo AND a.tipo = 'resultado_dna'
      ORDER BY a.data_evento DESC, a.id_evento DESC
      LIMIT 1) AS resultado_dna,
    EXISTS (SELECT 1
              FROM acompanhamento_paciente a
             WHERE a.id_paciente = p.id_paciente AND a.ativo AND a.tipo = 'resultado_dna'
    ) AS dna_ja_realizado
FROM paciente p;

-- AUDITORIA E RETENÇÃO
CREATE TABLE auditoria (
    id_auditoria BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NULL,
    acao VARCHAR(50) NOT NULL,
    entidade VARCHAR(50) NULL,
    id_entidade INT NULL,
    dados_antes JSON NULL,
    dados_depois JSON NULL,
    ip VARCHAR(45) NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE RESTRICT
);

CREATE INDEX idx_auditoria_entidade ON auditoria(entidade, id_entidade);
CREATE INDEX idx_auditoria_usuario ON auditoria(id_usuario, criado_em);

CREATE VIEW vw_retencao_paciente AS
SELECT
    x.id_paciente,
    x.ultimo_registro_em,
    DATE_ADD(x.ultimo_registro_em, INTERVAL 20 YEAR) AS revisar_a_partir_de
FROM (
    SELECT
        p.id_paciente,
        GREATEST(
            p.atualizado_em,
            COALESCE((SELECT MAX(GREATEST(t.hora_triagem, COALESCE(t.editado_em, t.hora_triagem)))
                        FROM triagem t WHERE t.id_paciente = p.id_paciente), p.atualizado_em),
            COALESCE((SELECT MAX(d.enviado_em)
                        FROM documento_paciente d WHERE d.id_paciente = p.id_paciente), p.atualizado_em),
            COALESCE((SELECT MAX(a.registrado_em)
                        FROM acompanhamento_paciente a WHERE a.id_paciente = p.id_paciente), p.atualizado_em)
        ) AS ultimo_registro_em
    FROM paciente p
) x;

-- DADOS INICIAIS DO CHECKLIST
-- Fonte: Romero et al., Fragile X Syndrome in Brazil (medRxiv, 2025), Tabelas 4 e 5.
INSERT INTO checklist_versao (fonte, limiar_m, limiar_f, ativa)
VALUES ('Romero et al., Fragile X Syndrome in Brazil (medRxiv, 2025), Tabelas 4 e 5', 0.56, 0.55, TRUE);

SET @versao = LAST_INSERT_ID();

INSERT INTO checklist_sintoma (id_checklist_versao, codigo, rotulo, grupo, sexo_restrito, peso_m, peso_f) VALUES
    (@versao, 'speechDelay',            'Demorou para falar',                                              'comportamento', NULL, 0.14, 0.01),
    (@versao, 'learningDifficulty',     'Dificuldades no aprendizado',                                     'comportamento', NULL, 0.18, 0.28),
    (@versao, 'attentionDeficit',       'Déficit de atenção',                                              'comportamento', NULL, 0.17, 0.12),
    (@versao, 'intellectualDisability', 'Deficiência intelectual',                                         'comportamento', NULL, 0.32, 0.20),
    (@versao, 'hyperactivity',          'Hiperatividade',                                                  'comportamento', NULL, 0.12, 0.04),
    (@versao, 'aggressiveness',         'Agressividade',                                                   'comportamento', NULL, 0.01, 0.02),
    (@versao, 'avoidsEyeContact',       'Evita contato visual',                                            'comportamento', NULL, 0.06, 0.08),
    (@versao, 'avoidsPhysicalContact',  'Evita contato físico',                                            'comportamento', NULL, 0.04, 0.07),
    (@versao, 'repetitiveMovements',    'Movimentos intencionais, repetitivos e ritmados',                 'comportamento', NULL, 0.17, 0.05),
    (@versao, 'hyperextensibility',     'Articulações mais flexíveis que o normal (hiperextensibilidade)', 'fisico',        NULL, 0.19, 0.04),
    (@versao, 'macroorchidism',         'Testículos de tamanho maior que o normal',                        'fisico',        'M',  0.26, NULL),
    (@versao, 'longFace',               'Face alongada, mandíbula proeminente e/ou orelhas de abano',      'fisico',        NULL, 0.29, 0.09);
