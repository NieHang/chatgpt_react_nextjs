'use client'

import React from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

export default function MessageMarkdown({ message }: { message: string }) {
  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        p: ({ children }) => (
          <p className="mb-3 last:mb-0 leading-7 whitespace-pre-wrap">
            {children}
          </p>
        ),
        h1: ({ children }) => (
          <h1 className="mb-3 text-2xl font-semibold leading-8">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-3 text-xl font-semibold leading-7">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-2 text-lg font-semibold leading-7">{children}</h3>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 ml-5 list-disc space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 ml-5 list-decimal space-y-1">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-7">{children}</li>,
        a: ({ children, href }) => (
          <a
            className="text-blue-600 underline underline-offset-2"
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            {children}
          </a>
        ),
        pre: ({ children }) => (
          <pre className="mb-3 overflow-x-auto rounded-lg bg-zinc-950 p-4 text-sm leading-6 text-zinc-50">
            {children}
          </pre>
        ),
        code: ({ children, className }) => (
          <code
            className={
              className
                ? `${className} font-mono`
                : 'rounded bg-zinc-100 px-1 py-0.5 font-mono text-sm text-zinc-900'
            }
          >
            {children}
          </code>
        ),
      }}
    >
      {message}
    </Markdown>
  )
}
