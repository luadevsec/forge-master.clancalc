# Arquitetura — Calculadora de Pontos do Clã (Forge Master)

> Última atualização: 2 de agosto de 2026
> Este arquivo é a fonte de verdade do projeto. Toda decisão de arquitetura tomada deve ser refletida aqui.

## 1. Visão geral

Webapp para calcular a pontuação de um clã do jogo Forge Master (ciclo de guerra semanal com árvore tecnológica). O clã tem 50 membros. Cada membro registra recursos diários (conforme a categoria liberada naquele dia da semana), que geram pontos individuais; a soma de todos é a pontuação do clã.

## 2. Stack

- **Frontend**: React + TypeScript + Vite — **SPA de tela única** (troca de view por estado do React, sem rotas de URL)
- **Backend/API**: Cloudflare Workers + **Hono** (router)
- **Banco**: Cloudflare D1 (SQLite)
- **Deploy**: GitHub → Cloudflare Pages/Workers, CI/CD automático a cada push
- **Custo**: R$0 (free tier)
- **Repo local**: `forge-master-clancalc`

## 3. Roteamento (SPA + API no mesmo Worker)

Configurado via `wrangler.jsonc`:

```jsonc
"assets": {
  "directory": "./dist",
  "binding": "ASSETS",
  "not_found_handling": "single-page-application",
  "run_worker_first": ["/api/*"]
}
```

- Tudo em `/api/*` passa pelo Hono primeiro (`run_worker_first`)
- Qualquer outra rota cai no fallback de assets estáticos → serve o SPA (`index.html`), sem 404
- O React nunca "navega" pra URLs de verdade — todas as chamadas de dado são `fetch('/api/...')` de dentro do próprio app

## 4. Modelo de dados (D1)

| Tabela | Propósito |
|---|---|
| `usuarios` | id, nome, pin_hash (`salt:hash` SHA-256), eh_admin |
| `convites` | Token efêmero de cadastro (~1 dia de validade), apagado no uso |
| `modificadores_cla` | **Tabela singleton** (1 linha, `id=1`) — 18 colunas fixas, uma por modificador do clã (só existe 1 clã) |
| `modificadores_cla_log` | Log de auditoria dos modificadores do clã — visível a **todos** os membros, referencia o nome da coluna alterada (`campo`) |
| `modificadores_individuais` | 1 linha por usuário, 8 colunas fixas (ver seção 5) — **sem log** (só o dono edita) |
| `rascunho_atual` | 1 linha por usuário — o dia "amanhã" em edição livre, vira "hoje" até ser confirmado |
| `pontos_confirmados` | **Imutável** a partir da gravação — 1 linha por usuário/dia/categoria, só o ponto final (nunca o dado bruto) |
| `constantes_pontos` | Constantes de pontuação editáveis via painel admin (não inclui tiers) |

### 4.1 Modificadores individuais (8 campos fixos)
`custo_habilidade`, `sorte_pet`, `custo_montaria`, `sorte_montaria`, `tempo_forja`, `custo_forja`, `nivel_forja`, `sorte_martelo`

> **Atenção**: `nivel_forja` (modificador, influencia pontos de **Martelo**) é diferente de "níveis de melhoria de forja comprados" (recurso do dia, alimenta pontos de **Forja** — vive no JSON do rascunho, não é modificador).

### 4.2 Modificadores do clã (18 campos fixos)
`martelo`, `invocar_habilidade`, `melhorar_habilidade`, `pesquisa`, `melhorar_forja`, `chave_masmorra`, `chocar_ovo`, `fundir_pet`, `invocar_montaria`, `fundir_montaria`, `dia_1`...`dia_6`, `dano_guerra`, `vida_guerra`

A categoria de recurso que cada modificador bonifica é **regra de negócio fixa no código** (na função de pontuação), não é coluna no banco.

