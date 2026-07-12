# Vendored: hippocampus-core

The engine files here (`types.ts`, `schedule.ts`, `library.ts`, `validate.ts`, `index.ts`) are
copied **verbatim** from the private `dependanz/digicoach` reference engine (`hippocampus-core/`).
`HIPPOCAMPUS_FORMAT.md` is that same spec with its references to the private source repo removed,
since this repo is public and serves the doc to visitors.

`hippocampus-core` is a pure-TypeScript, dependency-free SM-2 spaced-repetition engine (no `fs`,
no `git`, no DOM). Per the build brief, the site **vendors** it rather than re-implementing SM-2.

**Do not hand-edit the engine `.ts` files.** To pick up upstream changes, re-copy them from the
source `hippocampus-core/` so the two stay in sync. Host-specific I/O (GitHub API, YAML parsing,
UI) lives in `../lib/` and the page components, never in here.
