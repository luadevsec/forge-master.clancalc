// worker/lib/pin.ts
//
// Hash de PIN com SHA-256 + salt aleatório, usando a Web Crypto API
// (crypto.subtle e crypto.getRandomValues são nativas no runtime
// dos Workers — não precisa de nenhuma lib externa).
//
// Formato salvo em usuarios.pin_hash: "saltHex:hashHex"

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function sha256Hex(input: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", input);
  return toHex(digest);
}

/**
 * Gera o hash pra salvar no banco a partir de um PIN em texto puro.
 * Ex: const pinHash = await hashPin("1234");
 */
export async function hashPin(pin: string): Promise<string> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = toHex(saltBytes.buffer);

  const encoder = new TextEncoder();
  const combined = new Uint8Array([...saltBytes, ...encoder.encode(pin)]);
  const hashHex = await sha256Hex(combined);

  return `${saltHex}:${hashHex}`;
}

/**
 * Confere se um PIN em texto puro bate com o hash salvo no banco.
 * Comparação em tempo constante pra evitar timing attack.
 */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [saltHex, expectedHashHex] = stored.split(":");
  if (!saltHex || !expectedHashHex) return false;

  const saltBytes = fromHex(saltHex);
  const encoder = new TextEncoder();
  const combined = new Uint8Array([...saltBytes, ...encoder.encode(pin)]);
  const actualHashHex = await sha256Hex(combined);

  if (actualHashHex.length !== expectedHashHex.length) return false;

  // Comparação byte a byte em tempo constante
  let diff = 0;
  for (let i = 0; i < actualHashHex.length; i++) {
    diff |= actualHashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
  }
  return diff === 0;
}

/** Gera um PIN aleatório de 4 dígitos, pro fluxo de reset do admin. */
export function gerarPinAleatorio(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 10000;
  return n.toString().padStart(4, "0");
}
