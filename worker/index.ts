// worker/index.ts
import { Hono } from "hono";
import { handleLogin, type Env as AuthEnv } from "./routes/auth.js";
import { requireAuth } from "./lib/authMiddleware.js";

type Bindings = AuthEnv & { ASSETS: Fetcher };
type Variables = { usuario_id: number };

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// --- rotas públicas (sem login) ---
app.post("/api/login", (c) => handleLogin(c.req.raw, c.env));
app.get("/api/saude", (c) => c.json({ ok: true }));

// --- a partir daqui, tudo exige estar logado ---
// aplica o middleware só nos prefixos protegidos (explícito é melhor
// que um "/api/*" genérico, que acabaria protegendo /api/login também)
app.use("/api/eu", requireAuth);
app.use("/api/rascunho/*", requireAuth);
app.use("/api/pontos/*", requireAuth);

// rota de exemplo: devolve quem tá logado (bom pro React confirmar
// a sessão ao carregar o app, sem precisar logar de novo)
app.get("/api/eu", (c) => c.json({ usuario_id: c.get("usuario_id") }));

// qualquer coisa que não seja /api/* cai aqui e serve o SPA React
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;