// Load a Hippocampus deck-repo over the GitHub API, validate it with the vendored core engine,
// and (for the authoring feature) serialize + commit deck edits back.
//
// Layout the app expects (see ../core/HIPPOCAMPUS_FORMAT.md):
//   <repo>/learning/decks/*.{yaml,yml,json}   -- one or more deck files
//   <repo>/learning/reviews.json              -- SM-2 state (optional; {} on first study)

import { load as yamlLoad, dump as yamlDump } from "js-yaml";
import { validateRepo, type Card, type Deck, type Reviews, type RepoValidation } from "../core";
import { getFile, listDir, putFile, type Repo } from "./github";

const DECKS_DIR = "learning/decks";
const REVIEWS_PATH = "learning/reviews.json";

/** A parsed deck plus the info needed to commit an edited version back to its file. */
export interface DeckFileRef {
  path: string; // e.g. learning/decks/ja-genki-1.yaml
  sha: string; // current blob sha, needed to update the file
  isJson: boolean;
  deck: Deck;
}

export interface LoadedRepo {
  repo: Repo;
  validation: RepoValidation;
  reviews: Reviews;
  reviewsSha?: string; // blob sha of reviews.json, needed to commit an update
  deckFiles: DeckFileRef[]; // one per parsed deck file (source of truth for authoring)
}

function parseDeckFile(name: string, text: string): unknown {
  if (name.endsWith(".json")) return JSON.parse(text);
  return yamlLoad(text); // .yaml / .yml
}

function isDeckShaped(v: unknown): v is Deck {
  return Boolean(v) && typeof v === "object" && typeof (v as any).deck === "string" && Array.isArray((v as any).cards);
}

/** Fetch every deck file + reviews.json from a repo, parse them, and run full repo validation. */
export async function loadRepo(token: string, repo: Repo): Promise<LoadedRepo> {
  const ref = repo.default_branch;
  const entries = await listDir(token, repo.owner, repo.name, DECKS_DIR, ref);
  const deckEntries = entries.filter((e) => e.type === "file" && /\.(ya?ml|json)$/i.test(e.name));

  const parsedDecks: unknown[] = [];
  const deckFiles: DeckFileRef[] = [];
  for (const entry of deckEntries) {
    const file = await getFile(token, repo.owner, repo.name, entry.path, ref);
    if (!file) continue;
    let parsed: unknown;
    try {
      parsed = parseDeckFile(entry.name, file.text);
    } catch (err) {
      parsedDecks.push({ __parseError: `${entry.path}: ${(err as Error).message}` });
      continue;
    }
    parsedDecks.push(parsed);
    if (isDeckShaped(parsed)) {
      deckFiles.push({ path: entry.path, sha: file.sha, isJson: entry.name.endsWith(".json"), deck: parsed });
    }
  }

  const reviewsFile = await getFile(token, repo.owner, repo.name, REVIEWS_PATH, ref);
  let parsedReviews: unknown = {};
  if (reviewsFile) {
    try {
      parsedReviews = JSON.parse(reviewsFile.text);
    } catch {
      parsedReviews = {};
    }
  }

  const validation = validateRepo(parsedDecks, parsedReviews);

  return {
    repo,
    validation,
    reviews: (parsedReviews && typeof parsedReviews === "object" ? parsedReviews : {}) as Reviews,
    reviewsSha: reviewsFile?.sha,
    deckFiles
  };
}

/** Commit an updated reviews map back to learning/reviews.json. Returns the new blob sha. */
export async function saveReviews(
  token: string,
  repo: Repo,
  reviews: Reviews,
  sha: string | undefined,
  reviewCount: number
): Promise<string> {
  const text = JSON.stringify(reviews, null, 2) + "\n";
  const message = `hippocampus: sync review progress (${reviewCount} card${reviewCount === 1 ? "" : "s"})`;
  const result = await putFile(token, repo.owner, repo.name, REVIEWS_PATH, text, message, sha, repo.default_branch);
  return result.sha;
}

// --- deck authoring --------------------------------------------------------

// Field order used when re-serializing a deck, so committed files stay tidy and diff-friendly.
const CARD_KEY_ORDER = ["id", "type", "unit", "front", "reading", "romaji", "meaning", "breakdown", "tags", "source", "status"];
const KNOWN_CARD_KEYS = new Set([...CARD_KEY_ORDER]);
const INJECTED_KEYS = new Set(["deck", "lang", "state", "isNew"]); // never write loader/queue-injected fields

function orderedCard(card: Card): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of CARD_KEY_ORDER) {
    const value = (card as any)[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (key === "breakdown") {
      out.breakdown = (value as any[]).map((t) => {
        const tok: Record<string, unknown> = { token: t.token };
        if (t.reading) tok.reading = t.reading;
        tok.gloss = t.gloss ?? "";
        return tok;
      });
    } else {
      out[key] = value;
    }
  }
  // Preserve any non-standard fields the author may have added (but never injected ones).
  for (const key of Object.keys(card)) {
    if (KNOWN_CARD_KEYS.has(key) || INJECTED_KEYS.has(key)) continue;
    out[key] = (card as any)[key];
  }
  return out;
}

/** Serialize a deck to its on-disk text (YAML unless the source file was .json). */
export function serializeDeck(deck: Deck, isJson = false): string {
  const ordered: Record<string, unknown> = { deck: deck.deck, lang: deck.lang };
  if (deck.source) ordered.source = deck.source;
  if (deck.description) ordered.description = deck.description;
  ordered.cards = (deck.cards ?? []).map(orderedCard);
  if (isJson) return JSON.stringify(ordered, null, 2) + "\n";
  return yamlDump(ordered, { lineWidth: -1, noRefs: true, sortKeys: false });
}

/** Commit an edited deck back to its file. Returns the new blob sha. */
export async function saveDeck(token: string, repo: Repo, ref: DeckFileRef, updated: Deck, summary: string): Promise<string> {
  const text = serializeDeck(updated, ref.isJson);
  const message = `hippocampus: ${summary} (${updated.deck})`;
  const result = await putFile(token, repo.owner, repo.name, ref.path, text, message, ref.sha, repo.default_branch);
  return result.sha;
}
