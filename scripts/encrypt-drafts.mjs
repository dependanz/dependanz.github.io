// Encrypt local plaintext drafts (drafts-src/*.md) into public/drafts/*.enc.json.
//
// Only ciphertext is ever written to public/ (which is committed + deployed). The plaintext in
// drafts-src/ is gitignored and never leaves your machine. This is the CLI path; the /blog/admin
// page produces identical files from the browser. Both encrypt the Markdown *source* (not rendered
// HTML) — rendering happens client-side at view time — so drafts stay editable.
//
// Usage:
//   DRAFT_PASSPHRASE='your super key' npm run encrypt-drafts
//   npm run encrypt-drafts            # prompts for the passphrase interactively
//
// Crypto: AES-256-GCM, key stretched from the passphrase with PBKDF2-SHA256 (600k iterations).
// A random 16-byte salt and 12-byte IV are generated per file. Security rests on the passphrase.

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import matter from "gray-matter";

const SRC_DIR = path.join(process.cwd(), "drafts-src");
const OUT_DIR = path.join(process.cwd(), "public", "drafts");
const ITERATIONS = 600_000;
const VERIFIER_PLAINTEXT = "hippocampus-blog-admin/v1"; // must match app/blog/_drafts/crypto.ts
const webcrypto = globalThis.crypto;
const subtle = webcrypto.subtle;

const b64 = (u8) => Buffer.from(u8).toString("base64");

async function deriveKey(passphrase, salt) {
  const baseKey = await subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
}

async function encryptPayload(passphrase, payloadObj) {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const data = new TextEncoder().encode(JSON.stringify(payloadObj));
  const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  return {
    v: 1,
    alg: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: ITERATIONS,
    salt: b64(salt),
    iv: b64(iv),
    ct: b64(ct)
  };
}

async function getPassphrase() {
  if (process.env.DRAFT_PASSPHRASE) return process.env.DRAFT_PASSPHRASE;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((res) => rl.question("Draft passphrase: ", res));
  rl.close();
  return answer;
}

async function main() {
  if (!existsSync(SRC_DIR)) {
    console.log(`No drafts-src/ folder yet. Create it and add <slug>.md drafts, then re-run.`);
    return;
  }
  const files = (await readdir(SRC_DIR)).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));
  if (files.length === 0) {
    console.log("drafts-src/ has no .md/.mdx drafts — nothing to encrypt.");
    return;
  }

  const passphrase = (await getPassphrase()).trim();
  if (passphrase.length < 12) {
    console.error("Refusing: passphrase is under 12 characters. Use a long, strong super key.");
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  const manifest = [];
  for (const file of files) {
    const slug = file.replace(/\.mdx?$/, "");
    const raw = await readFile(path.join(SRC_DIR, file), "utf8");
    const { data, content } = matter(raw);
    // Store the Markdown SOURCE so the admin can re-open and edit it. Normalize a Date frontmatter
    // value back to YYYY-MM-DD (gray-matter parses bare dates into Date objects).
    const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date ?? "");
    const payload = { slug, title: data.title ?? slug, date, md: content.trim() };
    const enc = await encryptPayload(passphrase, payload);
    await writeFile(path.join(OUT_DIR, `${slug}.enc.json`), JSON.stringify(enc));
    manifest.push({ id: slug });
    console.log(`  encrypted  ${slug}`);
  }

  // Verifier: lets /blog/admin validate the super key even with zero drafts loaded.
  const verifier = await encryptPayload(passphrase, { check: VERIFIER_PLAINTEXT });
  await writeFile(path.join(OUT_DIR, "verifier.enc.json"), JSON.stringify(verifier));
  await writeFile(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`\nWrote ${manifest.length} draft(s) + manifest + verifier to public/drafts/. Admin: /blog/admin`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
