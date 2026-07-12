// Hippocampus core — public API.
//
// A framework-agnostic, dependency-free spaced-repetition engine for the "sets of flashcard decks"
// repo format (see ../learning/HIPPOCAMPUS_FORMAT.md). Import this into a browser app, a worker,
// or a Node process. The host is responsible for I/O (fetching + parsing deck files via the GitHub
// API, persisting reviews.json back via a commit). This module is pure logic.

export * from "./types";
export { addDays, todayISO, isGrade, schedule, applyReview } from "./schedule";
export {
  DEFAULT_NEW_PER_DAY,
  reviewable,
  flattenDecks,
  shuffle,
  buildQueue,
  practiceDeck,
  makeQuiz,
  summarize,
  type QueueOptions,
  type QuizQuestion
} from "./library";
export { validateDeck, validateReviews, validateRepo, type ValidationIssue, type IssueLevel, type RepoValidation } from "./validate";
