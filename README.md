# danzelserrano-web

Personal website + web apps (`danzelserrano.com`), built with **Next.js 15 / React 19** and
served as a **long-running Node server** on a self-managed VPS (behind Caddy for TLS).

> This repo was migrated off GitHub Pages (`dependanz/dependanz.github.io`), where the site was a
> static export. It now runs as a real server (`next start`), which unlocks server components, API
> routes, and server-held secrets — see [`DEPLOY.md`](./DEPLOY.md) for the hosting/deploy setup.

## What's here

| Route | What it is |
|---|---|
| `/` | Landing — bio, publications |
| `/blog`, `/blog/admin` | MDX blog + encrypted-draft viewer |
| `/cv` | CV (PDF) |
| `/hippocampus` | Spaced-repetition study app (bring-your-own GitHub repo) |
| `/surveys/evc-pilot` | Prolific listening study → Supabase |
| `/danzieboy` | Music links |

## Local development

```bash
npm ci
cp .env.local.example .env.local   # fill in values for the surveys (optional for the rest)
npm run dev                        # http://localhost:3000
```

To exercise the production server mode locally (what the VPS runs):

```bash
npm run build && npm run start
```

## Deployment

Push-to-deploy to a self-managed VPS. The full, reproducible setup — provisioning, hardening,
Node/Caddy install, the bare-repo `post-receive` hook, systemd service, and DNS/TLS — lives in
[`DEPLOY.md`](./DEPLOY.md). Once it's set up, deploying is:

```bash
git push production main
```
