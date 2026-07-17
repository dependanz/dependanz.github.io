import Header from "@/app/ui/header";
import FootnoteHover from "@/app/blog/_drafts/footnote-hover";
import fs from "fs";
import path from "path";

type Params = Promise<{ slug: string }>;

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const { default: Post } = await import(`@/app/blog/posts/${slug}.mdx`);

  return (
    <>
      <Header pageName="blog" />
      <article className="blog-prose mx-auto max-w-2xl px-4 mt-10 pb-16">
        <Post />
      </article>
      <FootnoteHover />
    </>
  );
}

type StaticParams = { slug: string };

export async function generateStaticParams(): Promise<StaticParams[]> {
  const postsDirectory = path.join(process.cwd(), "app/blog/posts");
  const fileNames = fs.readdirSync(postsDirectory).filter((fileName) => fileName.endsWith(".mdx"));

  const params = await Promise.all(
    fileNames.map(async (fileName) => {
      const slug = fileName.replace(/\.mdx$/, "");
      const { meta } = await import(`@/app/blog/posts/${slug}.mdx`);
      return { slug, published: meta?.published !== false };
    })
  );

  // Drafts (published: false) get no public /blog/<slug> page — preview them at /blog/admin.
  return params.filter((p) => p.published).map(({ slug }) => ({ slug }));
}

export const dynamicParams = false;
