'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Message } from '@/types/Conversation'
import AskInput from '@/components/common/AskInput'
import { apiFetch } from '@/lib/apiFetch'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { getMessages } from '@/lib/http/path/messages'

export default function Chat() {
  const router = useRouter()

  const searchParams = useSearchParams()
  const initialMessage = searchParams.get('initialMessage')

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const { id: conversationId } = useParams()
  const hasSentInitial = useRef(false)

  const send = useCallback(
    async (contentArg?: string) => {
      const content = (contentArg ?? input).trim()
      if (!content) return
      if (!contentArg) setInput('')

      let newMessages: Message[] = []
      setMessages((prev) => {
        newMessages = [...prev, { role: 'user', content }]
        return newMessages
      })

      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac

      try {
        const res = await apiFetch('/api/chat', {
          method: 'POST',
          json: {
            messages: newMessages,
            conversationId,
            isNewChat: !!initialMessage,
          },
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
          chunk = decoder.decode(value || new Uint8Array(), {
            stream: true,
          })
          if (!chunk) continue

          setMessages((prev) => {
            const cp = [...prev]
            const i = cp.findIndex(
              (m, index) => m.role === 'assistant' && index === cp.length - 1
            )
            if (i >= 0) cp[i] = { ...cp[i], content: cp[i].content + chunk }
            else cp.push({ role: 'assistant', content: chunk })
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
      } finally {
        if (abortRef.current === ac) abortRef.current = null
      }
    },
    [conversationId, input, initialMessage]
  )

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!initialMessage || hasSentInitial.current) return
    hasSentInitial.current = true
    ;(async () => {
      await send(initialMessage)
      router.replace(`/c/${conversationId}`) // Remove initialMessage from URL
    })()
  }, [initialMessage, send, conversationId, router])

  useEffect(() => {
    ;(async () => {
      if (!conversationId) {
        setMessages([])
        return
      }
      const [error, msgs] = await getMessages<Message[]>({
        conversationId: conversationId.toString(),
      })
      if (error || !msgs?.data) {
        setMessages([])
        return
      }
      setMessages(msgs.data)
    })()
  }, [conversationId])

  return (
    <div className="flex flex-col w-[70%] h-full">
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`bg-[#F4F4F4] text-black px-4 rounded-[18px] py-1.5 data-[multiline]:py-3 max-w-lg ${
              msg?.role === 'user' ? 'place-self-end' : 'place-self-start'
            }`}
          >
            {msg?.content}
          </div>
        ))}
      </div>
      <div className="m-3 flex justify-center gap-2 sticky bottom-2 z-10">
        <AskInput
          value={input}
          onChange={setInput}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') void send()
          }}
        />
      </div>
    </div>
  )
}

