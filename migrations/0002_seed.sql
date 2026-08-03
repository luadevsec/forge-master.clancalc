-- ============================================================
-- Seed inicial — obrigatório antes de usar o app
-- ============================================================

-- Linha singleton de modificadores do clã (todos começam em 0,
-- editáveis depois por qualquer membro via UI)
INSERT INTO modificadores_cla (id) VALUES (1);

-- Usuário admin inicial. Troque 'lua' pelo nome que você quiser
-- usar, e troque o pin_hash abaixo pelo hash real do PIN
-- (gerado pela sua função de hash, ex. no worker: hashPin('1234')).
-- Esse INSERT é só um placeholder de estrutura — não use
-- 'troque_este_hash' em produção.
INSERT INTO usuarios (nome, pin_hash, eh_admin)
VALUES ('lua', '1234', 1);