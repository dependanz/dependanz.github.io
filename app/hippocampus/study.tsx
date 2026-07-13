"use client";

// Review + quiz surfaces. Pure presentation over the vendored engine: StudySession walks a queue
// (built by core's buildQueue/practiceDeck) and reports each grade up; QuizSession runs core's
// makeQuiz. Keyboard: space/enter flips, 1-4 grade, Esc exits.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Card, Grade, QueueCard } from "./core";
import { makeQuiz, type QuizQuestion } from "./core";
import { ACCENT, Btn } from "./ui";

const GRADES: { key: Grade; label: string; color: string; hint: string }[] = [
  { key: "again", label: "Again", color: "#ef4444", hint: "1" },
  { key: "hard", label: "Hard", color: "#f59e0b", hint: "2" },
  { key: "good", label: "Good", color: "#22c55e", hint: "3" },
  { key: "easy", label: "Easy", color: "#3b82f6", hint: "4" }
];

function Breakdown({ card }: { card: Card }) {
  if (!card.breakdown?.length) return null;
  return (
    <table style={{ margin: "16px auto 0", borderCollapse: "collapse", fontSize: 14 }}>
      <tbody>
        {card.breakdown.map((tok, i) => (
          <tr key={i} style={{ borderTop: i ? "1px solid var(--ring)" : "none" }}>
            <td style={{ padding: "4px 12px", textAlign: "right", fontWeight: 600 }}>{tok.token}</td>
            <td style={{ padding: "4px 12px", opacity: 0.7 }}>{tok.reading ?? ""}</td>
            <td style={{ padding: "4px 12px", textAlign: "left" }}>{tok.gloss}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function StudySession({
  cards,
  title,
  onGrade,
  onExit
}: {
  cards: QueueCard[];
  title: string;
  onGrade: (cardId: string, grade: Grade) => void;
  onExit: () => void;
}) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[i];

  const grade = useCallback(
    (g: Grade) => {
      if (!card) return;
      onGrade(card.id, g);
      setFlipped(false);
      setI((n) => n + 1);
    },
    [card, onGrade]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onExit();
      if (!card) return;
      if (!flipped && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setFlipped(true);
      } else if (flipped) {
        const idx = ["1", "2", "3", "4"].indexOf(e.key);
        if (idx >= 0) {
          e.preventDefault();
          grade(GRADES[idx].key);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card, flipped, grade, onExit]);

  if (cards.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <p style={{ fontSize: 18, marginBottom: 16 }}>Nothing to study here right now. 🎉</p>
        <Btn onClick={onExit}>Back to dashboard</Btn>
      </div>
    );
  }

  if (!card) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <p style={{ fontSize: 22, marginBottom: 8 }}>Session complete</p>
        <p style={{ opacity: 0.7, marginBottom: 20 }}>
          Reviewed {cards.length} card{cards.length === 1 ? "" : "s"}. Sync to save your progress.
        </p>
        <Btn variant="primary" onClick={onExit}>
          Back to dashboard
        </Btn>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 13, opacity: 0.7 }}>{title}</span>
        <span style={{ fontSize: 13, opacity: 0.7 }}>
          {i + 1} / {cards.length}
        </span>
      </div>
      {/* progress bar */}
      <div style={{ height: 4, borderRadius: 4, background: "var(--ring)", marginBottom: 28 }}>
        <div style={{ height: "100%", width: `${(i / cards.length) * 100}%`, background: ACCENT, borderRadius: 4, transition: "width 200ms ease" }} />
      </div>

      <div
        onClick={() => !flipped && setFlipped(true)}
        style={{
          border: "1px solid var(--ring)",
          borderRadius: 16,
          padding: "40px 24px",
          textAlign: "center",
          minHeight: 220,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          cursor: flipped ? "default" : "pointer",
          userSelect: "none"
        }}
      >
        <div style={{ fontSize: 44, lineHeight: 1.3, wordBreak: "break-word" }}>{card.front}</div>

        {flipped ? (
          <>
            {/* reading is part of the answer (it's the whole point for kana/letter cards), so it only appears on flip */}
            {card.reading && <div style={{ fontSize: 20, opacity: 0.75, marginTop: 10 }}>{card.reading}</div>}
            <div style={{ height: 1, background: "var(--ring)", margin: "20px auto", width: "60%" }} />
            <div style={{ fontSize: 24, fontWeight: 600 }}>{card.meaning}</div>
            {card.romaji && <div style={{ fontSize: 14, opacity: 0.6, marginTop: 4, fontStyle: "italic" }}>{card.romaji}</div>}
            <Breakdown card={card} />
            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.5 }}>
              {card.deck}
              {card.unit ? ` · ${card.unit}` : ""}
              {card.isNew ? " · new" : ""}
            </div>
          </>
        ) : (
          <div style={{ marginTop: 28, fontSize: 13, opacity: 0.5 }}>tap or press space to flip</div>
        )}
      </div>

      {flipped && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 20 }}>
          {GRADES.map((g) => (
            <button
              key={g.key}
              onClick={() => grade(g.key)}
              style={{
                padding: "12px 8px",
                borderRadius: 10,
                border: "none",
                background: g.color,
                color: "#fff",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600
              }}
            >
              {g.label}
              <span style={{ display: "block", fontSize: 10, opacity: 0.75, fontWeight: 400 }}>{g.hint}</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <Btn onClick={onExit} style={{ fontSize: 13 }}>
          Exit session (Esc)
        </Btn>
      </div>
    </div>
  );
}

export function QuizSession({ cards, lang, onExit }: { cards: Card[]; lang?: string; onExit: () => void }) {
  const [q, setQ] = useState<QuizQuestion | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });

  const next = useCallback(() => {
    setPicked(null);
    setQ(makeQuiz(cards, lang));
  }, [cards, lang]);

  useEffect(() => {
    next();
  }, [next]);

  const canQuiz = useMemo(() => cards.filter((c) => c.meaning && c.status !== "needs_gloss").length >= 2, [cards]);

  if (!canQuiz || !q) {
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <p style={{ fontSize: 18, marginBottom: 16 }}>Need at least 2 glossed cards to quiz.</p>
        <Btn onClick={onExit}>Back to dashboard</Btn>
      </div>
    );
  }

  const answered = picked !== null;
  const choose = (choice: string) => {
    if (answered) return;
    setPicked(choice);
    setScore((s) => ({ right: s.right + (choice === q.answer ? 1 : 0), total: s.total + 1 }));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, fontSize: 13, opacity: 0.7 }}>
        <span>Quiz — pick the meaning</span>
        <span>
          {score.right} / {score.total}
        </span>
      </div>

      <div style={{ textAlign: "center", marginBottom: 24 }}>
        {/* prompt only — the reading would give the answer away for kana/letter cards */}
        <div style={{ fontSize: 44 }}>{q.prompt}</div>
      </div>

      <div style={{ display: "grid", gap: 10, maxWidth: 460, margin: "0 auto" }}>
        {q.choices.map((choice) => {
          const isAnswer = choice === q.answer;
          const isPicked = choice === picked;
          let bg = "transparent";
          let border = "1px solid var(--ring)";
          if (answered && isAnswer) {
            bg = "#22c55e";
            border = "1px solid #22c55e";
          } else if (answered && isPicked) {
            bg = "#ef4444";
            border = "1px solid #ef4444";
          }
          return (
            <button
              key={choice}
              onClick={() => choose(choice)}
              disabled={answered}
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                border,
                background: bg,
                color: answered && (isAnswer || isPicked) ? "#fff" : "var(--fg)",
                cursor: answered ? "default" : "pointer",
                fontSize: 15,
                textAlign: "left"
              }}
            >
              {choice}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 24 }}>
        {answered && (
          <Btn variant="primary" onClick={next}>
            Next →
          </Btn>
        )}
        <Btn onClick={onExit}>Exit quiz</Btn>
      </div>
    </div>
  );
}
