# Vendored: hippocampus-core

These files (`types.ts`, `schedule.ts`, `library.ts`, `validate.ts`, `index.ts`) and
`HIPPOCAMPUS_FORMAT.md` are copied **verbatim** from the reference engine in
[`dependanz/digicoach`](https://github.com/dependanz/digicoach) (`hippocampus-core/` and
`learning/HIPPOCAMPUS_FORMAT.md`).

`hippocampus-core` is a pure-TypeScript, dependency-free SM-2 spaced-repetition engine (no `fs`,
no `git`, no DOM). Per the build brief, the site **vendors** it rather than re-implementing SM-2.

**Do not hand-edit these files.** To pick up upstream changes, re-copy them from `digicoach`
`hippocampus-core/` so the two stay in sync. Host-specific I/O (GitHub API, YAML parsing, UI)
lives in `../lib/` and the page components, never in here.
