/** @type {import('next').NextConfig | (() => Promise<import('next').NextConfig>)} */
module.exports = async function () {
  const { default: createMDX } = await import("@next/mdx");
  const { default: remarkGfm } = await import("remark-gfm");
  const { default: remarkMath } = await import("remark-math");
  const { default: rehypeKatex } = await import("rehype-katex");

  const withMDX = createMDX({
    extension: /\.mdx?$/,
    options: {
      // remark-gfm gives footnotes (used for [^n] citations), tables, and strikethrough — so a
      // published post matches its draft preview (which uses the same plugins in render.ts).
      remarkPlugins: [remarkGfm, remarkMath],
      rehypePlugins: [rehypeKatex],
    },
  });

  return withMDX({
    pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
    // No `output: "export"` — this site now runs as a real Node server (`next start`) on a VPS,
    // which unlocks server components, API routes, and server-held secrets. (On GitHub Pages this
    // was a static export.) `images.unoptimized` is kept so we don't need `sharp` on the box yet;
    // drop it later to enable server-side next/image optimization.
    images: {
      unoptimized: true,
    },
  });
};
