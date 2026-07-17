"use client";

// Resolves a figure spec (the body of a ```figure code block) to a registered component. The spec
// is either a bare figure id or JSON with an `id` plus props. Shared by both render paths.

import { figureRegistry } from "./registry";

export default function FigureMount({ spec }: { spec: string }) {
  const text = (spec ?? "").trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { id: text };
  }
  const id = typeof parsed.id === "string" ? parsed.id : "";
  const Comp = figureRegistry[id];
  if (!Comp) {
    return <div className="blog-figure-missing">Unknown figure: {id || "(none)"}</div>;
  }
  const { id: _omit, ...props } = parsed;
  return <Comp {...props} />;
}
