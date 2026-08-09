# Arquitetura — Calculadora de Pontos do Clã (Forge Master)

> Última atualização: 9 de agosto de 2026
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
| `modificadores_cla` | **Tabela singleton** (1 linha, `id=1`) — colunas fixas, uma por modificador do clã (só existe 1 clã) |
| `modificadores_cla_log` | Log de auditoria dos modificadores do clã — visível a **todos** os membros, referencia o nome da coluna alterada (`campo`) |
| `modificadores_individuais` | 1 linha por usuário, colunas fixas (ver seção 4.1) — **sem log** (só o dono edita) |
| `rascunho_atual` | 1 linha por usuário — o dia "amanhã" em edição livre, vira "hoje" até ser confirmado |
| `pontos_confirmados` | **Imutável** a partir da gravação — 1 linha por usuário/dia/categoria, só o ponto final (nunca o dado bruto) |
| `constantes_pontos` | Constantes de pontuação editáveis via painel admin (não inclui tiers) |

### 4.1 Modificadores individuais

Campos originais (migration `0001_init.sql`): `custo_habilidade`, `sorte_pet`, `custo_montaria`, `sorte_montaria`, `tempo_forja`, `custo_forja`, `nivel_forja`, `sorte_martelo`

> **Atenção**: `nivel_forja` influencia pontos de **Martelo** (define qual linha da tabela de probabilidade de raridade usar) — é diferente do "nível de melhoria de forja" (input do dia, alimenta pontos de **Forja**).

Campos adicionados na migration `0003_ovo_pet.sql` (mecânica de Ovo/Pet): `tier_ovo_atual`, `chocadeiras_extras`, e os 6 campos de Timer Speed por tier: `velocidade_choco_branco`, `velocidade_choco_azul`, `velocidade_choco_verde`, `velocidade_choco_amarelo`, `velocidade_choco_vermelho`, `velocidade_choco_roxo`.

Tipo TypeScript espelhando essa tabela: `ModificadoresIndividuais` em `worker/data/tipos.ts`.

### 4.2 Modificadores do clã

Campos originais (migration `0001_init.sql`): `martelo`, `invocar_habilidade`, `melhorar_habilidade`, `pesquisa`, `melhorar_forja`, `chave_masmorra`, `chocar_ovo`, `fundir_pet`, `invocar_montaria`, `fundir_montaria`, `dia_1`...`dia_6`, `dano_guerra`, `vida_guerra`

Campos adicionados na migration `0003_ovo_pet.sql`: os mesmos 6 campos de Timer Speed por tier que os individuais (`velocidade_choco_<tier>`), aplicados no nível do clã — os dois SOMAM antes de aplicar a fórmula de tempo (ver seção 5.6).

A categoria de recurso que cada modificador bonifica é **regra de negócio fixa no código** (na função de pontuação), não é coluna no banco.

Tipo TypeScript espelhando essa tabela: `ModificadoresCla` em `worker/data/tipos.ts`.

### 4.3 Dados do jogo (tiers, tabelas, constantes)

Ao contrário do que esse README dizia antes, isso **não ficou em JSON** — virou **TypeScript puro** (`worker/data/*.ts`), porque `resolveJsonModule` dava dor de cabeça sem necessidade. TypeScript dá o mesmo benefício (dado versionado no código, editável sem migration) com type-checking de graça. Quatro arquivos, cada um com uma responsabilidade:

- **`worker/data/constantes.ts`** — mecânica do jogo: quantidades, tempos, probabilidades, tabelas de nível (tiers de ovo, níveis de forja, probabilidade de raridade do martelo, pesos do Dia 6). Muda quando o jogo muda a *mecânica*.
- **`worker/data/pontos-base.ts`** — quanto cada ação vale em pontos, ANTES do bônus do clã. Muda quando o jogo *rebalanceia pontuação*.
- **`worker/data/recurso-fixo.ts`** — quantidades diárias que o jogo dá igual pra todo mundo, sem input do usuário (ex: 8 chaves de masmorra/dia).
- **`worker/data/tipos.ts`** — tipos TypeScript que espelham as tabelas do D1 (`ModificadoresCla`, `ModificadoresIndividuais`). Mudam junto com as migrations — se uma migration adiciona coluna, esse arquivo precisa ser atualizado manualmente também (não há geração automática configurada ainda).

## 5. Motor de cálculo (`worker/services/`)

Dividido em três arquivos com responsabilidades bem separadas:

- **`calc.ts`** — funções **puras** de pontuação, uma por categoria, agrupadas no objeto `calc` (`calc.chaveMasmorra(...)`, `calc.habilidade(...)`, etc). Nunca decidem nada, só somam pontos a partir de inputs já prontos.
- **`utils.ts`** — lógica de **decisão/otimização** que roda ANTES do calc, pra decidir "o quê" será pontuado (ex: quais ovos chocar). Também tem funções de apoio que não são pontuação nenhuma (tempo de forja, stats de batalha).
- **`bonus.ts`** — camada de **composição de bônus**: junta o bônus de calendário (Guerra de Clãs Dia 1-6) com o bônus de categoria antes de chamar `calc`. Ver seção 5.7.

