'use client'

import { useRef, useState } from 'react'

type Msg = {
  role: 'user' | 'assistant'
  content: string
}

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  async function send() {
    const content = input.trim()
    if (!content) return
    setInput('')

    const newMessages = [...messages, { role: 'user', content }] as Msg[]
    setMessages(newMessages)

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: newMessages }),
        signal: ac.signal,
      })
      if (!res.ok || !res.body) {
        console.error('Error from API', await res.text())
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value || new Uint8Array(), {
          stream: true,
        })
        if (!chunk) continue

        setMessages((prev) => {
          const cp = [...prev]
          const i = cp.findIndex(
            (m, index) => m.role === 'assistant' && index === cp.length - 1
          )
          if (i >= 0)
            cp[i] = {
              ...cp[i],
              content: cp[i].content + chunk,
            }
          return cp
        })
      }
    } catch (error) {
      setMessages((prev) => {
        const cp = [...prev]
        const i = cp.findIndex(
          (m, index) => m.role === 'assistant' && index === cp.length - 1
        )
        if (i >= 0)
          cp[i] = {
            ...cp[i],
            content:
              cp[i].content + '\n\n[Error: ' + (error as Error).message + ']',
          }
        return cp
      })
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`p-3 rounded-md max-w-lg ${
              msg.role === 'user'
                ? 'bg-blue-500 text-white self-end'
                : 'bg-gray-200 text-black self-start'
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>
      <div className="border-t p-3 flex gap-2">
        <input
          type="text"
          className="flex-1 border rounded px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send()
          }}
          placeholder="Message..."
        />
        <button
          className="px-4 py-2 rounded bg-black text-white"
          onClick={send}
        >
          Send ⌘/Ctrl+Enter
        </button>
      </div>
    </div>
  )
}

