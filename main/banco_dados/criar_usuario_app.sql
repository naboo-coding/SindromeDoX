-- =====================================================================
-- Usuário do banco usado pelo backend (NÃO use o root no backend).
-- Rode como administrador (root) DEPOIS do sindromeX.sql.
-- Troque a senha antes de executar e use a mesma no .env (DB_PASSWORD).
--
-- Princípio do menor privilégio:
--   * ninguém apaga dado clínico: só SELECT/INSERT/UPDATE (exclusão é lógica, ativo = FALSE);
--   * auditoria é "só acrescentar": SELECT e INSERT, sem UPDATE nem DELETE;
--   * o checklist (pesos e limiares) é só leitura para o app: quem define os
--     pesos é o Instituto, por script, e não pela API;
--   * a única exclusão permitida é a de tokens expirados/usados.
-- =====================================================================

CREATE USER IF NOT EXISTS 'sindromex_app'@'localhost' IDENTIFIED BY 'TROQUE_ESTA_SENHA';

GRANT SELECT, INSERT, UPDATE ON SindromeX.usuario                  TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON SindromeX.token_usuario    TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON SindromeX.paciente                 TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON SindromeX.paciente_responsavel     TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON SindromeX.documento_paciente       TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON SindromeX.consentimento_lgpd       TO 'sindromex_app'@'localhost';
GRANT SELECT                 ON SindromeX.checklist_versao         TO 'sindromex_app'@'localhost';
GRANT SELECT                 ON SindromeX.checklist_sintoma        TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON SindromeX.triagem                  TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON SindromeX.resultado_triagem        TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON SindromeX.acompanhamento_paciente  TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT         ON SindromeX.auditoria                TO 'sindromex_app'@'localhost';

GRANT SELECT ON SindromeX.vw_checklist_prontidao TO 'sindromex_app'@'localhost';
GRANT SELECT ON SindromeX.vw_situacao_paciente   TO 'sindromex_app'@'localhost';
GRANT SELECT ON SindromeX.vw_retencao_paciente   TO 'sindromex_app'@'localhost';

-- Conferir:
-- SHOW GRANTS FOR 'sindromex_app'@'localhost';
