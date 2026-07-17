// Registry of interactive figures usable in blog posts. Reference one from Markdown with a fenced
// code block tagged `figure` whose body is the figure id (or JSON with an `id` + props), e.g.:
//
//     ```figure
//     { "id": "forgetting-curve", "stability": 8, "retention": 0.9 }
//     ```
//
// Add a new figure by dropping a client component here. Both the draft viewer (via figures.tsx) and
// published MDX posts (via mdx-components.tsx) resolve figures through this same map.

import type { ComponentType } from "react";
import ForgettingCurve from "./forgetting-curve";

export const figureRegistry: Record<string, ComponentType<Record<string, unknown>>> = {
  "forgetting-curve": ForgettingCurve as ComponentType<Record<string, unknown>>
};
