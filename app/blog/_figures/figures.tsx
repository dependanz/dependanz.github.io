"use client";

// Draft-side figure hydrator. The draft viewer renders Markdown as a static HTML string (no React),
// so a ```figure code block arrives as <pre><code class="language-figure">. This scans for those,
// replaces each with a mounted FigureMount, giving drafts the same interactive figures as published
// MDX posts (which resolve figures through mdx-components instead). Renders nothing itself.

import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import FigureMount from "./figure-mount";

export default function Figures() {
  useEffect(() => {
    const host = document.querySelector(".blog-prose");
    if (!host) return;
    const codes = Array.from(host.querySelectorAll<HTMLElement>("pre > code.language-figure"));
    codes.forEach((code) => {
      const pre = code.parentElement;
      if (!pre) return;
      const spec = code.textContent ?? "";
      const container = document.createElement("div");
      container.className = "blog-figure";
      pre.replaceWith(container);
      createRoot(container).render(<FigureMount spec={spec} />);
    });
    // Deliberately no cleanup unmount. React StrictMode (on in Next dev) runs effects twice; the
    // second pass finds the code blocks already replaced, so unmounting here would tear down a
    // figure the second pass can't recreate — leaving an empty box. When the article unmounts,
    // React removes these containers with it and the orphaned roots are garbage-collected.
  }, []);

  return null;
}
