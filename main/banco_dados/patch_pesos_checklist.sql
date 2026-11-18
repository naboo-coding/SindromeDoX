-- =====================================================================
-- PATCH — pesos do checklist (versão ativa)
-- Para quem JÁ criou o banco com os pesos vazios: rode só este arquivo, como root.
-- (Quem recriar o banco com o sindromeX.sql atual não precisa dele.)
-- Fonte: Romero et al., Fragile X Syndrome in Brazil (medRxiv, 2025),
-- Tabela 4 (masculino) e Tabela 5 (feminino). Limiar: 0,56 (M) e 0,55 (F).
-- =====================================================================
USE SindromeX;

UPDATE checklist_sintoma s
JOIN checklist_versao v ON v.id_checklist_versao = s.id_checklist_versao AND v.ativa = TRUE
SET s.peso_m = CASE s.codigo
        WHEN 'speechDelay'            THEN 0.14
        WHEN 'learningDifficulty'     THEN 0.18
        WHEN 'attentionDeficit'       THEN 0.17
        WHEN 'intellectualDisability' THEN 0.32
        WHEN 'hyperactivity'          THEN 0.12
        WHEN 'aggressiveness'         THEN 0.01
        WHEN 'avoidsEyeContact'       THEN 0.06
        WHEN 'avoidsPhysicalContact'  THEN 0.04
        WHEN 'repetitiveMovements'    THEN 0.17
        WHEN 'hyperextensibility'     THEN 0.19
        WHEN 'macroorchidism'         THEN 0.26
        WHEN 'longFace'               THEN 0.29
    END,
    s.peso_f = CASE s.codigo
        WHEN 'speechDelay'            THEN 0.01
        WHEN 'learningDifficulty'     THEN 0.28
        WHEN 'attentionDeficit'       THEN 0.12
        WHEN 'intellectualDisability' THEN 0.20
        WHEN 'hyperactivity'          THEN 0.04
        WHEN 'aggressiveness'         THEN 0.02
        WHEN 'avoidsEyeContact'       THEN 0.08
        WHEN 'avoidsPhysicalContact'  THEN 0.07
        WHEN 'repetitiveMovements'    THEN 0.05
        WHEN 'hyperextensibility'     THEN 0.04
        WHEN 'longFace'               THEN 0.09
        ELSE NULL   -- macroorchidism só vale para o sexo masculino
    END;

UPDATE checklist_versao SET limiar_m = 0.56, limiar_f = 0.55 WHERE ativa = TRUE;

-- Conferir: as duas linhas devem sair com pronto = 1.
SELECT p.sexo, p.pronto
FROM vw_checklist_prontidao p
JOIN checklist_versao v ON v.id_checklist_versao = p.id_checklist_versao
WHERE v.ativa = TRUE;
