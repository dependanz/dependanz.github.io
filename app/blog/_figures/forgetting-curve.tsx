"use client";

// Interactive forgetting-curve figure for the SM-2/FSRS post. Dependency-free SVG so it stays tiny
// and theme-aware (all colors are CSS vars). Drag the sliders to change memory stability and target
// retention; hover the plot to read (day, recall%) off the curve. R(t) = 1 / (1 + t / (9S)).

import { useState, type MouseEvent } from "react";

export default function ForgettingCurve({
  stability = 8,
  retention = 0.9
}: {
  stability?: number;
  retention?: number;
}) {
  const [S, setS] = useState(stability);
  const [r, setR] = useState(retention);
  const [hoverT, setHoverT] = useState<number | null>(null);

  const W = 600;
  const H = 320;
  const m = { l: 46, r: 16, t: 16, b: 40 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;

  const xMax = Math.max(30, Math.round(S * 4));
  const Rt = (t: number) => 1 / (1 + t / (9 * S));
  const px = (t: number) => m.l + (t / xMax) * pw;
  const py = (R: number) => m.t + (1 - R) * ph;
  const tOfPx = (x: number) => Math.max(0, Math.min(xMax, ((x - m.l) / pw) * xMax));

  const N = 140;
  const path = Array.from({ length: N + 1 }, (_, i) => {
    const t = (i / N) * xMax;
    return `${i === 0 ? "M" : "L"} ${px(t).toFixed(1)} ${py(Rt(t)).toFixed(1)}`;
  }).join(" ");

  // FSRS interval for the chosen target retention r: solve R(t) = r  ->  t = 9S(1/r - 1).
  const tStar = 9 * S * (1 / r - 1);
  const hoverR = hoverT != null ? Rt(hoverT) : null;

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverT(tOfPx(((e.clientX - rect.left) / rect.width) * W));
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 0.9, 1];
  const xTicks = [0, xMax / 4, xMax / 2, (3 * xMax) / 4, xMax];

  return (
    <div className="fig">
      <svg viewBox={`0 0 ${W} ${H}`} className="fig-svg" onMouseMove={onMove} onMouseLeave={() => setHoverT(null)}>
        {yTicks.map((v) => (
          <g key={`y${v}`}>
            <line x1={m.l} x2={W - m.r} y1={py(v)} y2={py(v)} className="fig-grid" />
            <text x={m.l - 8} y={py(v) + 4} className="fig-axislabel" textAnchor="end">
              {Math.round(v * 100)}%
            </text>
          </g>
        ))}
        {xTicks.map((v) => (
          <text key={`x${v}`} x={px(v)} y={H - m.b + 22} className="fig-axislabel" textAnchor="middle">
            {Math.round(v)}d
          </text>
        ))}

        {/* target-retention line + the interval FSRS would schedule to hit it */}
        <line x1={m.l} x2={W - m.r} y1={py(r)} y2={py(r)} className="fig-target" />
        {tStar <= xMax && (
          <>
            <line x1={px(tStar)} x2={px(tStar)} y1={py(r)} y2={H - m.b} className="fig-target" />
            <circle cx={px(tStar)} cy={py(r)} r={4} className="fig-target-dot" />
          </>
        )}

        <path d={path} className="fig-curve" fill="none" />

        {hoverT != null && hoverR != null && (
          <>
            <line x1={px(hoverT)} x2={px(hoverT)} y1={m.t} y2={H - m.b} className="fig-hover" />
            <circle cx={px(hoverT)} cy={py(hoverR)} r={4} className="fig-hover-dot" />
          </>
        )}
      </svg>

      <div className="fig-readout">
        {hoverT != null && hoverR != null ? (
          <>
            day <b>{hoverT.toFixed(1)}</b> → <b>{Math.round(hoverR * 100)}%</b> chance of recall
          </>
        ) : (
          <>
            To keep <b>{Math.round(r * 100)}%</b> retention at stability <b>{S}d</b>, schedule the next review in{" "}
            <b>{tStar.toFixed(1)} days</b>.
          </>
        )}
      </div>

      <div className="fig-controls">
        <label>
          stability S: {S} days
          <input type="range" min={1} max={40} step={1} value={S} onChange={(e) => setS(+e.target.value)} />
        </label>
        <label>
          target retention: {Math.round(r * 100)}%
          <input type="range" min={70} max={98} step={1} value={Math.round(r * 100)} onChange={(e) => setR(+e.target.value / 100)} />
        </label>
      </div>
    </div>
  );
}
