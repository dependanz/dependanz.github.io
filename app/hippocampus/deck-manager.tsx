"use client";

// Manage a single deck's cards: browse/search, add (plain or capture), edit, delete.
// All mutations are committed by the parent (which re-serializes the deck and commits the file).

import React, { useMemo, useState } from "react";
import type { Card } from "./core";
import type { DeckFileRef } from "./lib/repo";
import { CardEditor } from "./card-editor";
import { Btn } from "./ui";

type EditorState = { card?: Card; mode: "card" | "capture" } | null;

export function DeckManager({
  deckRef,
  saving,
  onSaveCard,
  onDeleteCard,
  onBack
}: {
  deckRef: DeckFileRef;
  saving: boolean;
  onSaveCard: (card: Card, isNew: boolean) => Promise<void>;
  onDeleteCard: (id: string) => Promise<void>;
  onBack: () => void;
}) {
  const [editor, setEditor] = useState<EditorState>(null);
  const [q, setQ] = useState("");
  const cards = deckRef.deck.cards ?? [];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return cards;
    return cards.filter((c) =>
      [c.front, c.reading, c.romaji, c.meaning, c.id].some((v) => (v ?? "").toLowerCase().includes(needle))
    );
  }, [cards, q]);

  const handleSave = async (card: Card, isNew: boolean) => {
    await onSaveCard(card, isNew); // throws on failure -> CardEditor shows the error and stays open
    setEditor(null);
  };
  const handleDelete = async (id: string) => {
    await onDeleteCard(id);
    setEditor(null);
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--fg)", cursor: "pointer", padding: 0, fontSize: 13, opacity: 0.7 }}>← dashboard</button>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
            {deckRef.deck.deck} <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.6 }}>· {cards.length} cards</span>
            {saving && <span style={{ fontSize: 12, opacity: 0.6, marginLeft: 8 }}>saving…</span>}
          </h2>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => setEditor({ mode: "card" })} variant="primary">+ Add card</Btn>
          <Btn onClick={() => setEditor({ mode: "capture" })}>Capture</Btn>
        </div>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search this deck…"
        style={{ width: "100%", padding: "9px 12px", borderRadius: 10, border: "1px solid var(--ring)", background: "var(--bg)", color: "var(--fg)", fontSize: 14, marginBottom: 12 }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: "60vh", overflowY: "auto" }}>
        {filtered.map((c) => {
          const pending = c.status === "needs_gloss" || !c.meaning;
          return (
            <button
              key={c.id}
              onClick={() => setEditor({ card: c, mode: "card" })}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--ring)", background: "transparent", color: "var(--fg)", cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.front} {c.reading && <span style={{ fontSize: 12, opacity: 0.6 }}>· {c.reading}</span>}
                </span>
                <span style={{ fontSize: 12, opacity: 0.65, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.meaning || <em>no meaning</em>}</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {pending && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 999, border: "1px solid #f59e0b", color: "#f59e0b" }}>pending</span>}
                <span style={{ fontSize: 11, opacity: 0.4 }}>edit</span>
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0", opacity: 0.6, fontSize: 14 }}>
            {cards.length === 0 ? "No cards yet — add your first one." : `No cards match “${q}”.`}
          </div>
        )}
      </div>

      {editor && (
        <CardEditor
          deck={deckRef.deck}
          initial={editor.card}
          mode={editor.mode}
          onSave={handleSave}
          onCancel={() => setEditor(null)}
          onDelete={editor.card ? () => handleDelete(editor.card!.id) : undefined}
        />
      )}
    </div>
  );
}
