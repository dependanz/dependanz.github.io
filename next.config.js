/** @type {import('next').NextConfig | (() => Promise<import('next').NextConfig>)} */
module.exports = async function () {
  const { default: createMDX } = await import("@next/mdx");
  const { default: remarkMath } = await import("remark-math");
  const { default: rehypeKatex } = await import("rehype-katex");

  const withMDX = createMDX({
    extension: /\.mdx?$/,
    options: {
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    },
  });

  return withMDX({
    pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
    output: "export",
    images: {
      unoptimized: true,
    },
    // kuromoji (used by /hippocampus for offline Japanese readings) has a browser build that
    // conditionally requires Node's `fs`/`path`; stub them so the client bundle compiles.
    webpack: (config) => {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false };
      return config;
    },
  });
};
