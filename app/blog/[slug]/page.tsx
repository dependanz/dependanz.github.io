import Header from "@/app/ui/header"

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { default: Post } = await import(`@/app/blog/posts/${slug}.mdx`)
 
  return (
    <>
        <Header pageName="blog"/>
        <div className="mt-10">
            <Post />
        </div>
    </>
  )
}
 
export function generateStaticParams() {
  return [{ slug: 'welcome' }, { slug: 'about' }]
}
 
export const dynamicParams = false