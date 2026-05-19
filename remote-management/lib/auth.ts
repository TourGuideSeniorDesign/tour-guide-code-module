export const SESSION_COOKIE = "rm_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  return (
    process.env.SESSION_SECRET ??
    process.env.ADMIN_PASSWORD ??
    "change-me-in-production"
  );
}

function b64urlFromBytes(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlFromString(str: string): string {
  return b64urlFromBytes(new TextEncoder().encode(str));
}

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(payload: string): Promise<string> {
  const key = await hmacKey();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return b64urlFromBytes(new Uint8Array(sig));
}

export async function createSession(username: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const payload = b64urlFromString(JSON.stringify({ u: username, exp }));
  const sig = await sign(payload);
  return `${payload}.${sig}`;
}

export async function verifySession(
  token: string | undefined | null,
): Promise<{ username: string } | null> {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = await sign(payload);
  if (!timingSafeEqualStr(sig, expected)) return null;
  try {
    const data = JSON.parse(
      new TextDecoder().decode(b64urlToBytes(payload)),
    ) as { u: string; exp: number };
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return { username: data.u };
  } catch {
    return null;
  }
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME ?? "admin";
  const expectedPass = process.env.ADMIN_PASSWORD ?? "changeme";
  return (
    timingSafeEqualStr(username, expectedUser) &&
    timingSafeEqualStr(password, expectedPass)
  );
}
