import type { MDXComponents } from 'mdx/types'
import Image, { ImageProps } from 'next/image'
 
const components = {
  // Allows customizing built-in components, e.g. to add styling.
  h1: ({ children }) => (
    <h1 className="text-3xl text-center mb-2">{children}</h1>
  ),
  h2:  ({ children }) => (
    <h2 className="mt-5 text-xl text-center underline">{children}</h2>
  ),
  h3:  ({ children }) => (
    <h3 className="mt-2 ml-5 text-lg text-left underline italic">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mx-7 justify-left">{children}</p>
  ),
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