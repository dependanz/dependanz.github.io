# EVC pilot survey — setup

A toy "compare two emotional-voice-conversion methods" listening study, hosted as a **static**
Next.js page and run through **Prolific**, with responses written to **Supabase**.

Because the site is a static export on GitHub Pages, **there is no server here.** The survey UI
and audio are static files; responses are POSTed straight from the browser to Supabase's REST API.

```
Prolific (recruit + pay)
  └─▶ your study URL, with ?PROLIFIC_PID=…&STUDY_ID=…&SESSION_ID=…
        └─▶ /surveys/evc-pilot  (static page: plays /public audio, collects ratings)
              └─▶ POST → Supabase table  (evc_pilot_responses)
        └─▶ on finish → redirect to Prolific completion URL (?cc=…) → participant paid
```

---

## 1. Generate placeholder stimuli

```bash
pip install edge-tts
python scripts/gen_stimuli.py            # announce ON  (says method/emotion — pipeline test only)
python scripts/gen_stimuli.py --no-announce   # blind stimuli — use for real ratings
```

Writes mp3 clips + `manifest.json` to `public/audio/surveys/evc-pilot/`. The page fetches the
manifest at runtime, so regenerating stimuli just needs a re-deploy of the assets, not a code change.

> These are TTS, not real EVC. "Method" = a different voice; "emotion" = a pitch/rate preset.
> Swap in real converted clips later by replacing the files + manifest (same schema).

---

## 2. Supabase table

Create a free project at supabase.com, then in **SQL editor** run:

```sql
create table if not exists public.evc_pilot_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  prolific_pid text,
  study_id text,
  session_id text,
  session_uuid text,
  user_agent text,
  is_preview boolean,
  headphone_pass boolean,
  attention_pass boolean,
  duration_ms integer,
  responses jsonb,
  ab_preferences jsonb,
  completed boolean default true
);

-- Insert-only for anonymous visitors: they can write a response but cannot read anyone's data.
alter table public.evc_pilot_responses enable row level security;

create policy "anon can insert responses"
  on public.evc_pilot_responses
  for insert
  to anon
  with check (true);
```

There is deliberately **no SELECT policy** for `anon`, so participants can submit but not read the
table. You read your data from the Supabase dashboard (Table editor / SQL / CSV export).

Grab **Project URL** and the **anon public key** from Project Settings → API.

---

## 3. Environment variables

**Local dev:** copy `.env.local.example` → `.env.local` and fill in the three values.

**Production (GitHub Pages):** `NEXT_PUBLIC_*` vars are inlined at *build* time, so they must be
present when the Actions workflow builds. Add them as repo **Secrets/Variables**
(`Settings → Secrets and variables → Actions`) and pass them into the build step in
`.github/workflows/nextjs.yml`:

```yaml
      - name: Build with Next.js
        run: ${{ steps.detect-package-manager.outputs.runner }} next build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_PROLIFIC_COMPLETION_URL: ${{ secrets.NEXT_PUBLIC_PROLIFIC_COMPLETION_URL }}
```

(The anon key is public by design — it's shipped to every browser regardless. RLS is what protects
the data, which is why the insert-only policy above matters.)

---

## 4. Run it locally

```bash
npm run dev
# preview (no data saved unless env is set, no redirect):
#   http://localhost:3000/surveys/evc-pilot
# simulate a participant:
#   http://localhost:3000/surveys/evc-pilot?PROLIFIC_PID=test&STUDY_ID=s&SESSION_ID=x
```

---

## 5. Prolific study config

1. Study URL: `https://<your-domain>/surveys/evc-pilot`
2. Enable **"I'll use URL parameters"** so Prolific appends `PROLIFIC_PID`, `STUDY_ID`,
   `SESSION_ID`. (If you paste them manually the template is
   `?PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}`.)
3. Completion: choose **"Redirect to a URL"** / completion-code flow, copy the code, and set
   `NEXT_PUBLIC_PROLIFIC_COMPLETION_URL=https://app.prolific.com/submissions/complete?cc=YOURCODE`.
4. Set pay honestly — Prolific enforces a minimum (~£6/hr, £9/hr recommended). A 5-min task ≈
   £0.75/participant + Prolific's ~1/3 fee. Start with a tiny N (e.g. 10–20) to prove the loop.
5. Approvals: use `attention_pass` / `headphone_pass` in the data to decide approve/reject.

---

## Notes / guardrails

- **Keep it a toy.** Data is for personal understanding, not publication. If any of this feeds the
  real Sensorium study, gate it on IRB + Mark first — the notes flag "is perceived-emotion
  annotation human-subjects research?" as still-open.
- **Blind before you trust numbers.** Re-run stimulus generation with `--no-announce`.
- **Domain:** no `CNAME` in the repo, so confirm whether the live URL is `dependanz.github.io` or
  `danzelserrano.com` (GitHub Pages settings) and use that in the Prolific study URL.
- **This vs. the real task:** this is *method comparison*. The team's real annotation task is
  *perceived-emotion recognition* of collected clips — different instrument, but the audio player,
  full-play gating, Prolific plumbing, and Supabase sink are ~90% reusable.
