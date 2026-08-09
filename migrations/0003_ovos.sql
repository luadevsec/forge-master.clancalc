-- ============================================================
-- Migração 0003 — Ovo / Pet: chocadeiras, tier atual e
-- velocidade de choco (Timer Speed — individual + clã)
-- ============================================================
-- Contexto: a mecânica de Ovo precisa saber, por jogador:
--   - quantas chocadeiras extras ele tem (além das 2 base do jogo)
--   - qual o "tier atual" dele (protege esse tier e os acima na
--     hora de calcular o que sobra pra fusão)
--   - a % de Timer Speed de choco, POR TIER (6 tiers), tanto
--     individual quanto do clã — os dois SOMAM antes de aplicar:
--       tempo_final = tempo_base / (1 + (velocidade_cla + velocidade_individual) / 100)
--     NÃO é desconto subtrativo — é multiplicador de velocidade
--     (confirmado com a tabela oficial "Egg Hatching Times":
--     Level 5 = 50% Timer Speed = tempo dividido por 1.5).
-- ============================================================

-- ---------------------------------------------------------
-- Modificadores individuais
-- ---------------------------------------------------------
ALTER TABLE modificadores_individuais ADD COLUMN tier_ovo_atual TEXT NOT NULL DEFAULT 'branco';
ALTER TABLE modificadores_individuais ADD COLUMN chocadeiras_extras INTEGER NOT NULL DEFAULT 0; -- 0 a 3

ALTER TABLE modificadores_individuais ADD COLUMN velocidade_choco_branco   REAL NOT NULL DEFAULT 0;
ALTER TABLE modificadores_individuais ADD COLUMN velocidade_choco_azul     REAL NOT NULL DEFAULT 0;
ALTER TABLE modificadores_individuais ADD COLUMN velocidade_choco_verde    REAL NOT NULL DEFAULT 0;
ALTER TABLE modificadores_individuais ADD COLUMN velocidade_choco_amarelo  REAL NOT NULL DEFAULT 0;
ALTER TABLE modificadores_individuais ADD COLUMN velocidade_choco_vermelho REAL NOT NULL DEFAULT 0;
ALTER TABLE modificadores_individuais ADD COLUMN velocidade_choco_roxo     REAL NOT NULL DEFAULT 0;

-- ---------------------------------------------------------
-- Modificadores do clã (singleton, id=1)
-- ---------------------------------------------------------
ALTER TABLE modificadores_cla ADD COLUMN velocidade_choco_branco   REAL NOT NULL DEFAULT 0;
ALTER TABLE modificadores_cla ADD COLUMN velocidade_choco_azul     REAL NOT NULL DEFAULT 0;
ALTER TABLE modificadores_cla ADD COLUMN velocidade_choco_verde    REAL NOT NULL DEFAULT 0;
ALTER TABLE modificadores_cla ADD COLUMN velocidade_choco_amarelo  REAL NOT NULL DEFAULT 0;
ALTER TABLE modificadores_cla ADD COLUMN velocidade_choco_vermelho REAL NOT NULL DEFAULT 0;
ALTER TABLE modificadores_cla ADD COLUMN velocidade_choco_roxo     REAL NOT NULL DEFAULT 0;

-- Nota: modificadores_cla_log já cobre essas colunas novas sem
-- precisar de mudança — campo é TEXT (nome da coluna alterada).

-- Nota: NÃO há coluna nova para "ovos para fusão declarados" —
-- esse é um valor do DIA, não um modificador fixo, então vive no
-- JSON valores_brutos de rascunho_atual, sem mexer em schema.