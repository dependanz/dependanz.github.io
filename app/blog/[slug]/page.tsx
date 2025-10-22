import Header from "@/app/ui/header";
import fs from "fs";
import path from "path";

type Params = Promise<{ slug: string }>;

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const { default: Post } = await import(`@/app/blog/posts/${slug}.mdx`);

  return (
    <>
      <Header pageName="blog" />
      <div className="mt-10">
        <Post />
      </div>
    </>
  );
}

type StaticParams = { slug: string };

export function generateStaticParams(): StaticParams[] {
  const postsDirectory = path.join(process.cwd(), "app/blog/posts");
  const fileNames = fs.readdirSync(postsDirectory);

  return fileNames
    .filter((fileName) => fileName.endsWith(".mdx"))
    .map((fileName) => ({
      slug: fileName.replace(/\.mdx$/, ""),
    }));
}

export const dynamicParams = false;
