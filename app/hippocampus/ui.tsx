"use client";

// Small shared UI primitives for the Hippocampus page. Colors come from the site's theme vars
// (--fg / --bg / --ring, set by app/providers.tsx) so light/dark just works. One restrained accent.

import React from "react";

export const ACCENT = "#6366f1"; // indigo — the single accent the brief asks for

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Btn({ variant = "ghost", style, disabled, ...rest }: BtnProps) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "8px 16px",
    borderRadius: 10,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "background-color 150ms ease, border-color 150ms ease, opacity 150ms ease",
    border: "1px solid var(--ring)",
    background: variant === "primary" ? ACCENT : "transparent",
    color: variant === "primary" ? "#fff" : "var(--fg)",
    ...style
  };
  return <button {...rest} disabled={disabled} style={base} />;
}

export function Panel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        border: "1px solid var(--ring)",
        borderRadius: 14,
        padding: 20,
        background: "color-mix(in srgb, var(--fg) 3%, transparent)",
        ...style
      }}
    >
      {children}
    </div>
  );
}

/** A labelled count chip (due / new / pending / total). */
export function Chip({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <span
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        border: "1px solid var(--ring)",
        color: tone ?? "var(--fg)"
      }}
    >
      <strong style={{ fontSize: 14 }}>{value}</strong>
      <span style={{ opacity: 0.7 }}>{label}</span>
    </span>
  );
}
