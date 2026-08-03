// worker/lib/jwt.ts
//
// JWT minimalista (HS256) usando só Web Crypto — sem lib externa.
// Payload carrega SÓ usuario_id (nunca eh_admin — status de admin
// é sempre checado no D1 a cada acesso à rota secreta do painel).

export interface JwtPayload {
  usuario_id: number;
  exp: number; // unix timestamp (segundos)
}

function base64url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = "";
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const str = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
  return Uint8Array.from(str, (c) => c.charCodeAt(0));
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Assina um JWT válido por `expiresInSeconds` (padrão: 7 dias). */
export async function signJwt(
  usuario_id: number,
  secret: string,
  expiresInSeconds = 60 * 60 * 24 * 7
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const payload: JwtPayload = {
    usuario_id,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await getKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));

  return `${data}.${base64url(signature)}`;
}

/** Verifica um JWT. Retorna o payload se válido, ou null se inválido/expirado. */
export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  const key = await getKey(secret);
  const data = `${encodedHeader}.${encodedPayload}`;
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64urlDecode(encodedSignature),
    new TextEncoder().encode(data)
  );
  if (!valid) return null;

  const payload: JwtPayload = JSON.parse(new TextDecoder().decode(base64urlDecode(encodedPayload)));
  if (payload.exp < Math.floor(Date.now() / 1000)) return null; // expirado

  return payload;
}
