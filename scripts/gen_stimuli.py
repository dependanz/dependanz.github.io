#!/usr/bin/env python3
"""Generate PLACEHOLDER emotional-voice-conversion stimuli for the /surveys/evc-pilot toy study.

These are NOT real EVC outputs. They are TTS clips whose only purpose is to exercise the
survey + Prolific + Supabase pipeline end to end with something audible and controllable.

How the placeholder "methods" and "emotions" are faked (honestly, with knobs the free
edge-tts endpoint actually supports -- pitch/rate/volume, NOT the locked express-as styles):
  * method  -> a distinct neural VOICE (m1=Aria, m2=Guy). In a REAL EVC eval the speaker is
               held constant and the *algorithm* varies; here distinct voices just make the
               A/B non-degenerate so you can see preference data flow.
  * emotion -> a prosody preset (pitch/rate). "happy" = higher+faster, "sad" = lower+slower.

The --announce flag prepends a spoken carrier ("This is method one, happy. <utterance>").
That is great for eyeballing the pipeline but DEFEATS blind rating -- turn it OFF (--no-announce)
before any run whose emotion/naturalness numbers you actually care about.

Usage:
    pip install edge-tts
    python scripts/gen_stimuli.py                # announce ON (placeholder/debug default)
    python scripts/gen_stimuli.py --no-announce  # blind stimuli

Outputs mp3 clips + manifest.json to public/audio/surveys/evc-pilot/.
The survey page fetches that manifest at runtime (static asset -- no rebuild needed to refresh).
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "public" / "audio" / "surveys" / "evc-pilot"
# Path as referenced by the browser (public/ is the web root on GitHub Pages).
WEB_PREFIX = "/audio/surveys/evc-pilot"

# method id -> neural voice
METHODS = {
    "m1": "en-US-AriaNeural",
    "m2": "en-US-GuyNeural",
}
REFERENCE_VOICE = "en-US-AriaNeural"

# emotion id -> prosody preset (only knobs edge-tts reliably honors)
EMOTIONS = {
    "neutral": {"rate": "+0%", "pitch": "+0Hz"},
    "happy": {"rate": "+15%", "pitch": "+50Hz"},
    "sad": {"rate": "-15%", "pitch": "-50Hz"},
}
TARGET_EMOTIONS = ["happy", "sad"]  # neutral is the reference, not a target

# Semantically neutral sentences so the CONTENT does not cue the emotion.
UTTERANCES = {
    "u1": "The stone walls of the old house kept the rooms cool.",
    "u2": "She placed the folders on the desk by the window.",
    "u3": "They walked along the road until it turned to gravel.",
}

METHOD_LABEL = {"m1": "method one", "m2": "method two"}


def carrier(method: str | None, emotion: str, utterance_text: str, announce: bool) -> str:
    if not announce:
        return utterance_text
    who = f"This is {METHOD_LABEL[method]}, " if method else "This is the reference, "
    return f"{who}{emotion}. {utterance_text}"


async def synth(voice: str, emotion: str, text: str, out_path: Path) -> None:
    import edge_tts

    preset = EMOTIONS[emotion]
    comm = edge_tts.Communicate(text, voice, rate=preset["rate"], pitch=preset["pitch"])
    await comm.save(str(out_path))


async def main_async(announce: bool) -> None:
    try:
        import edge_tts  # noqa: F401
    except ImportError:
        sys.exit("edge-tts not installed. Run:  pip install edge-tts")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    stimuli: list[dict] = []
    references: list[dict] = []
    ab_pairs: list[dict] = []

    # Neutral references (one per utterance) -- the anchor listeners hear alongside converted clips.
    for uid, text in UTTERANCES.items():
        sid = f"neutral_{uid}"
        fname = f"{sid}.mp3"
        print(f"  ref  {sid}")
        await synth(REFERENCE_VOICE, "neutral", carrier(None, "neutral", text, announce), OUT_DIR / fname)
        references.append(
            {"id": sid, "emotion": "neutral", "utterance": uid, "text": text, "file": f"{WEB_PREFIX}/{fname}"}
        )

    # Converted clips: method x target-emotion x utterance.
    for method, voice in METHODS.items():
        for emotion in TARGET_EMOTIONS:
            for uid, text in UTTERANCES.items():
                sid = f"{method}_{emotion}_{uid}"
                fname = f"{sid}.mp3"
                print(f"  stim {sid}")
                await synth(voice, emotion, carrier(method, emotion, text, announce), OUT_DIR / fname)
                stimuli.append(
                    {
                        "id": sid,
                        "method": method,
                        "emotion": emotion,
                        "utterance": uid,
                        "text": text,
                        "file": f"{WEB_PREFIX}/{fname}",
                    }
                )

    # A/B preference pairs: same utterance + emotion, m1 vs m2.
    for emotion in TARGET_EMOTIONS:
        for uid in UTTERANCES:
            ab_pairs.append(
                {
                    "id": f"ab_{emotion}_{uid}",
                    "utterance": uid,
                    "emotion": emotion,
                    "a": f"m1_{emotion}_{uid}",
                    "b": f"m2_{emotion}_{uid}",
                }
            )

    manifest = {
        "survey": "evc-pilot",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "announce": announce,
        "methods": list(METHODS.keys()),
        "emotions": TARGET_EMOTIONS,
        "utterances": UTTERANCES,
        "stimuli": stimuli,
        "references": references,
        "ab_pairs": ab_pairs,
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(
        f"\nWrote {len(stimuli)} stimuli + {len(references)} references + "
        f"{len(ab_pairs)} A/B pairs to {OUT_DIR}"
    )
    if announce:
        print("NOTE: --announce is ON. Clips say the method/emotion out loud -- fine for a "
              "pipeline test, but re-run with --no-announce for real blind ratings.")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    grp = p.add_mutually_exclusive_group()
    grp.add_argument("--announce", dest="announce", action="store_true", help="prepend spoken method/emotion carrier (default)")
    grp.add_argument("--no-announce", dest="announce", action="store_false", help="blind stimuli, utterance only")
    p.set_defaults(announce=True)
    args = p.parse_args()
    asyncio.run(main_async(args.announce))


if __name__ == "__main__":
    main()
