// Server-side secure token + hash utilities for DismissFlow EPS.
//
// IMPORTANT: this module is shared by the Supabase Edge Function (Deno) AND by
// the Node 22 test suite. It therefore uses ONLY the Web Crypto API
// (globalThis.crypto) and never references Node-specific or Deno-specific
// modules, so the exact same token-generation / hashing code is executed in
// production and verified by tests.
//
// Security properties (Docs/architecture.md §8.2, §8.3):
//   - Token is generated with a CSPRNG (crypto.getRandomValues).
//   - 32 random bytes => 256 bits of entropy (>= 128 bits required by PRD §14).
//   - The QR payload is exclusively this token string; no PII is mixed in.
//   - The database stores only sha256Hex(token); the plaintext is returned once.

const TOKEN_BYTES = 32;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa is a global in both Deno and Node 16+/browser.
  const b64 = btoa(binary);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Generates an unpredictable, URL-safe random token.
export function generateSecureToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes); // CSPRNG in Deno and Node 22.
  return bytesToBase64Url(bytes);
}

function hexFromBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

// SHA-256 of the plaintext token. Returns a 64-char lowercase hex digest.
// This is the value persisted to qr_tokens.token_hash.
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return hexFromBuffer(digest);
}
