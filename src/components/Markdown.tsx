import ReactMarkdown, { type Components } from 'react-markdown'
import { safeHref } from '../resources/resources'

/** App styles for the few elements a note uses; there is no typography plugin. */
const COMPONENTS: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  h1: ({ children }) => <p className="mb-2 font-display text-lg font-semibold">{children}</p>,
  h2: ({ children }) => <p className="mb-2 font-display text-lg font-semibold">{children}</p>,
  h3: ({ children }) => <p className="mb-2 font-semibold">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="mb-0.5">{children}</li>,
  blockquote: ({ children }) => <blockquote className="mb-2 border-l-2 border-mist pl-3 text-ink-soft">{children}</blockquote>,
  code: ({ children }) => <code className="rounded bg-mist/50 px-1 py-0.5 text-[0.9em]">{children}</code>,
  pre: ({ children }) => <pre className="mb-2 overflow-x-auto rounded-lg bg-mist/40 p-3 text-sm">{children}</pre>,
  // only http(s) links become links; anything else stays as its text
  a: ({ href, children }) => {
    const safe = safeHref(href)
    return safe ? (
      <a href={safe} target="_blank" rel="noopener noreferrer" className="font-medium text-link underline underline-offset-2">
        {children}
      </a>
    ) : (
      <>{children}</>
    )
  },
  img: ({ alt }) => <>{alt}</>,
  hr: () => <hr className="my-3 border-mist" />,
}

/**
 * A note's Markdown as safe React elements: raw HTML in it is dropped, never injected. The default
 * export, so it can be loaded lazily: the parser is a big share of the bundle and only notes need it.
 */
export default function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown skipHtml components={COMPONENTS}>
      {text}
    </ReactMarkdown>
  )
}
