import type { MDXComponents } from 'mdx/types'
import Image, { ImageProps } from 'next/image'

const components = {
  // Headings, paragraphs, lists, code, etc. are styled by the shared `.blog-prose` CSS
  // (app/ui/global.css) applied by app/blog/[slug]/page.tsx, so a post published as MDX renders
  // the same as its draft preview at /blog/admin. Only img needs a component (next/image).
  img: (props) => (
    <Image
      sizes="100vw"
      style={{ width: '100%', height: 'auto' }}
      {...(props as ImageProps)}
    />
  ),
} satisfies MDXComponents

export function useMDXComponents(): MDXComponents {
  return components
}
