'use client'

import { useRef, useState } from 'react'
import AskInput from '@/components/common/AskInput'

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
      let chunk = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        chunk += decoder.decode(value || new Uint8Array(), {
          stream: true,
        })
        if (!chunk) continue
      }

      setMessages((prev) => {
        const cp = [...prev]
        cp.push({ role: 'assistant', content: chunk })
        return cp
      })
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
    <div className="flex flex-col w-[70%] h-full">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`bg-[#F4F4F4] text-black px-4 rounded-[18px] py-1.5 data-[multiline]:py-3 max-w-lg ${
              msg.role === 'user' ? 'place-self-end' : 'place-self-start'
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>
      <div className="p-3 flex justify-center gap-2">
        <AskInput
          value={input}
          onChange={setInput}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') send()
          }}
        />
      </div>
    </div>
  )
}

