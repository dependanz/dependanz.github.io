// Hippocampus core — shared types for the flashcard/SRS engine.
// Framework-agnostic and dependency-free: safe to import in a browser app (three.js/Vite),
// a Node server, or a worker. No fs, no git, no DOM.

export type CardType = "vocab" | "sentence" | "kanji" | "kana" | "letter" | "grammar" | (string & {});
export type Grade = "again" | "hard" | "good" | "easy";

/** One glossed token of a sentence/phrase breakdown. */
export interface Token {
  token: string;
  reading?: string;
  gloss: string;
}

/** A single flashcard. `deck` and `lang` are injected by the loader from the parent deck. */
export interface Card {
  id: string;
  type: CardType;
  front: string;
  meaning?: string;
  reading?: string;
  romaji?: string;
  breakdown?: Token[];
  unit?: string;
  tags?: string[];
  source?: string;
  status?: "ready" | "needs_gloss";
  deck?: string;
  lang?: string;
}

/** A deck file, already parsed from YAML/JSON by the host. */
export interface Deck {
  deck: string;
  lang: string;
  source?: string;
  description?: string;
  cards: Card[];
}

/** SM-2 scheduling state for one card, keyed by card id in a Reviews map. */
export interface ReviewState {
  ease: number;
  interval: number; // whole days
  reps: number;
  lapses: number;
  due: string; // YYYY-MM-DD
  last: string; // YYYY-MM-DD
}

export type Reviews = Record<string, ReviewState>;

/** A card enriched with its scheduling state, as returned by queue/practice builders. */
export interface QueueCard extends Card {
  state: ReviewState | null;
  isNew: boolean;
}

export interface DeckSummary {
  deck: string;
  lang: string;
  total: number;
  due: number;
  fresh: number;
  pending: number;
}
