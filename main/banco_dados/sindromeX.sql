-- =====================================================================
-- Banco de dados — Sistema de Triagem da Síndrome do X Frágil
-- VERSÃO 2.2
-- Requer MySQL 8.0.16+ (CHECK, colunas geradas e collation 0900).
-- =====================================================================

-- Para recriar o banco do zero em DESENVOLVIMENTO, descomente a linha abaixo.
-- NUNCA execute com dados reais: apaga tudo.
-- DROP DATABASE IF EXISTS SindromeX;

CREATE DATABASE IF NOT EXISTS SindromeX
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;
USE SindromeX;

-- Convenções:
--   * CPF, CEP e telefones: somente dígitos (o front remove a máscara).
--   * ativo = FALSE significa exclusão lógica; dados clínicos nunca são apagados.
--   * Collation _ai_ci: e-mail é único sem diferenciar maiúsculas/minúsculas.
--   * Regras que o MySQL não consegue garantir ficam marcadas "REGRA DO BACKEND".


-- =====================================================================
-- USUÁRIOS
-- =====================================================================

-- Todas as pessoas do sistema: responsáveis, profissionais e administradores.
--
-- * O cadastro público cria SEMPRE perfil 'responsavel'.
--   REGRA DO BACKEND: só um admin promove uma conta a 'profissional' ou 'admin'.
-- * senha_hash NULL = pessoa cadastrada como contato (ex.: um profissional
--   cadastrou o responsável), mas que ainda não tem acesso ao sistema.
--   Quando a pessoa se cadastrar com o mesmo e-mail, a conta é "assumida"
--   (REGRA DO BACKEND: só após confirmar o e-mail em email_confirmado_em).
-- * REGRA DO BACKEND: login só é permitido com ativo = TRUE e e-mail confirmado.
CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(130) NOT NULL,
    cpf CHAR(11) NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    telefone VARCHAR(11) NULL,
    whatsapp VARCHAR(11) NULL,
    telefone2 VARCHAR(11) NULL,
    senha_hash VARCHAR(255) NULL,                     -- hash, nunca a senha pura
    perfil ENUM('responsavel', 'profissional', 'admin') NOT NULL DEFAULT 'responsavel',
    email_confirmado_em DATETIME NULL,
    aceite_termos_em DATETIME NULL,                   -- aceite da política de privacidade
    ativo BOOLEAN NOT NULL DEFAULT TRUE,              -- FALSE bloqueia acesso (ex.: saiu do Instituto)
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_usuario_cpf CHECK (cpf IS NULL OR cpf REGEXP '^[0-9]{11}$'),
    CONSTRAINT chk_usuario_telefone CHECK (telefone IS NULL OR telefone REGEXP '^[0-9]{10,11}$'),
    CONSTRAINT chk_usuario_whatsapp CHECK (whatsapp IS NULL OR whatsapp REGEXP '^[0-9]{10,11}$'),
    CONSTRAINT chk_usuario_telefone2 CHECK (telefone2 IS NULL OR telefone2 REGEXP '^[0-9]{10,11}$'),

    -- responsável precisa de CPF e telefone; profissional e admin precisam de senha
    CONSTRAINT chk_usuario_resp_cpf CHECK (perfil <> 'responsavel' OR cpf IS NOT NULL),
    CONSTRAINT chk_usuario_resp_telefone CHECK (perfil <> 'responsavel' OR telefone IS NOT NULL),
    CONSTRAINT chk_usuario_staff_senha CHECK (perfil = 'responsavel' OR senha_hash IS NOT NULL)
);

-- Tokens de uso único: recuperação de senha (RF02) e confirmação de e-mail.
-- Guarda só o hash do token.
CREATE TABLE token_usuario (
    id_token INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    tipo ENUM('recuperacao_senha', 'confirmacao_email') NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,              -- SHA-256 em hexadecimal
    expira_em DATETIME NOT NULL,
    usado_em DATETIME NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_token_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuario(id_usuario)
        ON DELETE CASCADE
);

