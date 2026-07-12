// Load a Hippocampus deck-repo over the GitHub API and validate it with the vendored core engine.
//
// Layout the app expects (see ../core/HIPPOCAMPUS_FORMAT.md):
//   <repo>/learning/decks/*.{yaml,yml,json}   -- one or more deck files
//   <repo>/learning/reviews.json              -- SM-2 state (optional; {} on first study)

import { load as yamlLoad } from "js-yaml";
import { validateRepo, type Reviews, type RepoValidation } from "../core";
import { getFile, listDir, putFile, type Repo } from "./github";

const DECKS_DIR = "learning/decks";
const REVIEWS_PATH = "learning/reviews.json";

export interface LoadedRepo {
  repo: Repo;
  validation: RepoValidation;
  reviews: Reviews;
  reviewsSha?: string; // blob sha of reviews.json, needed to commit an update
  deckFiles: string[]; // paths that were parsed, for display
}

function parseDeckFile(name: string, text: string): unknown {
  if (name.endsWith(".json")) return JSON.parse(text);
  return yamlLoad(text); // .yaml / .yml
}

/** Fetch every deck file + reviews.json from a repo, parse them, and run full repo validation. */
export async function loadRepo(token: string, repo: Repo): Promise<LoadedRepo> {
  const ref = repo.default_branch;
  const entries = await listDir(token, repo.owner, repo.name, DECKS_DIR, ref);
  const deckEntries = entries.filter(
    (e) => e.type === "file" && /\.(ya?ml|json)$/i.test(e.name)
  );

  const parsedDecks: unknown[] = [];
  const deckFiles: string[] = [];
  for (const entry of deckEntries) {
    const file = await getFile(token, repo.owner, repo.name, entry.path, ref);
    if (!file) continue;
    try {
      parsedDecks.push(parseDeckFile(entry.name, file.text));
      deckFiles.push(entry.path);
    } catch (err) {
      // A malformed YAML/JSON file surfaces as a validation error via an empty/omitted deck.
      parsedDecks.push({ __parseError: `${entry.path}: ${(err as Error).message}` });
      deckFiles.push(entry.path);
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
