// Read-only access to encrypted drafts. The deployed site serves public/drafts/*.enc.json as static
// assets, so viewing a draft is just a token-free fetch + client-side decrypt. Authoring is done
// offline via the CLI (scripts/encrypt-drafts.mjs); there is no browser write path (a static host
// can't securely hold a write credential — that waits for a move off GitHub Pages).

import type { EncFile, ManifestEntry } from "./types";

const URL_PREFIX = "/drafts"; // deployed location of the committed ciphertext

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

export function fetchManifest(): Promise<ManifestEntry[] | null> {
  return fetchJson<ManifestEntry[]>(`${URL_PREFIX}/manifest.json`);
}
export function fetchEnc(slug: string): Promise<EncFile | null> {
  return fetchJson<EncFile>(`${URL_PREFIX}/${slug}.enc.json`);
}
export function fetchVerifier(): Promise<EncFile | null> {
  return fetchJson<EncFile>(`${URL_PREFIX}/verifier.enc.json`);
}
