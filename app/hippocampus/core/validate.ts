// Hippocampus core — format validation. Used when a user picks a repo, to confirm it holds
// a well-formed set of flashcard decks before the app tries to study it.
//
// The host lists repo files (e.g. via the GitHub API), parses each learning/decks/*.{yaml,json}
// into an object, and passes the parsed objects here. Validation is pure and dependency-free.

import type { Card, Deck, Reviews } from "./types";

export type IssueLevel = "error" | "warning";
export interface ValidationIssue {
  level: IssueLevel;
  where: string;
  message: string;
}

const CARD_TYPES = new Set(["vocab", "sentence", "kanji", "kana", "letter", "grammar"]);
const STATUSES = new Set(["ready", "needs_gloss"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validate a single parsed deck object. Returns issues and, if shaped like a deck, the typed deck. */
export function validateDeck(input: unknown, path = "deck"): { valid: boolean; issues: ValidationIssue[]; deck?: Deck } {
  const issues: ValidationIssue[] = [];
  if (!isObject(input)) {
    return { valid: false, issues: [{ level: "error", where: path, message: "Deck must be an object." }] };
  }
  const obj = input as Record<string, unknown>;
  if (typeof obj.deck !== "string" || !obj.deck.trim()) issues.push({ level: "error", where: `${path}.deck`, message: "Missing string `deck` (unique deck id)." });
  if (typeof obj.lang !== "string" || !obj.lang.trim()) issues.push({ level: "error", where: `${path}.lang`, message: "Missing string `lang`." });
  if (!Array.isArray(obj.cards)) {
    issues.push({ level: "error", where: `${path}.cards`, message: "Missing `cards` array." });
    return { valid: issues.every((i) => i.level !== "error"), issues };
  }

  const seen = new Set<string>();
  (obj.cards as unknown[]).forEach((raw, index) => {
    const cardPath = `${path}.cards[${index}]`;
    if (!isObject(raw)) {
      issues.push({ level: "error", where: cardPath, message: "Card must be an object." });
      return;
    }
    const card = raw as Record<string, unknown>;
    if (typeof card.id !== "string" || !card.id.trim()) issues.push({ level: "error", where: `${cardPath}.id`, message: "Card needs a non-empty string `id`." });
    else if (seen.has(card.id)) issues.push({ level: "error", where: `${cardPath}.id`, message: `Duplicate card id "${card.id}" within this deck.` });
    else seen.add(card.id);

    if (typeof card.front !== "string" || !card.front.trim()) issues.push({ level: "error", where: `${cardPath}.front`, message: "Card needs a non-empty string `front`." });
    if (card.type !== undefined && typeof card.type === "string" && !CARD_TYPES.has(card.type)) issues.push({ level: "warning", where: `${cardPath}.type`, message: `Unknown card type "${card.type}" (allowed: ${[...CARD_TYPES].join(", ")}); it will still load.` });

    const status = card.status ?? "ready";
    if (typeof status === "string" && !STATUSES.has(status)) issues.push({ level: "warning", where: `${cardPath}.status`, message: `Unknown status "${status}".` });
    const needsGloss = status === "needs_gloss";
    if (!needsGloss && (typeof card.meaning !== "string" || !card.meaning.trim())) {
      issues.push({ level: "warning", where: `${cardPath}.meaning`, message: "Ready card has no `meaning`; it won't be reviewable until glossed." });
    }
  });

  const valid = issues.every((i) => i.level !== "error");
  return { valid, issues, deck: valid ? (obj as unknown as Deck) : undefined };
}

/** Validate a parsed reviews.json object (scheduling state). Missing/empty is valid (fresh start). */
export function validateReviews(input: unknown, path = "reviews.json"): { valid: boolean; issues: ValidationIssue[]; reviews: Reviews } {
  if (input == null) return { valid: true, issues: [], reviews: {} };
  if (!isObject(input)) return { valid: false, issues: [{ level: "error", where: path, message: "reviews.json must be a JSON object keyed by card id." }], reviews: {} };
  const issues: ValidationIssue[] = [];
  for (const [id, state] of Object.entries(input)) {
    if (!isObject(state)) { issues.push({ level: "error", where: `${path}.${id}`, message: "Review state must be an object." }); continue; }
    for (const field of ["ease", "interval", "reps", "lapses"]) {
      if (typeof (state as any)[field] !== "number") issues.push({ level: "warning", where: `${path}.${id}.${field}`, message: `Expected number \`${field}\`.` });
    }
    if (typeof (state as any).due !== "string") issues.push({ level: "warning", where: `${path}.${id}.due`, message: "Expected string `due` (YYYY-MM-DD)." });
  }
  return { valid: issues.every((i) => i.level !== "error"), issues, reviews: input as Reviews };
}

export interface RepoValidation {
  valid: boolean;
  issues: ValidationIssue[];
  decks: Deck[];
  cardCount: number;
}

/**
 * Validate a whole repo's worth of decks (already parsed) plus optional reviews.
 * Confirms: at least one deck, every deck valid, and card ids unique ACROSS decks
 * (reviews.json is keyed by a single global card id).
 */
export function validateRepo(parsedDecks: unknown[], parsedReviews?: unknown): RepoValidation {
  const issues: ValidationIssue[] = [];
  const decks: Deck[] = [];

  if (!parsedDecks.length) issues.push({ level: "error", where: "learning/decks", message: "No deck files found. Expected learning/decks/*.{yaml,json}." });

  parsedDecks.forEach((raw, index) => {
    const result = validateDeck(raw, `decks[${index}]`);
    issues.push(...result.issues);
    if (result.deck) decks.push(result.deck);
  });

  const globalIds = new Map<string, string>();
  let cardCount = 0;
  for (const deck of decks) {
    for (const card of deck.cards as Card[]) {
      cardCount += 1;
      if (typeof card.id === "string") {
        const owner = globalIds.get(card.id);
        if (owner) issues.push({ level: "error", where: `deck "${deck.deck}"`, message: `Card id "${card.id}" also exists in deck "${owner}". Ids must be globally unique.` });
        else globalIds.set(card.id, deck.deck);
      }
    }
  }

  if (parsedReviews !== undefined) issues.push(...validateReviews(parsedReviews).issues);

  return { valid: issues.every((i) => i.level !== "error"), issues, decks, cardCount };
}
