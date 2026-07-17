import type { MDXComponents } from 'mdx/types'
import Image, { ImageProps } from 'next/image'
import FigureMount from '@/app/blog/_figures/figure-mount'

const components = {
  // Headings, paragraphs, lists, code, etc. are styled by the shared `.blog-prose` CSS
  // (app/ui/global.css) applied by app/blog/[slug]/page.tsx, so a post published as MDX renders
  // the same as its draft preview at /blog/admin.

  // A ```figure code block becomes an interactive figure (resolved through the figure registry),
  // matching how the draft viewer hydrates the same blocks. Everything else stays a normal <pre>.
  pre: (props: any) => {
    const child = props?.children
    const cls: string = child?.props?.className ?? ''
    if (cls.includes('language-figure')) {
      const raw = child.props.children
      const spec = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.join('') : ''
      return <FigureMount spec={spec} />
    }
    return <pre {...props} />
  },

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
