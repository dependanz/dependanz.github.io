"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ABAnswer,
  AttentionAnswer,
  buildTrials,
  EMOTION_DEFS,
  Manifest,
  PROLIFIC_COMPLETION_URL,
  ProlificParams,
  RatingAnswer,
  readProlificParams,
  sinkConfigured,
  submitResponse,
  SurveyPayload,
  Trial,
} from "./survey-lib";

type Phase =
  | "loading"
  | "error"
  | "consent"
  | "headphone"
  | "instructions"
  | "trials"
  | "submitting"
  | "done";

const MANIFEST_URL = "/audio/surveys/evc-pilot/manifest.json";

export default function EvcPilotPage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [prolific, setProlific] = useState<ProlificParams | null>(null);
  const [loadError, setLoadError] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");

  // answers
  const ratingsRef = useRef<Record<string, RatingAnswer>>({});
  const abRef = useRef<Record<string, ABAnswer>>({});
  const attentionRef = useRef<AttentionAnswer[]>([]);
  const headphonePassRef = useRef(false);
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    setProlific(readProlificParams());
    startedAtRef.current = Date.now();
    fetch(MANIFEST_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`manifest ${r.status} — run scripts/gen_stimuli.py first`);
        return r.json();
      })
      .then((m: Manifest) => {
        setManifest(m);
        setTrials(buildTrials(m));
        setPhase("consent");
      })
      .catch((e) => {
        setLoadError(String(e.message || e));
        setPhase("error");
      });
  }, []);

  const finish = useCallback(async () => {
    setPhase("submitting");
    const attention = attentionRef.current;
    const payload: SurveyPayload = {
      prolific_pid: prolific?.prolificPid ?? null,
      study_id: prolific?.studyId ?? null,
      session_id: prolific?.sessionId ?? null,
      session_uuid:
        typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      is_preview: prolific?.preview ?? true,
      headphone_pass: headphonePassRef.current,
      attention_pass: attention.length === 0 || attention.every((a) => a.pass),
      duration_ms: Date.now() - startedAtRef.current,
      responses: { ratings: Object.values(ratingsRef.current), attention },
      ab_preferences: Object.values(abRef.current),
      completed: true,
    };
    const res = await submitResponse(payload);
    if (!res.ok) {
      setSubmitError(res.error || "unknown error");
    }
    setPhase("done");
  }, [prolific]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-1">Voice conversion listening study</h1>
      <p className="text-sm opacity-70 mb-6">A short audio-rating task (~5 minutes).</p>

      {prolific?.preview && phase !== "loading" && (
        <div
          className="mb-4 rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: "var(--ring)" }}
        >
          <b>Preview mode.</b> No <code>PROLIFIC_PID</code> in the URL, so this run is marked as a
          preview and no completion redirect will fire.
          {!sinkConfigured() && (
            <>
              {" "}
              Also: Supabase env vars are not set, so responses won&apos;t be saved (see SETUP.md).
            </>
          )}
        </div>
      )}

      {phase === "loading" && <p>Loading…</p>}

      {phase === "error" && (
        <div>
          <p className="mb-2">Could not load the study.</p>
          <pre className="text-xs whitespace-pre-wrap opacity-70">{loadError}</pre>
        </div>
      )}

      {phase === "consent" && <Consent onAgree={() => setPhase("headphone")} />}

      {phase === "headphone" && (
        <HeadphoneCheck
          onPass={() => {
            headphonePassRef.current = true;
            setPhase("instructions");
          }}
        />
      )}

      {phase === "instructions" && manifest && (
        <Instructions manifest={manifest} onStart={() => setPhase("trials")} />
      )}

      {phase === "trials" && (
        <TrialRunner
          trials={trials}
          onRating={(a) => (ratingsRef.current[a.stimId] = a)}
          onAB={(a) => (abRef.current[a.pairId] = a)}
          onAttention={(a) => attentionRef.current.push(a)}
          onDone={finish}
        />
      )}

      {phase === "submitting" && <p>Saving your responses…</p>}

      {phase === "done" && (
        <Done preview={prolific?.preview ?? true} submitError={submitError} />
      )}
    </main>
  );
}

// --------------------------------------------------------------------------

