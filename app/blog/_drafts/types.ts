// Shared types for the encrypted-drafts system (public preview + admin authoring).
// A draft's plaintext Markdown is encrypted client-side and only the ciphertext is ever committed
// to the public repo (public/drafts/<slug>.enc.json). Rendering happens in the browser at view
// time (see ./render), which is what makes in-browser editing possible.

export interface EncFile {
  v: number;
  alg: "AES-GCM";
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string; // base64
  iv: string; // base64
  ct: string; // base64
}

/** The plaintext payload that gets encrypted into an EncFile. We store Markdown source (not HTML)
 *  so drafts can be re-opened and edited. */
export interface DraftPayload {
  slug: string;
  title: string;
  date: string;
  md: string;
}

export interface ManifestEntry {
  id: string; // slug; the file is public/drafts/<id>.enc.json
}
