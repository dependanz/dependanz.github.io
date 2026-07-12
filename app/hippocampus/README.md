# /hippocampus

A **bring-your-own-repo** spaced-repetition study dashboard, served statically at
`danzelserrano.com/hippocampus`. Sign in with a fine-grained GitHub PAT, point it at any repo that
follows the Hippocampus deck format, and it becomes a review dashboard whose progress is committed
straight back to that repo (so it syncs across devices).

It implements the **Working MVP** slice of the Hippocampus build brief (from the private
`dependanz/digicoach` source): auth → repo pick → validate → study loop (daily queue / cram /
quiz) → commit `reviews.json`, plus **in-app card authoring** (add / edit / delete) with
offline Japanese readings. The three.js paper-storm hero and PWA install from the brief are
intentionally deferred.

## Card authoring

From the dashboard, **Manage** a deck to browse/search its cards and add, edit, or delete them.
Two add modes: **plain entry** (fill every field) and **Capture** (paste text you couldn't read →
saved as `needs_gloss` until you add a meaning). Each save re-serializes the whole deck to YAML and
commits the file (`learning/decks/<name>.yaml`) via the Contents API, then reflects the change in
the study queue immediately. New card ids are minted globally-unique (`newCardId`).

For Japanese decks, **Auto-fill readings** runs an entirely offline analyzer (`kuromoji` + IPADIC,
served from `/public/kuromoji-dict`) to fill the kana `reading`, Hepburn `romaji`, and a per-token
`breakdown` skeleton — no network, nothing sent anywhere. The dictionary (~18 MB of `.dat.gz`) is
lazy-loaded only when you first request readings.

## Layout

```
app/hippocampus/
  page.tsx              # standalone route: renders only the client app (no site navbar)
  hippocampus-app.tsx   # orchestrator: auth gate, repo picker, validation, sync, authoring, routing
  dashboard.tsx         # deck tiles (core.summarize) + daily/cram/quiz/manage entry points
  study.tsx             # StudySession (flip + grade) and QuizSession (multiple choice)
  deck-manager.tsx      # browse/search a deck's cards; add/edit/delete
  card-editor.tsx       # add/edit form (plain + capture modes) with JA auto-fill
  ui.tsx                # shared theme-aware primitives (Btn, Panel, Chip, accent)
  lib/
    github.ts           # PAT-based GitHub REST client (list/read/commit), UTF-8 base64
    repo.ts             # load/validate repo; serialize + commit deck edits
    cards.ts            # pure card mutations: id generation, normalize, add/edit/delete
    furigana.ts         # offline JA readings (lazy kuromoji + wanakana)
  core/                 # VENDORED hippocampus-core engine — do not hand-edit (see core/VENDORED.md)
```

## Auth model (static-site friendly)

GitHub Pages is static, so there is **no server and no OAuth broker**. The user pastes a
fine-grained personal access token (Repository access → the study repos, **Contents: Read and
write**). It is held only in the tab's `sessionStorage`, sent as a `Bearer` header to
`api.github.com` (CORS-enabled), and never committed. Read-only tokens work for studying without
saving progress. Swapping in real "Sign in with GitHub" later only touches `lib/github.ts` +
the auth gate — the rest of the app is agnostic to how the token is obtained.

## The engine

All SM-2 scheduling, queueing, and validation come from the vendored, dependency-free
`core/` engine (the reference `hippocampus-core`). The host code here only does I/O: fetching
files, parsing YAML/JSON, rendering, and committing `reviews.json` back.

## Deferred (from the brief)

- three.js "paper-storm" hero + reduced-motion HTML fallback.
- PWA manifest + service worker (installable, offline review).
