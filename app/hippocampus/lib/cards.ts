// Pure, framework-agnostic helpers for authoring cards inside a deck. No I/O, no React.
// The host mutates a Deck with these, re-serializes via repo.ts:serializeDeck, and commits.

import type { Card, Deck, Token } from "../core";

/** Every card id currently used anywhere in the repo (ids must be globally unique). */
export function collectIds(decks: Deck[]): Set<string> {
  const ids = new Set<string>();
  for (const deck of decks) for (const card of deck.cards ?? []) if (card.id) ids.add(card.id);
  return ids;
}

/** Generate a globally-unique, readable id for a new card in a deck (e.g. "ja-genki-1-0007"). */
export function newCardId(deckId: string, existing: Set<string>): string {
  const base = deckId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "card";
  let n = 1;
  let id = `${base}-${String(n).padStart(4, "0")}`;
  while (existing.has(id)) {
    n += 1;
    id = `${base}-${String(n).padStart(4, "0")}`;
  }
  return id;
}

/** The editable shape used by the card form (all optional except front). */
export interface CardDraft {
  id?: string;
  type?: string;
  front: string;
  reading?: string;
  romaji?: string;
  meaning?: string;
  breakdown?: Token[];
  unit?: string;
  tags?: string[] | string;
  source?: string;
  status?: "ready" | "needs_gloss";
}

function trimOrUndef(v?: string): string | undefined {
  const t = (v ?? "").trim();
  return t ? t : undefined;
}

/** Normalize a draft into a clean Card: trims fields, drops empties, derives status from meaning. */
export function cleanCard(draft: CardDraft, id: string): Card {
  const tags = Array.isArray(draft.tags)
    ? draft.tags.map((t) => t.trim()).filter(Boolean)
    : trimOrUndef(draft.tags as string)?.split(",").map((t) => t.trim()).filter(Boolean);

  const breakdown = (draft.breakdown ?? [])
    .filter((t) => (t.token ?? "").trim())
    .map((t) => ({
      token: t.token.trim(),
      ...(trimOrUndef(t.reading) ? { reading: t.reading!.trim() } : {}),
      gloss: (t.gloss ?? "").trim()
    }));

  const meaning = trimOrUndef(draft.meaning);
  // Explicit status wins; otherwise a card with no meaning is a pending capture.
  const status = draft.status ?? (meaning ? "ready" : "needs_gloss");

  const card: Card = {
    id,
    type: trimOrUndef(draft.type) ?? "vocab",
    front: (draft.front ?? "").trim(),
    ...(trimOrUndef(draft.reading) ? { reading: draft.reading!.trim() } : {}),
    ...(trimOrUndef(draft.romaji) ? { romaji: draft.romaji!.trim() } : {}),
    ...(meaning ? { meaning } : {}),
    ...(breakdown.length ? { breakdown } : {}),
    ...(trimOrUndef(draft.unit) ? { unit: draft.unit!.trim() } : {}),
    ...(tags && tags.length ? { tags } : {}),
    ...(trimOrUndef(draft.source) ? { source: draft.source!.trim() } : {}),
    status
  };
  return card;
}

/** Append a card to a deck (returns a new Deck). */
export function addCard(deck: Deck, card: Card): Deck {
  return { ...deck, cards: [...(deck.cards ?? []), card] };
}

/** Replace the card with the same id (returns a new Deck). */
export function updateCard(deck: Deck, card: Card): Deck {
  return { ...deck, cards: (deck.cards ?? []).map((c) => (c.id === card.id ? card : c)) };
}

/** Remove a card by id (returns a new Deck). */
export function deleteCard(deck: Deck, id: string): Deck {
  return { ...deck, cards: (deck.cards ?? []).filter((c) => c.id !== id) };
}
