"use client";

// Study dashboard: per-deck tiles (from core.summarize) plus entry points into the daily queue,
// a per-deck cram, and quiz mode. Pure presentation — the orchestrator owns the data + actions.

import React, { useMemo } from "react";
import type { DeckSummary, ValidationIssue } from "./core";
import { ACCENT, Btn, Chip, Panel } from "./ui";

const LANG_NAME: Record<string, string> = { ja: "Japanese", ko: "Korean" };

function langLabel(lang: string) {
  return LANG_NAME[lang] ?? lang;
}

export function Dashboard({
  summaries,
  warnings,
  onDaily,
  onCram,
  onManage,
  onQuiz
}: {
  summaries: DeckSummary[];
  warnings: ValidationIssue[];
  onDaily: () => void;
  onCram: (deck: string) => void;
  onManage: (deck: string) => void;
  onQuiz: () => void;
}) {
  const totals = useMemo(
    () =>
      summaries.reduce(
        (acc, s) => ({
          due: acc.due + s.due,
          fresh: acc.fresh + s.fresh,
          pending: acc.pending + s.pending,
          total: acc.total + s.total
        }),
        { due: 0, fresh: 0, pending: 0, total: 0 }
      ),
    [summaries]
  );

  const nothingToday = totals.due === 0 && totals.fresh === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Today's queue */}
      <Panel>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Today</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Chip label="due" value={totals.due} tone={totals.due ? ACCENT : undefined} />
              <Chip label="new" value={totals.fresh} />
              <Chip label="pending" value={totals.pending} />
              <Chip label="cards" value={totals.total} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="primary" onClick={onDaily} disabled={nothingToday}>
              {nothingToday ? "All caught up" : "Start daily review"}
            </Btn>
            <Btn onClick={onQuiz}>Quiz</Btn>
          </div>
        </div>
      </Panel>

      {/* Deck tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {summaries.map((s) => (
          <Panel key={s.deck} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 14 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontWeight: 600, wordBreak: "break-word" }}>{s.deck}</span>
                <span style={{ fontSize: 11, opacity: 0.6 }}>{langLabel(s.lang)}</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                <Chip label="due" value={s.due} tone={s.due ? ACCENT : undefined} />
                <Chip label="new" value={s.fresh} />
                {s.pending > 0 && <Chip label="pending" value={s.pending} />}
                <Chip label="total" value={s.total} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => onCram(s.deck)} style={{ fontSize: 13, flex: 1 }}>
                Cram
              </Btn>
              <Btn onClick={() => onManage(s.deck)} style={{ fontSize: 13, flex: 1 }}>
                Manage
              </Btn>
            </div>
          </Panel>
        ))}
      </div>

      {warnings.length > 0 && (
        <details>
          <summary style={{ cursor: "pointer", fontSize: 13, opacity: 0.7 }}>
            {warnings.length} format warning{warnings.length === 1 ? "" : "s"} (non-blocking)
          </summary>
          <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 12, opacity: 0.75, lineHeight: 1.7 }}>
            {warnings.slice(0, 40).map((w, i) => (
              <li key={i}>
                <code>{w.where}</code> — {w.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
