// Client-side Markdown -> HTML renderer for drafts. Uses the same remark/rehype/KaTeX stack as the
// build, so a draft renders the same in the browser as it will once published. The heavy plugins
// are dynamically imported so they only load on the route that actually views drafts
// (/blog/admin), never in the main bundle.

export async function renderMarkdown(md: string): Promise<string> {
  const [{ unified }, remarkParse, remarkGfm, remarkMath, remarkRehype, rehypeKatex, rehypeStringify] = await Promise.all([
    import("unified"),
    import("remark-parse"),
    import("remark-gfm"),
    import("remark-math"),
    import("remark-rehype"),
    import("rehype-katex"),
    import("rehype-stringify")
  ]);
  const file = await unified()
    .use(remarkParse.default)
    .use(remarkGfm.default) // footnotes (citations), tables, strikethrough
    .use(remarkMath.default)
    .use(remarkRehype.default)
    .use(rehypeKatex.default)
    .use(rehypeStringify.default)
    .process(md);
  return String(file);
}
