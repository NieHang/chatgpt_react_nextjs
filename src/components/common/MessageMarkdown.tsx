'use client'

import React, { useEffect, useRef, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

function CodeBlock({ children }: { children?: React.ReactNode }) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const codeRef = useRef<HTMLElement>(null)
  const child = React.Children.toArray(children)[0]
  const code = React.isValidElement<{ className?: string; children?: React.ReactNode }>(child)
    ? child
    : null
  const language = /(?:^|\s)language-([^\s]+)/.exec(code?.props.className ?? '')?.[1] ?? 'text'
  const content = code?.props.children ?? children
  const plainText = typeof content === 'string' ? content : null
  const lineCount = plainText === null ? 0 : plainText.replace(/\n$/, '').split('\n').length

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
  }, [])

  async function copyCode() {
    if (resetTimer.current) clearTimeout(resetTimer.current)
    try {
      await navigator.clipboard.writeText(codeRef.current?.textContent ?? '')
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    }
    resetTimer.current = setTimeout(() => setCopyStatus('idle'), 2500)
  }

  return (
    <div className="my-4 min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-700/70 bg-[#0d1117] text-slate-200 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-700/60 bg-[#161b22] px-4 py-2">
        <span className="truncate font-mono text-xs font-medium text-slate-400">{language}</span>
        <button
          type="button"
          onClick={copyCode}
          aria-label="Copy code"
          className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span role="status">{copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Copy failed' : 'Copy'}</span>
        </button>
      </div>
      <div className="flex text-[13px] leading-6">
        {lineCount > 0 && (
          <div aria-hidden="true" className="shrink-0 select-none border-r border-slate-800 px-3 py-4 text-right font-mono text-slate-600">
            {Array.from({ length: lineCount }, (_, index) => <div key={index}>{index + 1}</div>)}
          </div>
        )}
        <pre tabIndex={0} aria-label={`${language} code block`} className="m-0 min-w-0 flex-1 overflow-x-auto p-4 font-mono whitespace-pre [tab-size:2] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sky-400">
          <code ref={codeRef} className={`${code?.props.className ?? ''} bg-transparent p-0 font-mono text-inherit`}>{content}</code>
        </pre>
      </div>
    </div>
  )
}

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
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-zinc-300 bg-zinc-50">
            {children}
          </thead>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => (
          <tr className="border-b border-zinc-200 last:border-b-0">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 font-semibold text-zinc-900">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 align-top text-zinc-800">{children}</td>
        ),
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
        pre: CodeBlock,
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
