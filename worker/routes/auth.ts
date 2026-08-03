// worker/routes/auth.ts
//
// Rota de login. Escrita como função pura (Request, Env) -> Response,
// pra plugar em qualquer router (Hono, itty-router, ou fetch handler
// puro) — só chama handleLogin(request, env) na rota POST /login.

import { verifyPin } from "../lib/pin.js";
import { signJwt } from "../lib/jwt.js";

export interface Env {
  DB: D1Database;
  JWT_SECRET: string; // wrangler secret put JWT_SECRET
  LOGIN_LIMITER: RateLimit; // binding definido no wrangler.jsonc
}

interface LoginBody {
  nome: string;
  pin: string;
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  // --- 1. Rate limit por IP, ANTES de tocar no banco ---
  const ip = request.headers.get("CF-Connecting-IP") ?? "desconhecido";
  const { success } = await env.LOGIN_LIMITER.limit({ key: ip });
  if (!success) {
    return new Response(JSON.stringify({ erro: "Muitas tentativas. Aguarde um pouco." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  // --- 2. Parse do body ---
  let body: LoginBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ erro: "Corpo inválido" }), { status: 400 });
  }

  if (!body.nome || !body.pin) {
    return new Response(JSON.stringify({ erro: "Nome e PIN são obrigatórios" }), { status: 400 });
  }

  // --- 3. Busca o usuário ---
  const usuario = await env.DB.prepare(
    "SELECT id, pin_hash FROM usuarios WHERE nome = ?"
  )
    .bind(body.nome)
    .first<{ id: number; pin_hash: string }>();

  // Mensagem genérica de propósito (não vaza se foi o nome ou o PIN que errou)
  const erroGenerico = new Response(JSON.stringify({ erro: "Usuário ou PIN inválido" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });

  if (!usuario) return erroGenerico;

  // --- 4. Confere o PIN ---
  const pinValido = await verifyPin(body.pin, usuario.pin_hash);
  if (!pinValido) return erroGenerico;

  // --- 5. Emite o JWT (só usuario_id — nunca eh_admin) ---
  const token = await signJwt(usuario.id, env.JWT_SECRET);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // httpOnly: JS do navegador não lê o cookie.
      // Secure: só trafega em HTTPS (Cloudflare já força isso).
      // SameSite=Strict: cookie não vai em requests cross-site.
      "Set-Cookie": `sessao=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${
        60 * 60 * 24 * 7
      }`,
    },
  });
}