CREATE INDEX idx_token_usuario ON token_usuario(id_usuario);


-- =====================================================================
-- PACIENTES
-- =====================================================================

CREATE TABLE paciente (
    id_paciente INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(130) NOT NULL,
    sexo_biologico ENUM('M', 'F') NOT NULL,           -- sempre definido; escolhe pesos e limiar
    data_nascimento DATE NOT NULL,
    nome_mae VARCHAR(130) NOT NULL,
    nome_pai VARCHAR(130) NULL,
    cep CHAR(8) NULL,
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(60) NOT NULL,
    pais VARCHAR(60) NOT NULL DEFAULT 'Brasil',
    observacoes TEXT NULL,
    id_usuario_cadastro INT NOT NULL,                 -- quem cadastrou (informativo; não restringe acesso)
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

-- Vínculo paciente <-> responsável (um paciente pode ter vários; um responsável, vários pacientes).
--
-- REGRA DO BACKEND (acesso):
--   * responsável: vê, cadastra e aplica triagem só em pacientes vinculados a ele aqui
--     (considerando apenas vínculos com ativo = TRUE) e que já tenham o consentimento dele;
--   * profissional e admin: acesso a todos os pacientes (cada consulta vai para a auditoria).
-- REGRA DO BACKEND (quem altera vínculos): vincular, desvincular ou trocar o responsável
--   principal depois do cadastro é permitido SOMENTE ao admin. A única exceção é o vínculo
--   inicial, criado junto com o paciente (responsável que se cadastra como parente de si
--   mesmo; profissional que informa o responsável no cadastro).
-- REGRA DO BACKEND (idade): paciente menor de 18 anos exige ao menos um vínculo ativo
--   (o último não pode ser encerrado); para adultos o vínculo é opcional.
CREATE TABLE paciente_responsavel (
    id_paciente INT NOT NULL,
    id_usuario INT NOT NULL,                          -- o responsável
    parentesco VARCHAR(50) NOT NULL,
    principal BOOLEAN NOT NULL DEFAULT FALSE,         -- responsável principal (opcional)
    ativo BOOLEAN NOT NULL DEFAULT TRUE,              -- FALSE = vínculo encerrado (histórico preservado)
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- garante no máximo UM principal ativo por paciente (UNIQUE aceita vários NULL)
    principal_unico INT GENERATED ALWAYS AS (IF(principal AND ativo, id_paciente, NULL)) STORED,
    CONSTRAINT uq_pacresp_um_principal UNIQUE (principal_unico),

    PRIMARY KEY (id_paciente, id_usuario),

    CONSTRAINT fk_pacresp_paciente
        FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE RESTRICT,
    CONSTRAINT fk_pacresp_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE RESTRICT
);

CREATE INDEX idx_pacresp_usuario ON paciente_responsavel(id_usuario);

-- Documentos anexados. O arquivo fica em disco/storage; aqui só o registro.
-- REGRA DO BACKEND: validar o tipo pelo CONTEÚDO do arquivo, não só pela extensão.
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

    CONSTRAINT chk_documento_tamanho CHECK (tamanho_bytes <= 10485760),   -- 10 MB
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

-- Consentimento LGPD: é POR RESPONSÁVEL (cada responsável vinculado consente por si),
-- ou do próprio paciente adulto, se não houver responsável.
-- REGRA DO BACKEND: o responsável só acessa os dados de um paciente depois de registrar
-- o seu consentimento (revogado_em IS NULL) para a versão vigente do termo.
CREATE TABLE consentimento_lgpd (
    id_consentimento INT AUTO_INCREMENT PRIMARY KEY,
    id_paciente INT NOT NULL,
    id_usuario_titular INT NOT NULL,                  -- quem consentiu
    versao_termo VARCHAR(20) NOT NULL,
    aceito_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revogado_em DATETIME NULL,
    id_usuario_registro INT NOT NULL,                 -- quem coletou/registrou o aceite

    CONSTRAINT uq_consent_titular_versao UNIQUE (id_paciente, id_usuario_titular, versao_termo),

    CONSTRAINT fk_consent_paciente
        FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE RESTRICT,
    CONSTRAINT fk_consent_titular
        FOREIGN KEY (id_usuario_titular) REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    CONSTRAINT fk_consent_registro
        FOREIGN KEY (id_usuario_registro) REFERENCES usuario(id_usuario) ON DELETE RESTRICT
);

CREATE INDEX idx_consent_paciente ON consentimento_lgpd(id_paciente);


-- =====================================================================
-- CHECKLIST (pesos e limiares versionados)
-- =====================================================================

-- Uma versão do checklist = um conjunto de pesos + limiares.
-- Peso ou limiar NULL = ainda não definido => triagem fica "pendente".
CREATE TABLE checklist_versao (
    id_checklist_versao INT AUTO_INCREMENT PRIMARY KEY,
    fonte VARCHAR(255) NOT NULL,
    limiar_m DECIMAL(6,4) NULL,
    limiar_f DECIMAL(6,4) NULL,
    ativa BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- garante no máximo UMA versão ativa (UNIQUE aceita vários NULL)
    ativa_unica TINYINT GENERATED ALWAYS AS (IF(ativa, 1, NULL)) STORED,
    CONSTRAINT uq_checklist_uma_ativa UNIQUE (ativa_unica)
);

CREATE TABLE checklist_sintoma (
    id_sintoma INT AUTO_INCREMENT PRIMARY KEY,
    id_checklist_versao INT NOT NULL,
    codigo VARCHAR(50) NOT NULL,                      -- mesmo id usado no front/JSON (ex.: speechDelay)
    rotulo VARCHAR(200) NOT NULL,
    grupo ENUM('comportamento', 'fisico') NOT NULL,
    sexo_restrito ENUM('M', 'F') NULL,                -- NULL = vale para os dois sexos
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

-- Diz, por versão e sexo, se o cálculo já pode ser feito: a versão precisa ter ao menos
-- um sintoma aplicável àquele sexo, todos os pesos e o limiar preenchidos.
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


-- =====================================================================
-- TRIAGENS E RESULTADOS
-- =====================================================================

-- Um paciente pode ter várias triagens (outras datas, outros responsáveis).
-- Não há bloqueio no banco: o front deve apenas AVISAR que a triagem é dispensável
-- quando já existir resultado de DNA (ver vw_situacao_paciente).
CREATE TABLE triagem (
    id_triagem INT AUTO_INCREMENT PRIMARY KEY,
    hora_triagem DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    respostas JSON NOT NULL,                          -- perguntas familiares, sinais marcados, observações
    id_paciente INT NOT NULL,
    id_usuario INT NOT NULL,                          -- quem aplicou (responsável, profissional ou admin)
    id_checklist_versao INT NOT NULL,                 -- versão usada no cálculo
    id_usuario_edicao INT NULL,                       -- último admin que editou
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

-- Resultado (1:1 com triagem).
-- O texto exibido deve manter a ressalva: a elegibilidade ao auxílio é decisão do Instituto.
CREATE TABLE resultado_triagem (
    id_resultado_triagem INT AUTO_INCREMENT PRIMARY KEY,
    pontuacao DECIMAL(6,2) NULL,                      -- NULL = cálculo pendente
    limiar DECIMAL(6,4) NULL,                         -- limiar aplicado (guardado para histórico)
    hora_calculo DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_triagem INT NOT NULL UNIQUE,

    -- situação derivada; coluna gerada para nunca ficar inconsistente com a pontuação
    status VARCHAR(15) GENERATED ALWAYS AS (
        CASE
            WHEN pontuacao IS NULL THEN 'pendente'
            WHEN pontuacao >= limiar THEN 'atingido'
            ELSE 'nao_atingido'
        END
    ) STORED,

    CONSTRAINT chk_resultado_pontuacao CHECK (pontuacao IS NULL OR pontuacao >= 0),
    -- não existe pontuação sem limiar para compará-la
    CONSTRAINT chk_resultado_limiar CHECK (pontuacao IS NULL OR limiar IS NOT NULL),

    CONSTRAINT fk_resultado_triagem
        FOREIGN KEY (id_triagem)
        REFERENCES triagem(id_triagem)
        ON DELETE CASCADE
);

CREATE INDEX idx_resultado_status ON resultado_triagem(status);


-- =====================================================================
-- ACOMPANHAMENTO PÓS-TRIAGEM
-- =====================================================================

-- Linha do tempo do paciente depois da triagem. A situação atual é o último evento;
-- o histórico completo é preservado (evento errado é desativado, não apagado).
--
-- REGRA DO BACKEND (quem registra):
--   * encaminhado_exame, exame_realizado, resultado_dna: profissional ou admin;
--   * auxilio_concedido, auxilio_negado: SOMENTE admin (decisão do Instituto);
--   * responsável apenas visualiza.
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
    resultado_dna ENUM('positivo', 'negativo') NULL,  -- só quando tipo = 'resultado_dna'
    data_evento DATE NOT NULL,                        -- quando aconteceu (pode diferir do registro)
    id_triagem INT NULL,                              -- triagem que originou o evento, se houver
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

-- Situação atual de cada paciente (para listas e para o aviso de "triagem dispensável").
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


-- =====================================================================
-- AUDITORIA (quem fez o quê; exigido para dados clínicos e LGPD)
-- =====================================================================

-- REGRA DO BACKEND: registrar também toda CONSULTA à ficha de um paciente por
-- profissional ou admin (acao = 'paciente.consultar'), para que a regra
-- "acessar somente quando necessário" seja verificável.
CREATE TABLE auditoria (
    id_auditoria BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NULL,                              -- NULL em tentativas de login falhas
    acao VARCHAR(50) NOT NULL,                        -- ex.: triagem.editar, paciente.consultar, perfil.promover
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


-- =====================================================================
-- RETENÇÃO DE DADOS
-- =====================================================================

-- Data do último registro de cada paciente e a partir de quando o dado pode ser
-- REVISADO para eliminação (20 anos; referência: Lei 13.787/2018, art. 6º).
-- Premissa adotada pelo grupo: a triagem conta como prontuário. Recomenda-se
-- registrar essa confirmação por escrito junto ao Instituto.
-- Como conta como prontuário: nunca apagar registros (usar ativo = FALSE) e manter
-- a auditoria de toda edição (dados_antes/dados_depois).
-- REGRA DO BACKEND: nunca eliminar automaticamente; o admin revisa, elimina
-- manualmente e a eliminação é registrada na auditoria.
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


-- =====================================================================
-- DADOS INICIAIS: checklist
-- Fonte: Romero et al., Fragile X Syndrome in Brazil (medRxiv, 2025),
-- Tabela 4 (pesos masculinos) e Tabela 5 (pesos femininos).
-- =====================================================================

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


-- =====================================================================
-- PRIMEIRO ADMINISTRADOR
-- Como o cadastro público só cria 'responsavel' e só um admin promove contas,
-- o primeiro admin precisa ser criado à mão. Gere o hash com o MESMO algoritmo
-- que o backend usar, descomente e execute uma única vez:
-- =====================================================================
-- INSERT INTO usuario (nome, email, senha_hash, perfil, email_confirmado_em, aceite_termos_em)
-- VALUES ('Administrador', 'admin@exemplo.org', '<HASH_DA_SENHA>', 'admin', NOW(), NOW());
