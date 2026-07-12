// Hippocampus core — deck library operations: flatten, queue, practice, quiz, summarize.
// Pure and dependency-free. The host fetches + parses deck files (YAML/JSON) and passes Deck[] in.

import type { Card, Deck, DeckSummary, QueueCard, Reviews } from "./types";

export const DEFAULT_NEW_PER_DAY = 15;

/** A card is reviewable once it has a meaning and isn't awaiting a gloss. */
export function reviewable(card: Card): boolean {
  return card.status !== "needs_gloss" && Boolean(card.meaning);
}

/** Merge decks into a single card list, injecting `deck` and `lang` onto each card. */
export function flattenDecks(decks: Deck[]): Card[] {
  return decks.flatMap((deck) =>
    (deck.cards ?? []).map((card) => ({ ...card, deck: deck.deck, lang: deck.lang, status: card.status ?? "ready" }))
  );
}

/** Fisher-Yates shuffle (returns a new array). Pass a custom rng for deterministic tests. */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface QueueOptions {
  today: string;
  lang?: string;
  deck?: string;
  newLimit?: number;
  rng?: () => number;
}

/** Daily review queue: due cards (shuffled) followed by up to `newLimit` new cards (shuffled). */
export function buildQueue(cards: Card[], reviews: Reviews, opts: QueueOptions): { counts: { due: number; new: number }; cards: QueueCard[] } {
  const { today, lang, deck, newLimit = DEFAULT_NEW_PER_DAY, rng } = opts;
  const pool = cards.filter((c) => reviewable(c) && (!lang || c.lang === lang) && (!deck || c.deck === deck));

  const due: QueueCard[] = [];
  const fresh: QueueCard[] = [];
  for (const card of pool) {
    const state = reviews[card.id];
    if (!state) fresh.push({ ...card, state: null, isNew: true });
    else if (state.due <= today) due.push({ ...card, state, isNew: false });
  }
  const shuffledDue = shuffle(due, rng);
  const limited = shuffle(fresh, rng).slice(0, newLimit >= 0 ? newLimit : fresh.length);
  return { counts: { due: shuffledDue.length, new: limited.length }, cards: [...shuffledDue, ...limited] };
}

/** Practice a whole deck now, ignoring the schedule (a cram/refresh pass). */
export function practiceDeck(cards: Card[], reviews: Reviews, deck: string, rng?: () => number): QueueCard[] {
  const pool = cards.filter((c) => c.deck === deck && reviewable(c));
  return shuffle(pool, rng).map((c) => ({ ...c, state: reviews[c.id] ?? null, isNew: !reviews[c.id] }));
}

export interface QuizQuestion {
  cardId: string;
  prompt: string;
  reading?: string;
  answer: string;
  choices: string[];
}

/** Build a "pick the meaning" multiple-choice question with 3 distractors from the same language. */
export function makeQuiz(cards: Card[], lang?: string, rng: () => number = Math.random): QuizQuestion | null {
  const pool = cards.filter((c) => reviewable(c) && (!lang || c.lang === lang));
  if (pool.length < 2) return null;
  const card = pool[Math.floor(rng() * pool.length)];
  const distractors = shuffle(pool.filter((c) => c.id !== card.id && c.meaning !== card.meaning), rng)
    .slice(0, 3)
    .map((c) => c.meaning as string);
  return {
    cardId: card.id,
    prompt: card.front,
    reading: card.reading,
    answer: card.meaning as string,
    choices: shuffle([card.meaning as string, ...distractors], rng)
  };
}

/** Per-deck counts of due / new / pending / total, given the review state and today. */
export function summarize(decks: Deck[], reviews: Reviews, today: string): DeckSummary[] {
  const cards = flattenDecks(decks);
  const byDeck = new Map<string, DeckSummary>();
  for (const card of cards) {
    const key = card.deck ?? "unknown";
    const entry = byDeck.get(key) ?? { deck: key, lang: card.lang ?? "", total: 0, due: 0, fresh: 0, pending: 0 };
    entry.total += 1;
    if (!reviewable(card)) {
      entry.pending += 1;
    } else {
      const state = reviews[card.id];
      if (!state) entry.fresh += 1;
      else if (state.due <= today) entry.due += 1;
    }
    byDeck.set(key, entry);
  }
  return [...byDeck.values()];
}
