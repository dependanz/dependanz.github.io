// Shared types + helpers for the EVC pilot survey.
// Kept framework-light: no Supabase SDK, just a PostgREST fetch (one insert doesn't
// justify a dependency on a statically-exported site).

export type Stimulus = {
  id: string;
  method: string;
  emotion: string;
  utterance: string;
  text: string;
  file: string;
};

export type Reference = {
  id: string;
  emotion: string;
  utterance: string;
  text: string;
  file: string;
};

export type ABPair = {
  id: string;
  utterance: string;
  emotion: string;
  a: string; // stimulus id
  b: string; // stimulus id
};

export type Manifest = {
  survey: string;
  generated_at: string;
  announce: boolean;
  methods: string[];
  emotions: string[];
  utterances: Record<string, string>;
  stimuli: Stimulus[];
  references: Reference[];
  ab_pairs: ABPair[];
};

export type ProlificParams = {
  prolificPid: string | null;
  studyId: string | null;
  sessionId: string | null;
  preview: boolean; // true when opened without a PROLIFIC_PID (e.g. you testing it directly)
};

export function readProlificParams(): ProlificParams {
  if (typeof window === "undefined") {
    return { prolificPid: null, studyId: null, sessionId: null, preview: true };
  }
  const q = new URLSearchParams(window.location.search);
  const pid = q.get("PROLIFIC_PID");
  return {
    prolificPid: pid,
    studyId: q.get("STUDY_ID"),
    sessionId: q.get("SESSION_ID"),
    preview: !pid,
  };
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- Trial model -----------------------------------------------------------

export type RatingTrial = { kind: "rating"; stim: Stimulus; ref?: Reference };
export type AttentionTrial = { kind: "attention"; prompt: string; answer: number };
export type ABTrial = { kind: "ab"; pair: ABPair; a: Stimulus; b: Stimulus };
export type Trial = RatingTrial | AttentionTrial | ABTrial;

export function buildTrials(m: Manifest): Trial[] {
  const refByUtt: Record<string, Reference> = {};
  m.references.forEach((r) => (refByUtt[r.utterance] = r));

  const ratingTrials: Trial[] = shuffle(m.stimuli).map((stim) => ({
    kind: "rating",
    stim,
    ref: refByUtt[stim.utterance],
  }));

  // One attention check near the middle of the rating block.
  const attention: AttentionTrial = {
    kind: "attention",
    prompt: "Attention check. For this item only, please select 2.",
    answer: 2,
  };
  const withAttention = [...ratingTrials];
  withAttention.splice(Math.max(1, Math.floor(withAttention.length / 2)), 0, attention);

  const stimById: Record<string, Stimulus> = {};
  m.stimuli.forEach((s) => (stimById[s.id] = s));
  const abTrials: Trial[] = shuffle(m.ab_pairs).map((pair) => ({
    kind: "ab",
    pair,
    a: stimById[pair.a],
    b: stimById[pair.b],
  }));

  return [...withAttention, ...abTrials];
}

// --- Answer accumulators ---------------------------------------------------

export type RatingAnswer = {
  stimId: string;
  method: string;
  emotion: string;
  utterance: string;
  emotionMatch: number; // 1-5, "how <emotion> does it sound"
  naturalness: number; // 1-5
  plays: number;
  rtMs: number;
};

export type ABAnswer = {
  pairId: string;
  utterance: string;
  emotion: string;
  choice: "a" | "b";
  aStim: string;
  bStim: string;
  rtMs: number;
};

export type AttentionAnswer = { prompt: string; expected: number; got: number; pass: boolean };

export type SurveyPayload = {
  prolific_pid: string | null;
  study_id: string | null;
  session_id: string | null;
  session_uuid: string;
  user_agent: string;
  is_preview: boolean;
  headphone_pass: boolean;
  attention_pass: boolean;
  duration_ms: number;
  responses: { ratings: RatingAnswer[]; attention: AttentionAnswer[] };
  ab_preferences: ABAnswer[];
  completed: boolean;
};

// --- Data sink (Supabase PostgREST) ---------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TABLE = "evc_pilot_responses";

export function sinkConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function submitResponse(
  payload: SurveyPayload
): Promise<{ ok: boolean; error?: string }> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, error: "Supabase env vars not set (see SETUP.md)." };
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { ok: false, error: `${res.status} ${await res.text()}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// Prolific completion redirect target (set the real ?cc= code in env).
export const PROLIFIC_COMPLETION_URL =
  process.env.NEXT_PUBLIC_PROLIFIC_COMPLETION_URL ||
  "https://app.prolific.com/submissions/complete?cc=REPLACE_ME";

export const EMOTION_DEFS: Record<string, string> = {
  happy: "a positive, upbeat, cheerful feeling",
  sad: "a low, downcast, sorrowful feeling",
};