### 4.3 Tiers (Tecnologia, Ovo)
Ficam em **JSON versionado no código** (não no banco, não editável via admin) — mudança rara/drástica no jogo. *(arquivo ainda não criado)*

## 5. Fluxo de pontuação — rascunho vs. confirmado

- **Um único slot de rascunho por usuário** (não um por dia da semana) — categorias nunca se repetem em dias consecutivos
- Enquanto o rascunho representa "amanhã": editável infinitas vezes, pontos recalculados ao vivo a cada edição
- Quando vira "hoje": o usuário pode editar **uma última vez** e precisa **confirmar** ativamente
- **Confirmar = gravação imutável** em `pontos_confirmados` (só o ponto final, nunca o dado bruto)
- Depois de confirmado, o slot de rascunho zera e recebe o próximo dia
- Na Visão do Clã: barra confirmado/não-confirmado (o rascunho de todo mundo já vem com ponto calculado, mesmo antes de confirmar) + texto tipo "26/50 responderam"
- **Pontos são armazenados por categoria**, não só o total (necessário pros filtros do ranking do Dia 7)

## 6. Autenticação e segurança

- **Login**: usuário + PIN → hash **SHA-256 + salt aleatório** (`worker/lib/pin.ts`), formato salvo `saltHex:hashHex`
- **Rate limit**: binding nativo do Cloudflare (`LOGIN_LIMITER`, 5 tentativas/60s por IP) — sem KV/D1 manual
- **Sessão**: JWT HS256 (`worker/lib/jwt.ts`), carrega **só** `usuario_id` (nunca `eh_admin`) — em cookie `HttpOnly; Secure; SameSite=Strict`
- **JWT_SECRET**: secret remoto via `wrangler secret put`, e local via `.dev.vars` (git-ignored)
- **Middleware** (`worker/lib/authMiddleware.ts`): lê o cookie, valida o JWT, injeta `usuario_id` no contexto — aplicado explicitamente por rota protegida (não um `/api/*` genérico, pra não proteger o próprio `/api/login`)

## 7. Painel admin

- **Não é uma URL separada** — é uma tela dentro do mesmo SPA (troca de estado do React)
- Ativado por um **gesto secreto** na UI (ex: segurar o logo) — dispara uma chamada de API
- **Toda a decisão de "é admin?" é feita no servidor**, a cada acesso, consultando `usuarios.eh_admin` no D1 — o JWT nunca carrega essa flag
- Se não for admin: resposta é um **404 de verdade** (o React nem carrega o bundle do painel)
- Se for admin: o componente do painel é carregado via `React.lazy`/`import()` **só depois** da confirmação do servidor
- Funcionalidades do painel: criar contas, definir quem é admin, gerar convite de cadastro, resetar PIN (gera um novo PIN aleatório de 4 dígitos), editar `constantes_pontos`

## 8. Cadastro de jogadores

- Só admin gera o convite (token em `convites`, validade ~1 dia)
- Convite é **apagado do banco assim que usado** — reuso simplesmente não encontra o token, sem precisar reter histórico

## 9. Checklist de progresso

- [x] Schema D1 completo (`migrations/0001_init.sql`, `0002_seed.sql`)
- [x] Login (rate limit → hash → D1 → JWT → cookie)
- [x] Middleware de autenticação
- [ ] Função de pontuação (recurso bruto + modificadores + constantes → ponto)
- [ ] JSON versionado de tiers (Tecnologia, Ovo)
- [ ] Rotas de rascunho (criar/editar "amanhã", recalcular ao vivo)
- [ ] Rota de confirmar (trava o dia, grava em `pontos_confirmados`)
- [ ] Rotas de modificadores individuais (GET/PUT do próprio usuário)
- [ ] Rotas de modificadores do clã (GET/PUT + log de auditoria)
- [ ] Rotas de admin (verificar admin, resetar PIN, gerar convite, editar constantes)
- [ ] Rota de cadastro via convite
- [ ] Front-end React (ainda só existe o protótipo estático em HTML)