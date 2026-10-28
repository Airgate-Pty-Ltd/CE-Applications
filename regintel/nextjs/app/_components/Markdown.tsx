'use client';

// Shared renderer for the generated report markdown.
//
// Lives here rather than in a page so the dashboard's "Full report" tab and the
// archive's expanded report render identically. They previously diverged — the
// archive showed raw markdown in a <pre>, so the same report looked like source
// in one place and a document in the other.

import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

// Strict allow-list for rendered report markdown. The report content comes from
// trusted deterministic builders today, but we harden the renderer so a future
// change or a poisoned feed cannot introduce scripts, styles, forms, or
// arbitrary HTML.
const SANITIZE_SCHEMA = {
  ...defaultSchema,
  tagNames: [
    'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'strong', 'em', 'a', 'hr',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'blockquote', 'code', 'pre',
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: ['href', 'title'],
    code: ['className'],
  },
  strip: ['script', 'style', 'form', 'input', 'button', 'iframe', 'object', 'embed'],
};

export const MARKDOWN_COMPONENTS: Components = {
  h1: ({ children }) => <h1 className="text-2xl font-bold text-ink mb-4 mt-6 tracking-tight">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-bold text-ink mt-5 mb-2 border-b border-line pb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="font-semibold text-ink mt-3 mb-1">{children}</h3>,
  p: ({ children }) => <p className="text-sm text-muted my-2 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc ml-6 my-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal ml-6 my-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-sm text-muted">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  hr: () => <hr className="my-4 border-line" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-steel hover:underline">{children}</a>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-3"><table className="text-sm border-collapse">{children}</table></div>
  ),
  th: ({ children }) => <th className="border border-line px-2 py-1 bg-surface-2 text-left font-semibold text-ink">{children}</th>,
  td: ({ children }) => <td className="border border-line px-2 py-1 text-muted">{children}</td>,
};

export default function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeSanitize, SANITIZE_SCHEMA]]}
      components={MARKDOWN_COMPONENTS}
    >
      {children}
    </ReactMarkdown>
  );
}
