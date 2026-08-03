// worker/lib/authMiddleware.ts
import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { verifyJwt } from "./jwt.js";

export interface AuthEnv {
  Bindings: { JWT_SECRET: string };
  Variables: { usuario_id: number };
}

/**
 * Middleware de autenticação. Aplica em qualquer rota que precise
 * saber "quem tá logado" (rascunho, confirmar pontos, modificadores
 * individuais, etc). Se não tiver cookie válido, corta com 401 antes
 * de chegar no handler da rota.
 *
 * Uso:
 *   app.use("/api/rascunho/*", requireAuth);
 *   app.post("/api/rascunho", (c) => {
 *     const usuario_id = c.get("usuario_id"); // já validado
 *     ...
 *   });
 */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const token = getCookie(c, "sessao");
  if (!token) {
    return c.json({ erro: "Não autenticado" }, 401);
  }

  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ erro: "Sessão inválida ou expirada" }, 401);
  }

  c.set("usuario_id", payload.usuario_id);
  await next();
});