**Regra do projeto**: as funções de `calc` e `utils` **nunca validam input** (nível fora do intervalo, divisor zerado, percentual negativo, etc). Validação é responsabilidade de uma camada externa, ainda não escrita, que roda antes de chamar essas funções.

### 5.1 As 7 categorias (todas fechadas em `calc.ts`)

| Categoria | Notas |
|---|---|
| `chaveMasmorra` | Quantidade fixa (`recursoFixo`) × pontos por chave × bônus do clã |
| `habilidade` | Ticket gasto → invocações → 5 habilidades cada; melhoria automática a cada 10 |
| `montaria` | Invocação com sorte absoluta (garantida, não especulada) + fusão |
| `ovo` | 6 tiers, sorte global, fusão com regra de "tier protegido"; a distribuição de QUAIS ovos chocar vem de `utils.distribuirOvosNasChocadeiras` (ver 5.2) |
| `forja` | Ouro gasto em nodes × 27 pts/1000; tabela de 35 níveis (custo + tempo de melhoria) |
| `martelo` | Martelos → forjas (com sorte absoluta) → valor esperado por raridade, usando a tabela de probabilidade por nível (`nivel_forja`) |
| `tecnologia` | Lookup simples de 5 níveis, sem sorte nem estado |

### 5.2 Ovo/Pet — mecânica de chocadeiras (Timer Speed)

Cada jogador tem `2 + chocadeiras_extras` chocadeiras, cada uma com **23h de capacidade independente** (não soma — 2 chocadeiras de 23h ≠ 1 de 46h). O tempo de choco de cada tier é multiplicado (não subtraído) pelo Timer Speed:

```
tempo_final = tempo_base / (1 + (velocidade_cla% + velocidade_individual%) / 100)
```

Confirmado contra a tabela oficial "Egg Hatching Times" (Level 5 = 50% = tempo ÷ 1,5).

`utils.distribuirOvosNasChocadeiras` resolve isso como um **bounded knapsack**, uma chocadeira de cada vez (nunca soma capacidade), maximizando o valor real de chocar cada ovo — que inclui o bônus de fusão marginal quando o tier está protegido (`tier_ovo_atual` pra cima). Documentado em detalhe (com aula de knapsack) num artifact separado gerado durante o desenvolvimento.

### 5.3 Forja — nodes e melhoria

O jogador compra nodes (ouro, instantâneo) até completar todos os nodes de um nível; só DEPOIS de completar todos, o timer de "melhoria" começa (tabela `constantes.forja.niveis`, 35 níveis). O tempo de melhoria **não afeta pontuação** — só ouro gasto conta. `utils.calcularTempoMelhoriaForja` calcula o tempo só pra exibição.

### 5.4 Martelo — valor esperado por raridade

Cada forja sorteia uma raridade (10 categorias, Primitive→Divine) segundo a tabela de probabilidade daquele nível (`nivel_forja`, modificador individual). Como o resultado é aleatório, a pontuação usa **valor esperado** (média ponderada das probabilidades × pontos de cada categoria) em vez de tentar distribuir em quantidades inteiras — matematicamente equivalente, sem inventar arredondamento pra um processo já probabilístico.

### 5.5 Dia 6 — Batalha

ATK, Vida e Poder são **digitados direto da tela do jogo** pelo jogador — não são calculados a partir de outra coisa. Uma tentativa de regressão (9 amostras reais) pra derivar Poder a partir de ATK/Vida deu erro de até 16% ponto a ponto (provavelmente por substats que não temos visibilidade), então **não usamos isso pra calcular Poder do zero**.

`utils.calcularStatsBatalha` aplica os bônus de combate (`dano_guerra` em ATK, `vida_guerra` em Vida) diretamente, e estima o crescimento do Poder como uma **razão** (Poder-com-buff ÷ Poder-sem-buff, usando a fórmula aproximada só como régua interna), aplicada em cima do Poder real declarado — não o valor absoluto que a fórmula prevê. Isso cancela boa parte do erro da regressão, porque os substats do jogador são os mesmos antes e depois do buff.

Não retorna pontos — é usado pra decisão estratégica (ranking de força pra escolha de confronto), não soma no total semanal.

### 5.6 Timer Speed — mecânica compartilhada

Onde já confirmado (choco de ovo): é **multiplicador**, não desconto — `tempo / (1 + velocidade%/100)`, clã e individual somam antes de dividir. Aplicado por tier separadamente (não é 1 velocidade global).

### 5.7 Bônus de calendário (Guerra de Clãs Dia 1-6) — aditivo, não composto

