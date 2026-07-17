// Seal master-key-protected content for the static site.
//
// Today that's blog drafts (drafts-src/*.md -> public/drafts/*.enc.json), but this is written to be
// the one command for anything you protect with your master key. Only ciphertext is written to
// public/ (committed + deployed); the plaintext in drafts-src/ is gitignored and never leaves your
// machine. The browser decrypts client-side with the master key.
//
// The master key is read from (in order): $MASTER_KEY, the gitignored `.master-key` file, or an
// interactive prompt. Put it in `.master-key` once and you never type it again (and it stays out of
// your shell history).
//
//   npm run encrypt
//
// Idempotent: a file is only re-sealed if its plaintext changed, or if the key changed (rotation).
// Re-running when nothing changed writes nothing — no git noise. AES-256-GCM, key stretched with
// PBKDF2-SHA256 (600k iters); a fresh random salt + IV per sealed file.

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import matter from "gray-matter";

const SRC_DIR = path.join(process.cwd(), "drafts-src");
const OUT_DIR = path.join(process.cwd(), "public", "drafts");
const KEY_FILE = path.join(process.cwd(), ".master-key");
const ITERATIONS = 600_000;
const VERIFIER_PLAINTEXT = "hippocampus-blog-admin/v1"; // must match app/blog/_drafts/crypto.ts
const webcrypto = globalThis.crypto;
const subtle = webcrypto.subtle;

const toB64 = (u8) => Buffer.from(u8).toString("base64");
const fromB64 = (s) => new Uint8Array(Buffer.from(s, "base64"));

async function deriveKey(passphrase, salt, usage) {
  const baseKey = await subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    [usage]
  );
}

async function seal(passphrase, obj) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, "encrypt");
  const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(obj))));
  return { v: 1, alg: "AES-GCM", kdf: "PBKDF2-SHA256", iterations: ITERATIONS, salt: toB64(salt), iv: toB64(iv), ct: toB64(ct) };
}

/** Decrypt an EncFile with `passphrase`; returns the payload, or null if the key is wrong/garbled. */
async function open(passphrase, enc) {
  try {
    const key = await deriveKey(passphrase, fromB64(enc.salt), "decrypt");
    const pt = await subtle.decrypt({ name: "AES-GCM", iv: fromB64(enc.iv) }, key, fromB64(enc.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  } catch {
    return null;
  }
}

function readExisting(name) {
  const p = path.join(OUT_DIR, name);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

async function getMasterKey() {
  if (process.env.MASTER_KEY) return process.env.MASTER_KEY;
  if (process.env.DRAFT_PASSPHRASE) return process.env.DRAFT_PASSPHRASE; // back-compat
  if (existsSync(KEY_FILE)) return readFileSync(KEY_FILE, "utf8").trim();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((res) => rl.question("Master key: ", res));
  rl.close();
  return answer;
}

async function main() {
  if (!existsSync(SRC_DIR)) {
    console.log("No drafts-src/ folder yet. Create it and add <slug>.md drafts, then re-run.");
    return;
  }
  const files = (await readdir(SRC_DIR)).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));
  if (files.length === 0) {
    console.log("drafts-src/ has no .md/.mdx drafts — nothing to seal.");
    return;
  }

  const masterKey = (await getMasterKey()).trim();
  if (masterKey.length < 12) {
    console.error("Refusing: master key is under 12 characters. Use a long, strong one in .master-key.");
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  // The verifier doubles as a "same key?" probe: if the current key opens it, the key is unchanged
  // and we can skip anything whose content also matches. If not, the key is new/rotated -> re-seal all.
  const existingVerifier = readExisting("verifier.enc.json");
  const keyUnchanged = existingVerifier ? (await open(masterKey, existingVerifier))?.check === VERIFIER_PLAINTEXT : false;

  let wrote = 0;
  let skipped = 0;

  if (!keyUnchanged) {
    await writeFile(path.join(OUT_DIR, "verifier.enc.json"), JSON.stringify(await seal(masterKey, { check: VERIFIER_PLAINTEXT })));
    wrote += 1;
    console.log(`  sealed    verifier ${existingVerifier ? "(key rotated — re-sealing all)" : "(key set)"}`);
  }

  const manifest = [];
  for (const file of files) {
    const slug = file.replace(/\.mdx?$/, "");
    const raw = await readFile(path.join(SRC_DIR, file), "utf8");
    const { data, content } = matter(raw);
    const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? "");
    const payload = { slug, title: data.title ?? slug, date, md: content.trim() };

    // Skip if the committed ciphertext already decrypts (same key) to exactly this payload.
    const existing = keyUnchanged ? readExisting(`${slug}.enc.json`) : null;
    const current = keyUnchanged && existing ? await open(masterKey, existing) : null;
    if (current && JSON.stringify(current) === JSON.stringify(payload)) {
      skipped += 1;
    } else {
      await writeFile(path.join(OUT_DIR, `${slug}.enc.json`), JSON.stringify(await seal(masterKey, payload)));
      wrote += 1;
      console.log(`  sealed    ${slug}`);
    }
    manifest.push({ id: slug });
  }

  // Manifest only lists slugs (not secret) — rewrite only if the set changed.
  const existingManifest = readExisting("manifest.json");
  if (JSON.stringify(existingManifest) !== JSON.stringify(manifest)) {
    await writeFile(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
    wrote += 1;
    console.log("  updated   manifest");
  }

  console.log(
    wrote === 0
      ? `\nUp to date — nothing re-sealed (${skipped} draft${skipped === 1 ? "" : "s"} unchanged).`
      : `\nSealed ${wrote} file(s), ${skipped} unchanged. Protected by your master key; preview at /blog/admin.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
