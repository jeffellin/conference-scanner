const SESSION_VALUE = "admin-session-v1";

async function hmac(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function createSessionToken(secret: string): Promise<string> {
  return hmac(secret, SESSION_VALUE);
}

export async function verifySessionToken(secret: string, token: string): Promise<boolean> {
  const expected = await hmac(secret, SESSION_VALUE);
  return expected === token;
}
