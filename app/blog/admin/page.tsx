"use client";

// /blog/admin — super-key-gated, read-only draft viewer for the static (GitHub Pages) site.
//
// Enter the super key -> it decrypts the drafts committed under /drafts/*.enc.json entirely in your
// browser and renders their Markdown. There is intentionally no writing here: a static host can't
// securely hold a write credential, so authoring stays on the CLI (npm run encrypt-drafts) until
// this site moves to real hosting. The super key never leaves the browser; a wrong key fails cleanly.

import Header from "@/app/ui/header";
import { useEffect, useState } from "react";
import { checkVerifier, decryptJSON } from "../_drafts/crypto";
import FootnoteHover from "../_drafts/footnote-hover";
import { renderMarkdown } from "../_drafts/render";
import { fetchEnc, fetchManifest, fetchVerifier } from "../_drafts/store";
import type { DraftPayload, EncFile } from "../_drafts/types";

export default function BlogAdminPage() {
  const [key, setKey] = useState("");
  const [verifier, setVerifier] = useState<EncFile | null>(null);
  const [verifierLoaded, setVerifierLoaded] = useState(false);
  const [drafts, setDrafts] = useState<DraftPayload[]>([]);
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<{ payload: DraftPayload; html: string } | null>(null);

  useEffect(() => {
    fetchVerifier().then((v) => {
      setVerifier(v);
      setVerifierLoaded(true);
    });
  }, []);

  async function unlock() {
    if (!key.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (!verifier) {
        setError("No drafts have been published yet (run `npm run encrypt-drafts`).");
        return;
      }
      if (!(await checkVerifier(key, verifier))) {
        setError("Wrong super key.");
        return;
      }
      // We hold the key now, so decrypt each draft to show real titles + dates (like /blog).
      const manifest = (await fetchManifest()) ?? [];
      const loaded = await Promise.all(
        manifest.map(async (m) => {
          const enc = await fetchEnc(m.id);
          return enc ? await decryptJSON<DraftPayload>(key, enc) : null;
        })
      );
      const ok = loaded.filter((d): d is DraftPayload => d !== null);
      ok.sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first, like the public index
      setDrafts(ok);
      setUnlocked(true);
    } finally {
      setBusy(false);
    }
  }

  async function openDraft(draft: DraftPayload) {
    setBusy(true);
    setError(null);
    try {
      const html = await renderMarkdown(draft.md);
      setOpen({ payload: draft, html });
    } catch {
      setError("Could not render that draft.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header pageName="blog" />
      <div className="mx-auto max-w-2xl px-4 py-8">
        {!unlocked && (
          <>
            <h1 className="text-2xl font-bold mb-2">blog admin</h1>
            <p className="text-sm opacity-70 mb-6">
              Private, read-only preview of unpublished posts. Enter the super key to decrypt them in your browser.
            </p>
            <div className="flex flex-col gap-3 max-w-sm">
              <input
                type="password"
                value={key}
                placeholder="super key"
                autoComplete="off"
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && unlock()}
                className="rounded-md border px-3 py-2 bg-transparent"
                style={{ borderColor: "var(--ring)", color: "var(--fg)" }}
              />
              <button
                onClick={unlock}
                disabled={busy || !key.trim() || !verifierLoaded}
                className="rounded-md border px-3 py-2 disabled:opacity-50"
                style={{ borderColor: "var(--ring)" }}
              >
                {busy ? "Decrypting…" : "Unlock"}
              </button>
              {error && <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>}
            </div>
          </>
        )}

        {unlocked && !open && (
          <>
            <div className="flex items-baseline justify-between mb-4">
              <h1 className="text-2xl font-bold">drafts</h1>
              <span className="text-xs opacity-60">{drafts.length} draft(s)</span>
            </div>
            {error && <p className="text-sm mb-3" style={{ color: "#ef4444" }}>{error}</p>}
            <ul className="space-y-3">
              {drafts.map((d) => (
                <li
                  key={d.slug}
                  className="border rounded-md transition-shadow duration-300 hover:shadow-[0_12px_30px_var(--shadow-active)]"
                  style={{ borderColor: "var(--ring)" }}
                >
                  <button onClick={() => openDraft(d)} disabled={busy} className="block w-full text-left p-3">
                    <h3>{d.title}</h3>
                    <p className="text-sm text-gray-500">{d.date}</p>
                  </button>
                </li>
              ))}
              {drafts.length === 0 && <p className="text-sm opacity-60">No drafts.</p>}
            </ul>
          </>
        )}

        {open && (
          <>
            <button onClick={() => setOpen(null)} className="text-sm opacity-70 hover:underline mb-4">
              ← back to drafts
            </button>
            <div className="text-xs uppercase tracking-wide opacity-50 mb-2">unpublished draft — {open.payload.date}</div>
            <article className="blog-prose" dangerouslySetInnerHTML={{ __html: open.html }} />
            <FootnoteHover key={open.payload.slug} />
          </>
        )}
      </div>
    </>
  );
}