function Consent({ onAgree }: { onAgree: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Before you begin</h2>
      <p className="text-sm">
        You will listen to short synthetic speech clips and rate how they sound. Participation is
        voluntary and you may stop at any time. We record only your ratings and your Prolific ID
        (used to pay you) — no other personal information. Please use headphones in a quiet room.
      </p>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>I am 18+, I consent to take part, and I am wearing headphones.</span>
      </label>
      <PrimaryButton disabled={!checked} onClick={onAgree}>
        Continue
      </PrimaryButton>
    </section>
  );
}

// A minimal 3-interval "which tone was quietest" check — a lightweight stand-in for the real
// mcdermottLab/HeadphoneCheck, which drops in here later. Confirms audio works and the listener
// is paying attention.
function HeadphoneCheck({ onPass }: { onPass: () => void }) {
  const [order, setOrder] = useState<number[] | null>(null);
  const [played, setPlayed] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [msg, setMsg] = useState("");
  const quietSlotRef = useRef<number>(0);

  const play = useCallback(async () => {
    const gains = [0.5, 0.25, 0.5]; // index 1 is 6 dB quieter
    const perm = [0, 1, 2].sort(() => Math.random() - 0.5);
    quietSlotRef.current = perm.indexOf(1);
    setOrder(perm);
    setMsg("");

    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const dur = 0.6;
    const gap = 0.25;
    perm.forEach((gainIdx, slot) => {
      const t0 = ctx.currentTime + slot * (dur + gap) + 0.05;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = 1000;
      osc.connect(g).connect(ctx.destination);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(gains[gainIdx], t0 + 0.03);
      g.gain.setValueAtTime(gains[gainIdx], t0 + dur - 0.03);
      g.gain.linearRampToValueAtTime(0, t0 + dur);
      osc.start(t0);
      osc.stop(t0 + dur);
    });
    setPlayed(true);
  }, []);

  const choose = (slot: number) => {
    if (slot === quietSlotRef.current) {
      onPass();
    } else {
      const n = attempts + 1;
      setAttempts(n);
      setPlayed(false);
      setOrder(null);
      setMsg(n >= 3 ? "That's not quite it — you can keep trying." : "Not quite — listen again.");
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Sound &amp; headphone check</h2>
      <p className="text-sm">
        Set your volume to a comfortable level, then press play. You will hear three tones. Select
        the tone that sounded <b>quietest</b>.
      </p>
      <PrimaryButton onClick={play}>{order ? "Play again" : "Play tones"}</PrimaryButton>
      {msg && <p className="text-sm opacity-70">{msg}</p>}
      {played && (
        <div className="flex gap-2">
          {[0, 1, 2].map((slot) => (
            <button
              key={slot}
              onClick={() => choose(slot)}
              className="h-10 w-24 rounded-md border"
              style={{ borderColor: "var(--ring)" }}
            >
              Tone {slot + 1}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function Instructions({ manifest, onStart }: { manifest: Manifest; onStart: () => void }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Instructions</h2>
      <p className="text-sm">
        You will hear synthetic speech clips. For each clip you must <b>listen to the whole thing</b>{" "}
        before you can rate it. You will rate two things:
      </p>
      <ul className="list-disc pl-5 text-sm space-y-1">
        <li>
          <b>Emotion</b> — how strongly the clip conveys a target feeling.
        </li>
        <li>
          <b>Naturalness</b> — how human-like (vs. robotic) it sounds.
        </li>
      </ul>
      <p className="text-sm">The emotions in this study:</p>
      <ul className="list-disc pl-5 text-sm space-y-1">
        {manifest.emotions.map((e) => (
          <li key={e}>
            <b>{e}</b> — {EMOTION_DEFS[e] ?? ""}
          </li>
        ))}
      </ul>
      <p className="text-sm">
        Some items pair two clips and ask which you <b>prefer</b>. There is one attention check.
      </p>
      <PrimaryButton onClick={onStart}>Start</PrimaryButton>
    </section>
  );
}

// --------------------------------------------------------------------------

function TrialRunner({
  trials,
  onRating,
  onAB,
  onAttention,
  onDone,
}: {
  trials: Trial[];
  onRating: (a: RatingAnswer) => void;
  onAB: (a: ABAnswer) => void;
  onAttention: (a: AttentionAnswer) => void;
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const trial = trials[i];
  const last = i === trials.length - 1;
  const trialStart = useRef(Date.now());

  useEffect(() => {
    trialStart.current = Date.now();
  }, [i]);

  const next = () => (last ? onDone() : setI(i + 1));

  return (
    <section className="space-y-4">
      <Progress current={i + 1} total={trials.length} />
      {trial.kind === "rating" && (
        <RatingCard
          key={i}
          trial={trial}
          onSubmit={(emotionMatch, naturalness, plays) => {
            onRating({
              stimId: trial.stim.id,
              method: trial.stim.method,
              emotion: trial.stim.emotion,
              utterance: trial.stim.utterance,
              emotionMatch,
              naturalness,
              plays,
              rtMs: Date.now() - trialStart.current,
            });
            next();
          }}
        />
      )}
      {trial.kind === "attention" && (
        <AttentionCard
          key={i}
          trial={trial}
          onSubmit={(got) => {
            onAttention({
              prompt: trial.prompt,
              expected: trial.answer,
              got,
              pass: got === trial.answer,
            });
            next();
          }}
        />
      )}
      {trial.kind === "ab" && (
        <ABCard
          key={i}
          trial={trial}
          onSubmit={(choice) => {
            onAB({
              pairId: trial.pair.id,
              utterance: trial.pair.utterance,
              emotion: trial.pair.emotion,
              choice,
              aStim: trial.a.id,
              bStim: trial.b.id,
              rtMs: Date.now() - trialStart.current,
            });
            next();
          }}
          last={last}
        />
      )}
    </section>
  );
}

function RatingCard({
  trial,
  onSubmit,
}: {
  trial: Extract<Trial, { kind: "rating" }>;
  onSubmit: (emotionMatch: number, naturalness: number, plays: number) => void;
}) {
  const [plays, setPlays] = useState(0);
  const [emotionMatch, setEmotionMatch] = useState(0);
  const [naturalness, setNaturalness] = useState(0);
  const played = plays > 0;

  return (
    <div className="space-y-4">
      <p className="text-sm opacity-70">Listen to the full clip, then rate it.</p>
      <FullPlayAudio src={trial.stim.file} onEnded={() => setPlays((p) => p + 1)} />
      {trial.ref && (
        <details className="text-sm">
          <summary className="cursor-pointer opacity-70">Optional: neutral reference clip</summary>
          <audio className="mt-2 w-full" controls src={trial.ref.file} controlsList="nodownload" />
        </details>
      )}
      <Scale
        label={`How ${trial.stim.emotion} does this clip sound?`}
        lowLabel="Not at all"
        highLabel={`Very ${trial.stim.emotion}`}
        value={emotionMatch}
        onChange={setEmotionMatch}
        disabled={!played}
      />
      <Scale
        label="How natural (human-like) does it sound?"
        lowLabel="Very robotic"
        highLabel="Very natural"
        value={naturalness}
        onChange={setNaturalness}
        disabled={!played}
      />
      {!played && <p className="text-xs opacity-60">Play the clip to the end to enable ratings.</p>}
      <PrimaryButton
        disabled={!played || !emotionMatch || !naturalness}
        onClick={() => onSubmit(emotionMatch, naturalness, plays)}
      >
        Next
      </PrimaryButton>
    </div>
  );
}

function AttentionCard({
  trial,
  onSubmit,
}: {
  trial: Extract<Trial, { kind: "attention" }>;
  onSubmit: (got: number) => void;
}) {
  const [val, setVal] = useState(0);
  return (
    <div className="space-y-4">
      <Scale
        label={trial.prompt}
        lowLabel="1"
        highLabel="5"
        value={val}
        onChange={setVal}
        disabled={false}
      />
      <PrimaryButton disabled={!val} onClick={() => onSubmit(val)}>
        Next
      </PrimaryButton>
    </div>
  );
}

function ABCard({
  trial,
  onSubmit,
  last,
}: {
  trial: Extract<Trial, { kind: "ab" }>;
  onSubmit: (choice: "a" | "b") => void;
  last: boolean;
}) {
  const [playedA, setPlayedA] = useState(false);
  const [playedB, setPlayedB] = useState(false);
  const [choice, setChoice] = useState<"a" | "b" | null>(null);
  const both = playedA && playedB;

  return (
    <div className="space-y-4">
      <p className="text-sm">
        Both clips try to sound <b>{trial.pair.emotion}</b>. Listen to both, then choose the one
        that sounds more {trial.pair.emotion} <i>and</i> more natural.
      </p>
      <div className="space-y-3">
        <div>
          <div className="text-sm font-semibold mb-1">Clip A</div>
          <FullPlayAudio src={trial.a.file} onEnded={() => setPlayedA(true)} />
        </div>
        <div>
          <div className="text-sm font-semibold mb-1">Clip B</div>
          <FullPlayAudio src={trial.b.file} onEnded={() => setPlayedB(true)} />
        </div>
      </div>
      <div className="flex gap-2">
        {(["a", "b"] as const).map((c) => (
          <button
            key={c}
            disabled={!both}
            onClick={() => setChoice(c)}
            className="h-10 flex-1 rounded-md border disabled:opacity-40"
            style={{
              borderColor: "var(--ring)",
              background: choice === c ? "var(--fg)" : "transparent",
              color: choice === c ? "var(--bg)" : "var(--fg)",
            }}
          >
            Prefer {c.toUpperCase()}
          </button>
        ))}
      </div>
      {!both && <p className="text-xs opacity-60">Play both clips to the end to choose.</p>}
      <PrimaryButton disabled={!choice} onClick={() => choice && onSubmit(choice)}>
        {last ? "Finish" : "Next"}
      </PrimaryButton>
    </div>
  );
}

// --------------------------------------------------------------------------

function Done({ preview, submitError }: { preview: boolean; submitError: string }) {
  const [countdown, setCountdown] = useState(4);
  useEffect(() => {
    if (preview) return;
    if (countdown <= 0) {
      window.location.href = PROLIFIC_COMPLETION_URL;
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, preview]);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Thank you!</h2>
      {submitError ? (
        <div className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: "var(--ring)" }}>
          <b>Heads up:</b> your responses may not have saved ({submitError}). If you are a
          participant, please message the researcher.
        </div>
      ) : (
        <p className="text-sm">Your responses were recorded.</p>
      )}
      {preview ? (
        <p className="text-sm opacity-70">
          Preview mode — no Prolific redirect. Add <code>?PROLIFIC_PID=test</code> to simulate a
          real participant.
        </p>
      ) : (
        <p className="text-sm">
          Returning you to Prolific in {countdown}s.{" "}
          <a className="underline" href={PROLIFIC_COMPLETION_URL}>
            Click here
          </a>{" "}
          if you are not redirected.
        </p>
      )}
    </section>
  );
}

// --- Small reusable UI ----------------------------------------------------

function Progress({ current, total }: { current: number; total: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs opacity-70 mb-1">
        <span>
          Item {current} of {total}
        </span>
        <span>{Math.round((current / total) * 100)}%</span>
      </div>
      <div className="h-1.5 w-full rounded" style={{ background: "var(--track)" }}>
        <div
          className="h-1.5 rounded"
          style={{ width: `${(current / total) * 100}%`, background: "var(--thumb)" }}
        />
      </div>
    </div>
  );
}

function Scale({
  label,
  lowLabel,
  highLabel,
  value,
  onChange,
  disabled,
}: {
  label: string;
  lowLabel: string;
  highLabel: string;
  value: number;
  onChange: (n: number) => void;
  disabled: boolean;
}) {
  return (
    <div className={disabled ? "opacity-40" : ""}>
      <div className="text-sm font-medium mb-2">{label}</div>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            disabled={disabled}
            onClick={() => onChange(n)}
            className="h-10 w-10 rounded-md border"
            style={{
              borderColor: "var(--ring)",
              background: value === n ? "var(--fg)" : "transparent",
              color: value === n ? "var(--bg)" : "var(--fg)",
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs opacity-60 mt-1">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

// <audio> that reports when it has been played to the end. (Seeking isn't blocked here — good
// enough for a toy; a real run would disable the scrubber to force a genuine full listen.)
function FullPlayAudio({ src, onEnded }: { src: string; onEnded: () => void }) {
  return (
    <audio className="w-full" controls src={src} onEnded={onEnded} controlsList="nodownload" />
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-40"
      style={{ background: "var(--fg)", color: "var(--bg)" }}
    >
      {children}
    </button>
  );
}
