# Deploying to a self-managed VPS

This site runs as a **long-running Node server** (`next start`) on a VPS you own, behind **Caddy**
(automatic HTTPS), with **push-to-deploy** via a bare git repo + `post-receive` hook and a
**systemd** service to keep it alive. No PaaS, no serverless — you own the box end to end.

Deploying, once set up, is one command from your laptop:

```bash
git push production main
```

---

## What you'll pay

| Item | Suggestion | Cost |
|---|---|---|
| VPS | Hetzner CX22 (value) or DigitalOcean basic droplet (docs) | ~€5 / $6 per month |
| Domain | `danzelserrano.com` (already owned) | ~$12–15/yr |
| TLS | Let's Encrypt via Caddy | free |

Use **Ubuntu 24.04 LTS**.

---

## Phase 0 — On your laptop

Confirm it runs in server mode (this repo already has `output: "export"` removed):

```bash
npm run build && npm run start   # visit http://localhost:3000
```

Generate an SSH key if needed and grab the public half:

```bash
ssh-keygen -t ed25519 -C "danzelserrano@gmail.com"
cat ~/.ssh/id_ed25519.pub
```

## Phase 1 — Create the VPS

Create an **Ubuntu 24.04** server and paste your **public key** during creation. Note the public IP.

## Phase 2 — First login & harden

```bash
ssh root@YOUR_IP

adduser deploy
usermod -aG sudo deploy

mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys
```

Lock down SSH — in `/etc/ssh/sshd_config` set `PermitRootLogin no` and `PasswordAuthentication no`, then:

```bash
systemctl restart ssh
```

Firewall:

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

Open a **new terminal** and confirm `ssh deploy@YOUR_IP` works before closing root.

## Phase 3 — Install the runtime

```bash
# Node 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Caddy (reverse proxy + automatic HTTPS)
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

## Phase 4 — Point the domain at the box

At your registrar, add DNS records (then check with `dig danzelserrano.com +short`):

| Type | Name | Value |
|---|---|---|
| A | `@` | `YOUR_IP` |
| A | `www` | `YOUR_IP` |

## Phase 5 — App setup (bare repo + deploy hook)

As the `deploy` user:

```bash
git init --bare /home/deploy/app.git
mkdir -p /home/deploy/app
```

Create `/home/deploy/app.git/hooks/post-receive` and `chmod +x` it:

```bash
#!/bin/bash
set -e
TARGET=/home/deploy/app
GIT_DIR=/home/deploy/app.git
BRANCH=main

while read oldrev newrev ref; do
  [[ $ref = refs/heads/$BRANCH ]] || continue
  echo "→ deploying $BRANCH"
  git --work-tree="$TARGET" --git-dir="$GIT_DIR" checkout -f "$BRANCH"
  cd "$TARGET"
  npm ci
  npm run build
  sudo systemctl restart myapp
  echo "✓ live"
done
```

Put **secrets** in a gitignored env file on the server (never in git). The build reads these; the
`NEXT_PUBLIC_*` values are inlined at build time (same as before):

```bash
cat > /home/deploy/app/.env.local <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
NEXT_PUBLIC_PROLIFIC_COMPLETION_URL=https://app.prolific.com/submissions/complete?cc=YOURCODE
EOF
```

## Phase 6 — Keep it running (systemd)

Create `/etc/systemd/system/myapp.service`:

```ini
[Unit]
Description=danzelserrano.com Next.js app
After=network.target

[Service]
User=deploy
WorkingDirectory=/home/deploy/app
ExecStart=/usr/bin/npm run start
Environment=NODE_ENV=production
Environment=PORT=3000
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable myapp
```

Let the hook restart it without a password — `sudo visudo -f /etc/sudoers.d/deploy-myapp`:

```
deploy ALL=(ALL) NOPASSWD: /bin/systemctl restart myapp
```

## Phase 7 — Caddy reverse proxy + HTTPS

`/etc/caddy/Caddyfile`:

```
danzelserrano.com, www.danzelserrano.com {
    reverse_proxy localhost:3000
}
```

```bash
sudo systemctl reload caddy
```

Caddy fetches and auto-renews the Let's Encrypt cert.

## Phase 8 — Wire up push-to-deploy

On your **laptop**, in this repo:

```bash
git remote add production deploy@YOUR_IP:/home/deploy/app.git
git push production main       # first push builds + starts everything
```

Keep pushing to GitHub (`origin`) too — it's your backup and the basis for CI later.

## Phase 9 — Verify

Visit `https://danzelserrano.com`. To debug:

```bash
sudo systemctl status myapp     # is the app up?
journalctl -u myapp -f          # live app logs
journalctl -u caddy -f          # proxy / TLS logs
```

## From now on

```bash
git push production main
```

## Next steps (once stable)

- **GitHub Actions + SSH** so tests run before deploy and GitHub stays canonical.
- **Backups** of `/home/deploy/app/.env.local` and your Supabase data.
- **Cloudflare** in front for a free global CDN on static assets.
- Later, drop `images.unoptimized` in `next.config.js` (add `sharp`) for server-side image optimization.
