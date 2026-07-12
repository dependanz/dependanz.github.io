# /hippocampus

A **bring-your-own-repo** spaced-repetition study dashboard, served statically at
`danzelserrano.com/hippocampus`. Sign in with a fine-grained GitHub PAT, point it at any repo that
follows the Hippocampus deck format, and it becomes a review dashboard whose progress is committed
straight back to that repo (so it syncs across devices).

It implements `core/BUILD_BRIEF.md` from
[`dependanz/digicoach`](https://github.com/dependanz/digicoach) — the **Working MVP** slice:
auth → repo pick → validate → study loop (daily queue / cram / quiz) → commit `reviews.json`.
The three.js paper-storm hero and PWA install from the brief are intentionally deferred.

## Layout

```
app/hippocampus/
  page.tsx              # standalone route: renders only the client app (no site navbar)
  hippocampus-app.tsx   # orchestrator: auth gate, repo picker, validation, sync, view routing
  dashboard.tsx         # deck tiles (core.summarize) + daily/cram/quiz entry points
  study.tsx             # StudySession (flip + grade) and QuizSession (multiple choice)
  ui.tsx                # shared theme-aware primitives (Btn, Panel, Chip, accent)
  lib/
    github.ts           # PAT-based GitHub REST client (list/read/commit), UTF-8 base64
    repo.ts             # load learning/decks/* + reviews.json, parse (js-yaml/JSON), validateRepo
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
- In-app deck authoring (v1 is study-only; decks are authored in the repo).
