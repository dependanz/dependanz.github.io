"use client";

// Turns GFM footnote references (our citations) into hover cards, like the [n] citations on
// transformer-circuits.pub: hovering a bracketed [n] pops a small card with the reference text.
// Used by both the draft viewer (/blog/admin) and published posts (/blog/[slug]) so the behavior
// is identical. Renders nothing itself — it just wires listeners onto the already-rendered links.

import { useEffect } from "react";

export default function FootnoteHover() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".blog-prose");
    if (!root) return;
    const refs = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[data-footnote-ref]"));
    let tip: HTMLDivElement | null = null;

    const clear = () => {
      tip?.remove();
      tip = null;
    };

    const onEnter = (e: Event) => {
      const a = e.currentTarget as HTMLAnchorElement;
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      const target = document.getElementById(decodeURIComponent(href.slice(1)));
      if (!target) return;
      clear();
      const clone = target.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("a[data-footnote-backref], .data-footnote-backref").forEach((n) => n.remove());
      tip = document.createElement("div");
      tip.className = "cite-tooltip";
      tip.innerHTML = clone.innerHTML;
      tip.style.visibility = "hidden";
      document.body.appendChild(tip);

      // Position above the marker, or below if there isn't room; clamp to the viewport.
      const r = a.getBoundingClientRect();
      const t = tip.getBoundingClientRect();
      const m = 8;
      let top = r.top - t.height - m;
      if (top < m) top = r.bottom + m;
      const left = Math.min(Math.max(m, r.left), window.innerWidth - t.width - m);
      tip.style.top = `${top}px`;
      tip.style.left = `${left}px`;
      tip.style.visibility = "visible";
    };

    refs.forEach((a) => {
      a.addEventListener("mouseenter", onEnter);
      a.addEventListener("mouseleave", clear);
    });
    return () => {
      refs.forEach((a) => {
        a.removeEventListener("mouseenter", onEnter);
        a.removeEventListener("mouseleave", clear);
      });
      clear();
    };
  }, []);

  return null;
}
