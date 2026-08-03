-- ============================================================
-- Calculadora de Pontos do Clã — Forge Master
-- Schema D1 (SQLite)
-- ============================================================
-- Decisões refletidas aqui:
--   - Pontos são armazenados de forma efetiva (não recomputados
--     ao vivo a partir de dado bruto), exceto no rascunho do dia
--     em edição, que precisa recalcular a cada alteração.
--   - Existe UM único slot de rascunho por usuário (não um por
--     dia da semana): categorias nunca se repetem em dias
--     consecutivos, então não há risco de sobreposição.
--   - Pontos confirmados são imutáveis a partir do momento em
--     que são gravados (a confirmação é o gatilho de gravação).
--   - Modificadores individuais não têm log (só o dono edita).
--   - Modificadores do clã têm log, visível a todos os membros.
--   - Constantes de pontuação (não os tiers) são editáveis via
--     painel admin. Tiers (tecnologia, ovo) ficam em JSON
--     versionado no código, fora do banco.
--   - Convites são efêmeros: token com expiração, apagado no uso.
--   - JWT de sessão carrega só usuario_id — eh_admin nunca vai
--     pro cliente; é sempre conferido no servidor a cada acesso
--     à rota secreta do painel admin.
-- ============================================================

-- ---------------------------------------------------------
-- Usuários
-- ---------------------------------------------------------
CREATE TABLE usuarios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT NOT NULL UNIQUE,
  pin_hash      TEXT NOT NULL,
  eh_admin      INTEGER NOT NULL DEFAULT 0,  -- 0/1 (boolean)
  criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------
-- Convites de cadastro (efêmeros, single-use)
-- Apagados imediatamente ao serem usados — reuso simplesmente
-- não encontra o token (sem precisar reter histórico de usados).
-- ---------------------------------------------------------
CREATE TABLE convites (
  token         TEXT PRIMARY KEY,
  criado_por    INTEGER NOT NULL REFERENCES usuarios(id),
  criado_em     TEXT NOT NULL DEFAULT (datetime('now')),
  expira_em     TEXT NOT NULL  -- ISO datetime; checar no fetch e recusar se expirado
);

CREATE INDEX idx_convites_expira ON convites(expira_em);

-- ---------------------------------------------------------
-- Modificadores do clã — lista FIXA e conhecida (18 itens do
-- jogo). Como só existe 1 clã (multi-clã fora de escopo), é
-- uma tabela singleton (1 linha só, id sempre =1), uma coluna
-- por modificador. Qualquer membro edita. Log obrigatório,
-- visível a todos, referenciando o NOME do campo alterado
-- (não um id de linha, já que agora não há mais "linhas" de
-- modificador — são colunas fixas).
-- A categoria de recurso que cada modificador bonifica (ex:
-- invocar_habilidade -> pontos de Habilidade) é regra de
-- negócio fixa no código, não precisa virar coluna no banco.
-- ---------------------------------------------------------
CREATE TABLE modificadores_cla (
  id                    INTEGER PRIMARY KEY CHECK (id = 1),
  martelo               REAL NOT NULL DEFAULT 0,  -- Forjar equipamentos
  invocar_habilidade    REAL NOT NULL DEFAULT 0,
  melhorar_habilidade   REAL NOT NULL DEFAULT 0,
  pesquisa              REAL NOT NULL DEFAULT 0,  -- Árvore de tecnologia
  melhorar_forja        REAL NOT NULL DEFAULT 0,
  chave_masmorra        REAL NOT NULL DEFAULT 0,
  chocar_ovo            REAL NOT NULL DEFAULT 0,  -- Eclosão de ovos
  fundir_pet            REAL NOT NULL DEFAULT 0,  -- Fusão de mascotes
  invocar_montaria      REAL NOT NULL DEFAULT 0,
  fundir_montaria       REAL NOT NULL DEFAULT 0,
  dia_1                 REAL NOT NULL DEFAULT 0,  -- Guerra de Clãs Dia 1
  dia_2                 REAL NOT NULL DEFAULT 0,
  dia_3                 REAL NOT NULL DEFAULT 0,
  dia_4                 REAL NOT NULL DEFAULT 0,
  dia_5                 REAL NOT NULL DEFAULT 0,
  dia_6                 REAL NOT NULL DEFAULT 0,
  dano_guerra           REAL NOT NULL DEFAULT 0,  -- buffa ATK no Dia 6
  vida_guerra           REAL NOT NULL DEFAULT 0,  -- buffa Vida no Dia 6
  atualizado_em         TEXT NOT NULL DEFAULT (datetime('now'))
);

-- seed obrigatório (linha única):
-- INSERT INTO modificadores_cla (id) VALUES (1);

