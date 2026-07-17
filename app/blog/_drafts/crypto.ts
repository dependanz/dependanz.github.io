// Browser-side crypto for viewing encrypted drafts (read-only). Symmetric AES-256-GCM with a key
// stretched from the "super key" passphrase via PBKDF2-SHA256. Encryption happens only in the CLI
// (scripts/encrypt-drafts.mjs); the browser just decrypts and verifies. Mirrors the CLI exactly.

import type { EncFile } from "./types";

const ITERATIONS = 600_000;
// Constant sealed under the super key so we can verify a passphrase even with zero drafts loaded.
const VERIFIER_PLAINTEXT = "hippocampus-blog-admin/v1";

// Back typed arrays with an explicit ArrayBuffer so they satisfy WebCrypto's BufferSource type
// (a bare Uint8Array is ArrayBufferLike and won't type-check under current TS lib types).
function alloc(n: number): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new ArrayBuffer(n));
}
function utf8(s: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(new TextEncoder().encode(s));
}

export function b64ToBytes(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const u = alloc(bin.length);
  for (let i = 0; i < bin.length; i += 1) u[i] = bin.charCodeAt(i);
  return u;
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", utf8(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

export async function decryptJSON<T>(passphrase: string, enc: EncFile): Promise<T> {
  const key = await deriveKey(passphrase, b64ToBytes(enc.salt), enc.iterations ?? ITERATIONS);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(enc.iv) }, key, b64ToBytes(enc.ct));
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}

/** True iff `passphrase` decrypts the verifier to the expected constant (wrong key -> false). */
export async function checkVerifier(passphrase: string, enc: EncFile): Promise<boolean> {
  try {
    const out = await decryptJSON<{ check: string }>(passphrase, enc);
    return out.check === VERIFIER_PLAINTEXT;
  } catch {
    return false;
  }
}
