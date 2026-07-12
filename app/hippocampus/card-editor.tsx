"use client";

// Add/edit a single card. Used by DeckManager in two flavors:
//   - "card"    : full manual entry
//   - "capture" : paste text you couldn't read; auto-fill readings (JA) and gloss later
// For Japanese decks an "Auto-fill readings" button runs the offline kuromoji analyzer.

import React, { useEffect, useMemo, useState } from "react";
import type { Card, Deck, Token } from "./core";
import { cleanCard, type CardDraft } from "./lib/cards";
import { analyzeJapanese, warmupFurigana } from "./lib/furigana";
import { ACCENT, Btn } from "./ui";

const CARD_TYPES = ["vocab", "sentence", "kanji", "kana", "letter", "grammar"];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--ring)",
  background: "var(--bg)",
  color: "var(--fg)",
  fontSize: 14,
  fontFamily: "inherit"
};

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: "block", fontSize: 12, fontWeight: 600, opacity: 0.8, margin: "0 0 4px" }}>{children}</label>;
}

export function CardEditor({
  deck,
  initial,
  mode,
  onSave,
  onCancel,
  onDelete
}: {
  deck: Deck;
  initial?: Card;
  mode: "card" | "capture";
  onSave: (card: Card, isNew: boolean) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const isNew = !initial;
  const isJa = deck.lang === "ja";
  const [type, setType] = useState(initial?.type ?? (mode === "capture" ? "sentence" : "vocab"));
  const [front, setFront] = useState(initial?.front ?? "");
  const [reading, setReading] = useState(initial?.reading ?? "");
  const [romaji, setRomaji] = useState(initial?.romaji ?? "");
  const [meaning, setMeaning] = useState(initial?.meaning ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [source, setSource] = useState(initial?.source ?? "");
  const [breakdown, setBreakdown] = useState<Token[]>(initial?.breakdown ?? []);
  const [status, setStatus] = useState<"ready" | "needs_gloss">(initial?.status ?? "ready");
  const [statusTouched, setStatusTouched] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Warm the dictionary as soon as a JA editor opens, so the first auto-fill is fast.
  useEffect(() => {
    if (isJa) warmupFurigana();
  }, [isJa]);

  // In capture mode, default the status to needs_gloss until a meaning is filled (unless overridden).
  const effectiveStatus = statusTouched ? status : meaning.trim() ? "ready" : mode === "capture" ? "needs_gloss" : "ready";

  const autofill = async () => {
    if (!front.trim()) return;
    setAnalyzing(true);
    setLocalError(null);
    try {
      const r = await analyzeJapanese(front);
      setReading(r.reading);
      setRomaji(r.romaji);
      // Merge glosses if the author already typed some for matching tokens.
      setBreakdown(
        r.breakdown.map((t) => {
          const prev = breakdown.find((p) => p.token === t.token);
          return prev?.gloss ? { ...t, gloss: prev.gloss } : t;
        })
      );
    } catch (err) {
      setLocalError(`Couldn't load the Japanese dictionary: ${(err as Error).message}. You can type readings manually.`);
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async () => {
    if (!front.trim()) {
      setLocalError("Front (the prompt) can't be empty.");
      return;
    }
    const draft: CardDraft = { id: initial?.id, type, front, reading, romaji, meaning, breakdown, unit, tags, source, status: effectiveStatus };
    const card = cleanCard(draft, initial?.id ?? "");
    setSaving(true);
    setLocalError(null);
    try {
      await onSave(card, isNew);
    } catch (err) {
      setLocalError(`Save failed: ${(err as Error).message}`);
      setSaving(false);
    }
  };

  const setToken = (i: number, patch: Partial<Token>) =>
    setBreakdown((b) => b.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const removeToken = (i: number) => setBreakdown((b) => b.filter((_, j) => j !== i));
  const addToken = () => setBreakdown((b) => [...b, { token: "", gloss: "" }]);

  const title = isNew ? (mode === "capture" ? "Capture a card" : "Add a card") : "Edit card";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", zIndex: 100, padding: "24px 12px" }}>
      <div style={{ background: "var(--bg)", border: "1px solid var(--ring)", borderRadius: 14, width: "100%", maxWidth: 560, padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <span style={{ fontSize: 12, opacity: 0.6 }}>{deck.deck}{initial ? ` · ${initial.id}` : ""}</span>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}>
            <div>
              <Label>Type</Label>
              <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
                {CARD_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
                {!CARD_TYPES.includes(type) && <option value={type}>{type}</option>}
              </select>
            </div>
            <div>
              <Label>Unit (optional)</Label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Ch.1 / L1" style={inputStyle} />
            </div>
          </div>

          <div>
            <Label>Front — the prompt shown first{mode === "capture" ? " (paste what you couldn't read)" : ""}</Label>
            <textarea value={front} onChange={(e) => setFront(e.target.value)} rows={mode === "capture" || type === "sentence" ? 2 : 1} style={{ ...inputStyle, resize: "vertical", fontSize: 18 }} />
            {isJa && (
              <div style={{ marginTop: 8 }}>
                <Btn onClick={autofill} disabled={analyzing || !front.trim()} style={{ fontSize: 13, padding: "6px 12px" }}>
                  {analyzing ? "Reading…" : "✨ Auto-fill readings (offline)"}
                </Btn>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>Reading (kana)</Label>
              <input value={reading} onChange={(e) => setReading(e.target.value)} placeholder="がくせい" style={inputStyle} />
            </div>
            <div>
              <Label>Romaji</Label>
              <input value={romaji} onChange={(e) => setRomaji(e.target.value)} placeholder="gakusei" style={inputStyle} />
            </div>
          </div>

          <div>
            <Label>Meaning</Label>
            <input value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="student" style={inputStyle} />
          </div>

          {/* breakdown editor */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <Label>Breakdown (per-token gloss — for sentences)</Label>
              <button onClick={addToken} style={{ background: "none", border: "none", color: ACCENT, cursor: "pointer", fontSize: 12 }}>+ token</button>
            </div>
            {breakdown.length === 0 && <div style={{ fontSize: 12, opacity: 0.5 }}>None. Auto-fill (JA) or add tokens to gloss a sentence.</div>}
            <div style={{ display: "grid", gap: 6 }}>
              {breakdown.map((t, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.4fr auto", gap: 6, alignItems: "center" }}>
                  <input value={t.token} onChange={(e) => setToken(i, { token: e.target.value })} placeholder="token" style={{ ...inputStyle, padding: "6px 8px" }} />
                  <input value={t.reading ?? ""} onChange={(e) => setToken(i, { reading: e.target.value })} placeholder="reading" style={{ ...inputStyle, padding: "6px 8px" }} />
                  <input value={t.gloss} onChange={(e) => setToken(i, { gloss: e.target.value })} placeholder="gloss" style={{ ...inputStyle, padding: "6px 8px" }} />
                  <button onClick={() => removeToken(i)} aria-label="remove token" style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16 }}>×</button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label>Tags (comma-separated)</Label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="genki, ch1, noun" style={inputStyle} />
            </div>
            <div>
              <Label>Source</Label>
              <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Genki I Ch.1" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Label>Status</Label>
            <select
              value={effectiveStatus}
              onChange={(e) => {
                setStatusTouched(true);
                setStatus(e.target.value as "ready" | "needs_gloss");
              }}
              style={{ ...inputStyle, width: "auto", padding: "6px 8px" }}
            >
              <option value="ready">ready (studied)</option>
              <option value="needs_gloss">needs_gloss (pending)</option>
            </select>
            <span style={{ fontSize: 12, opacity: 0.55 }}>
              {effectiveStatus === "needs_gloss" ? "won't enter the study queue until glossed" : "enters the queue once it has a meaning"}
            </span>
          </div>
        </div>

        {localError && <div style={{ marginTop: 14, color: "#ef4444", fontSize: 13 }}>{localError}</div>}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, gap: 10, flexWrap: "wrap" }}>
          <div>
            {!isNew && onDelete && (
              confirmDelete ? (
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 13 }}>Delete this card?</span>
                  <button onClick={onDelete} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontSize: 13 }}>Delete</button>
                  <Btn onClick={() => setConfirmDelete(false)} style={{ padding: "6px 12px" }}>Keep</Btn>
                </span>
              ) : (
                <Btn onClick={() => setConfirmDelete(true)} style={{ padding: "6px 12px", color: "#ef4444", borderColor: "#ef4444" }}>Delete</Btn>
              )
            )}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={onCancel} disabled={saving}>Cancel</Btn>
            <Btn variant="primary" onClick={save} disabled={saving || analyzing}>
              {saving ? "Saving…" : isNew ? "Add card" : "Save"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