Confirmado: o bônus do dia (`modificadores_cla.dia_1`...`dia_6`) **soma** com o bônus de categoria antes de multiplicar — nunca é uma segunda multiplicação em cima de um total já bonificado:

```
pontos = base × (1 + (bonusCategoria% + bonusDia%) / 100)
```

Categorias com 2 ações (Habilidade, Montaria, Ovo) precisam do bônus do dia somado **nos dois** bônus separadamente, não uma vez só no total. `worker/services/bonus.ts` (`bonusDoDia`, `combinarBonus`) centraliza essa composição — toda chamada de `calc` que usa bônus do clã deve passar por `combinarBonus` primeiro, nunca o bônus de categoria puro.

## 6. Fluxo de pontuação — rascunho vs. confirmado

- **Um único slot de rascunho por usuário** (não um por dia da semana) — categorias nunca se repetem em dias consecutivos
- Enquanto o rascunho representa "amanhã": editável infinitas vezes, pontos recalculados ao vivo a cada edição
- Quando vira "hoje": o usuário pode editar **uma última vez** e precisa **confirmar** ativamente
- **Confirmar = gravação imutável** em `pontos_confirmados` (só o ponto final, nunca o dado bruto)
- Depois de confirmado, o slot de rascunho zera e recebe o próximo dia
- Na Visão do Clã: barra confirmado/não-confirmado (o rascunho de todo mundo já vem com ponto calculado, mesmo antes de confirmar) + texto tipo "26/50 responderam"
- **Pontos são armazenados por categoria**, não só o total (necessário pros filtros do ranking do Dia 7)

## 7. Autenticação e segurança

- **Login**: usuário + PIN → hash **SHA-256 + salt aleatório** (`worker/lib/pin.ts`), formato salvo `saltHex:hashHex`
- **Rate limit**: binding nativo do Cloudflare (`LOGIN_LIMITER`, 5 tentativas/60s por IP) — sem KV/D1 manual
- **Sessão**: JWT HS256 (`worker/lib/jwt.ts`), carrega **só** `usuario_id` (nunca `eh_admin`) — em cookie `HttpOnly; Secure; SameSite=Strict`
- **JWT_SECRET**: secret remoto via `wrangler secret put`, e local via `.dev.vars` (git-ignored)
- **Middleware** (`worker/lib/authMiddleware.ts`): lê o cookie, valida o JWT, injeta `usuario_id` no contexto — aplicado explicitamente por rota protegida (não um `/api/*` genérico, pra não proteger o próprio `/api/login`)

## 8. Painel admin

- **Não é uma URL separada** — é uma tela dentro do mesmo SPA (troca de estado do React)
- Ativado por um **gesto secreto** na UI (ex: segurar o logo) — dispara uma chamada de API
- **Toda a decisão de "é admin?" é feita no servidor**, a cada acesso, consultando `usuarios.eh_admin` no D1 — o JWT nunca carrega essa flag
- Se não for admin: resposta é um **404 de verdade** (o React nem carrega o bundle do painel)
- Se for admin: o componente do painel é carregado via `React.lazy`/`import()` **só depois** da confirmação do servidor
- Funcionalidades do painel: criar contas, definir quem é admin, gerar convite de cadastro, resetar PIN (gera um novo PIN aleatório de 4 dígitos), editar `constantes_pontos`

## 9. Cadastro de jogadores

- Só admin gera o convite (token em `convites`, validade ~1 dia)
- Convite é **apagado do banco assim que usado** — reuso simplesmente não encontra o token, sem precisar reter histórico

## 10. Checklist de progresso

- [x] Schema D1 completo (`migrations/0001_init.sql`, `0002_seed.sql`, `0003_ovo_pet.sql`)
- [x] Login (rate limit → hash → D1 → JWT → cookie)
- [x] Middleware de autenticação
- [x] Motor de cálculo completo — `calc.ts` (7 categorias), `utils.ts` (knapsack de ovo, tempo de forja, stats de batalha), `bonus.ts` (composição de bônus de calendário)
- [x] Dados do jogo versionados no código (`worker/data/*.ts` — não é mais JSON)
- [x] Dia 6 (Batalha) — ATK/Vida/Poder buffados
- [ ] Rotas de rascunho (criar/editar "amanhã", recalcular ao vivo)
- [ ] Rota de confirmar (trava o dia, grava em `pontos_confirmados`)
- [ ] Rotas de modificadores individuais (GET/PUT do próprio usuário)
- [ ] Rotas de modificadores do clã (GET/PUT + log de auditoria)
- [ ] Rotas de admin (verificar admin, resetar PIN, gerar convite, editar constantes)
- [ ] Rota de cadastro via convite
- [ ] Camada de validação externa (fora de calc/utils) — nível fora do intervalo, divisor zerado, etc.
- [ ] Front-end React (ainda só existe o protótipo estático em HTML)