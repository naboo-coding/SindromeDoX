CREATE USER IF NOT EXISTS 'sindromex_app'@'localhost' IDENTIFIED BY 'TROQUE_ESTA_SENHA';

GRANT SELECT, INSERT, UPDATE ON SindromeX.usuario TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON SindromeX.token_usuario TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON SindromeX.paciente TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON SindromeX.paciente_responsavel TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON SindromeX.documento_paciente TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON SindromeX.consentimento_lgpd TO 'sindromex_app'@'localhost';
GRANT SELECT ON SindromeX.checklist_versao TO 'sindromex_app'@'localhost';
GRANT SELECT ON SindromeX.checklist_sintoma TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON SindromeX.triagem TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON SindromeX.resultado_triagem TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT, UPDATE ON SindromeX.acompanhamento_paciente TO 'sindromex_app'@'localhost';
GRANT SELECT, INSERT ON SindromeX.auditoria TO 'sindromex_app'@'localhost';

GRANT SELECT ON SindromeX.vw_checklist_prontidao TO 'sindromex_app'@'localhost';
GRANT SELECT ON SindromeX.vw_situacao_paciente TO 'sindromex_app'@'localhost';
GRANT SELECT ON SindromeX.vw_retencao_paciente TO 'sindromex_app'@'localhost';

-- caso queira conferir:
-- SHOW GRANTS FOR 'sindromex_app'@'localhost';