CREATE TABLE modificadores_cla_log (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  campo             TEXT NOT NULL,  -- nome da coluna alterada, ex: 'martelo', 'dia_3', 'fundir_pet'
  usuario_id        INTEGER NOT NULL REFERENCES usuarios(id),
  valor_anterior    REAL NOT NULL,
  valor_novo        REAL NOT NULL,
  data              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_mod_cla_log_campo ON modificadores_cla_log(campo);

-- ---------------------------------------------------------
-- Modificadores individuais (só o dono edita, sem log)
-- Uma linha por usuário (não EAV): o conjunto de campos é
-- pequeno e fixo, então uma tabela larga é mais simples que
-- registro por campo. Não há tabela de "grupo"/categoria do
-- modificador — os grupos (Ovo e Habilidade / Forja / Montaria)
-- são só organização de UI nas sub-abas do front, sem uso na
-- pontuação (o que importa pra pontuar é a categoria do RECURSO
-- do dia, não a do modificador).
-- ---------------------------------------------------------
CREATE TABLE modificadores_individuais (
  usuario_id      INTEGER PRIMARY KEY REFERENCES usuarios(id),
  custo_habilidade REAL NOT NULL DEFAULT 0,
  sorte_pet        REAL NOT NULL DEFAULT 0,
  custo_montaria   REAL NOT NULL DEFAULT 0,
  sorte_montaria   REAL NOT NULL DEFAULT 0,
  tempo_forja      REAL NOT NULL DEFAULT 0,
  custo_forja      REAL NOT NULL DEFAULT 0,
  nivel_forja      REAL NOT NULL DEFAULT 0,
  sorte_martelo    REAL NOT NULL DEFAULT 0,
  atualizado_em    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------
-- Rascunho atual — UM registro por usuário.
-- Representa o dia seguinte (editável infinitas vezes) até
-- virar "hoje", quando só resta confirmar (podendo editar uma
-- última vez antes de confirmar). Some/reseta após confirmar.
--
-- valores_brutos e pontos_calculados são JSON (TEXT), porque o
-- formato muda conforme o dia: categorias normais nos dias 1-5,
-- ou atk/vida/poder no Dia 6. pontos_calculados é recalculado a
-- cada edição, pois alimenta a barra "não confirmado" na Visão
-- do Clã.
-- ---------------------------------------------------------
CREATE TABLE rascunho_atual (
  usuario_id          INTEGER PRIMARY KEY REFERENCES usuarios(id),
  dia_alvo            TEXT NOT NULL,     -- data alvo, formato YYYY-MM-DD
  dia_semana          INTEGER NOT NULL,  -- 1-7 (calendário de guerra)
  valores_brutos      TEXT NOT NULL,     -- JSON
  pontos_calculados   TEXT NOT NULL,     -- JSON (breakdown por categoria, ou {atk,vida,poder})
  atualizado_em       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------
-- Pontos confirmados — imutável a partir da gravação.
-- Uma linha por usuário/dia/categoria (ou 'atk'/'vida'/'poder'
-- no Dia 6). Nunca é dado bruto: só o ponto já calculado.
-- ---------------------------------------------------------
CREATE TABLE pontos_confirmados (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id      INTEGER NOT NULL REFERENCES usuarios(id),
  data            TEXT NOT NULL,     -- YYYY-MM-DD
  dia_semana      INTEGER NOT NULL,  -- 1-7
  categoria       TEXT NOT NULL,     -- categoria macro, ou 'atk'/'vida'/'poder' no Dia 6
  pontos          REAL NOT NULL,
  confirmado_em   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (usuario_id, data, categoria)
);

CREATE INDEX idx_pontos_confirmados_data ON pontos_confirmados(data);
CREATE INDEX idx_pontos_confirmados_usuario ON pontos_confirmados(usuario_id);

-- Consultas típicas que essa estrutura resolve direto:
--   - Ranking do dia (Visão do Clã): SUM(pontos) GROUP BY usuario_id WHERE data = ?
--   - "26/50 responderam": COUNT(DISTINCT usuario_id) WHERE data = ?
--   - Ranking semanal (Dia 7) por categoria: SUM(pontos) WHERE data BETWEEN ? AND ?
--     AND categoria = ? GROUP BY usuario_id
--   - Totais do clã por categoria (Dia 7): mesma query sem o WHERE de categoria,
--     GROUP BY categoria

-- ---------------------------------------------------------
-- Constantes de pontuação editáveis via painel admin
-- (NÃO inclui tiers de Tecnologia/Ovo — esses ficam em JSON
-- versionado no código, por serem raríssimos de mudar).
-- chave: 'forja_equipamento_media' | 'chave_masmorra' |
--        'habilidade_acao' | 'pet_fundir' | 'montaria_acao' |
--        'forja_pontos_por_nivel_assumido' | ...
-- ---------------------------------------------------------
CREATE TABLE constantes_pontos (
  chave           TEXT PRIMARY KEY,
  valor           REAL NOT NULL,
  atualizado_por  INTEGER REFERENCES usuarios(id),
  atualizado_em   TEXT NOT NULL DEFAULT (datetime('now'))
);