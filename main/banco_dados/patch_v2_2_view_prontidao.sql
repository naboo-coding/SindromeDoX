USE SindromeX;

CREATE OR REPLACE VIEW vw_checklist_prontidao AS
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
