// worker/index.ts
import { Hono } from "hono";
import { handleLogin, type Env as AuthEnv } from "./routes/auth.js";

type Bindings = AuthEnv & { ASSETS: Fetcher };

const app = new Hono<{ Bindings: Bindings }>();

app.post("/api/login", (c) => handleLogin(c.req.raw, c.env));

// só pra confirmar que o worker tá de pé
app.get("/api/saude", (c) => c.json({ ok: true }));

// qualquer coisa que não seja /api/* cai aqui e serve o SPA React
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;