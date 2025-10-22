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
  });
};
