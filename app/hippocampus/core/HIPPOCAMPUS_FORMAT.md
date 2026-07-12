# Hippocampus deck-repo format (v1)

This is the canonical format a repository must follow to be usable by **Hippocampus** — the
sign-in-with-GitHub, bring-your-own-repo flashcard front-end. Any repo matching this layout can be
opened, validated, studied, and have its progress written back.

`dependanz/digicoach` is the reference implementation (this very folder).

## Repo layout

```
<repo>/
  learning/
    decks/
      <name>.yaml        # one or more deck files (.yaml or .json)
      ...
    reviews.json         # SM-2 scheduling state (created on first review if absent)
```

The app looks for deck files under **`learning/decks/`** and scheduling state at
**`learning/reviews.json`**. Nothing else is required.

## Deck file

```yaml
deck: ja-genki-1          # required — globally unique deck id (kebab-case)
lang: ja                  # required — language tag (ja, ko, … ; free string)
source: "Genki I"         # optional — where the deck comes from
description: "…"           # optional
cards:                    # required — array of cards
  - id: ja-genki1-0001    # required — GLOBALLY unique across the whole repo
    type: vocab           # vocab | sentence | kanji | kana | letter | grammar (unknown = warning)
    front: 学生            # required — what is shown first
    reading: がくせい       # optional — kana / romanization / on-kun etc.
    romaji: gakusei        # optional
    meaning: "student"     # required for a reviewable card (see status)
    breakdown:             # optional — per-token gloss (sentences) or example words (kanji)
      - { token: 学生, reading: がくせい, gloss: "student" }
    unit: "Ch.1"           # optional — chapter/lesson/section, for filtering
    tags: [genki, ch1]     # optional
    source: "Genki I Ch.1" # optional
    status: ready          # ready (default) | needs_gloss
```

### Rules
- **`id` must be globally unique across every deck in the repo** — `reviews.json` is keyed by a
  single global card id, so a collision would corrupt scheduling. The validator enforces this.
- A card is **reviewable** when `status` is `ready` (or omitted) **and** it has a non-empty
  `meaning`. `status: needs_gloss` marks a captured card awaiting annotation; it is skipped by the
  study queue and counted as "pending".
- `type` is a free label used for display; the six values above are recognized, others load with a
  warning.
- Cards may be JSON instead of YAML; a deck file may be `.yaml` or `.json`.

## reviews.json

A JSON object keyed by card id. Absent or `{}` = a fresh start (every card is "new").

```json
{
  "ja-genki1-0001": { "ease": 2.5, "interval": 1, "reps": 1, "lapses": 0, "due": "2026-07-13", "last": "2026-07-12" }
}
```

| field | meaning |
|---|---|
| `ease` | SM-2 ease factor (≥ 1.3) |
| `interval` | days until next review (0 = re-show today) |
| `reps` | consecutive successful reviews |
| `lapses` | times graded "again" |
| `due` | next due date, `YYYY-MM-DD` |
| `last` | date last reviewed, `YYYY-MM-DD` |

## Scheduling (SM-2, day-granularity)

Grades are **again / hard / good / easy**:
- **again** → lapse, re-show today (interval 0), ease down.
- new **good** → 1 day; new **easy** → 4 days; 2nd good → 6 days; then `interval × ease`.
- **hard** shortens (~0.8×), **easy** lengthens (~1.3×). Ease is floored at 1.3.

The reference engine (`hippocampus-core`) implements exactly this. Reuse it rather than
re-deriving the math.

## Validation

Before studying a repo, run `validateRepo(parsedDecks, parsedReviews)` from `hippocampus-core`.
It returns `{ valid, issues[], decks[], cardCount }`. **Errors** block studying (no decks, malformed
deck, duplicate global id); **warnings** are non-fatal (unknown type, ready card missing meaning).

## Versioning

This document is **format v1**. Additive changes stay v1; breaking changes bump the version. Apps
may record the version they support.
