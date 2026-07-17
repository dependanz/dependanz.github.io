import Link from "next/link";
import Footer from "../ui/footer";
import Header from "../ui/header";
import fs from "fs";
import path from "path";

async function BlogContainer() {

  const postsDirectory = path.join(process.cwd(), 'app/blog/posts');
  const fileNames = fs.readdirSync(postsDirectory);

  const posts = await Promise.all(
    fileNames
      .filter(fileName => fileName.endsWith('.mdx'))
      .map(async fileName => {
        const slug = fileName.replace(/\.mdx$/, '');
        const module = await import(`@/app/blog/posts/${slug}.mdx`);
        const { meta } = module;
        return {
          slug,
          ...meta
        };
      })
  );

  const published = posts.filter((post) => post.published !== false); // hide drafts (published: false)
  published.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date descending

  return (
    <div className="m-3">
      <ul>
        {published.map(post => {
          const href = `/blog/${post.slug}`;
          return (
            <li
              key={post.slug}
              className="border border-[color:var(--ring)] rounded-md transition-shadow duration-300 shadow-[0_0_0_0_var(--shadow-inactive)] hover:shadow-[0_12px_30px_var(--shadow-active)]"
            >
              <Link href={href} className="block p-3">
                <h3>{post.title}</h3>
                <p className="text-sm text-gray-500">{post.date}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function Blog() {
  return (
      <>
        <Header pageName="blog"/>
        <BlogContainer />
        <div className="flex justify-center items-center min-h-screen">
          <h3>blog in progress</h3>
        </div>
        <Footer />
      </>
    )
}
