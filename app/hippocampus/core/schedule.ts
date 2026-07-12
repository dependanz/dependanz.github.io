// Hippocampus core — SM-2 spaced-repetition scheduler (day-granularity, timezone-agnostic).
// Pure functions only. The host passes `today` as a "YYYY-MM-DD" string in the user's own locale.

import type { Grade, ReviewState, Reviews } from "./types";

/** Add whole days to a YYYY-MM-DD date using UTC math (DST-safe, timezone-agnostic). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Today's date as YYYY-MM-DD in the runtime's local timezone (host may override). */
export function todayISO(now: Date = new Date()): string {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

const GRADE_Q: Record<Grade, number> = { again: 2, hard: 3, good: 4, easy: 5 };

export function isGrade(value: unknown): value is Grade {
  return value === "again" || value === "hard" || value === "good" || value === "easy";
}

/**
 * Compute the next review state from the previous one (or undefined for a new card).
 * - again: lapse, re-show today (interval 0)
 * - new + good -> 1 day; new + easy -> 4 days; 2nd good -> 6 days; then interval * ease
 * - hard shortens (~0.8x), easy lengthens (~1.3x); ease floored at 1.3
 */
export function schedule(prev: ReviewState | undefined, grade: Grade, today: string): ReviewState {
  const q = GRADE_Q[grade];
  let ease = prev?.ease ?? 2.5;
  let reps = prev?.reps ?? 0;
  let interval = prev?.interval ?? 0;
  let lapses = prev?.lapses ?? 0;

  if (q < 3) {
    reps = 0;
    interval = 0;
    lapses += 1;
  } else {
    if (reps === 0) interval = grade === "easy" ? 4 : 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ease);
    if (grade === "hard") interval = Math.max(1, Math.round(interval * 0.8));
    if (grade === "easy" && reps > 0) interval = Math.round(interval * 1.3);
    reps += 1;
  }

  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  return {
    ease: Number(ease.toFixed(2)),
    interval,
    reps,
    lapses,
    due: addDays(today, interval),
    last: today
  };
}

/** Immutably apply a grade to a reviews map, returning a new map. */
export function applyReview(reviews: Reviews, cardId: string, grade: Grade, today: string): Reviews {
  return { ...reviews, [cardId]: schedule(reviews[cardId], grade, today) };
}
