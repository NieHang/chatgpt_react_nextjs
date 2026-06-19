'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConversationMessage } from '@/types/Conversation'
import AskInput from '@/components/Form/Input/AskInput'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { getConversations, chat } from '@/lib/http/path/messages'
import { MsgRoles } from '@/constants/conversation'
import { useConversations } from '@/providers/ConversationProvider'
import loadingIcon from '../../public/common/loading.svg'
import Image from 'next/image'
import clsx from 'clsx'

export default function Chat() {
  const router = useRouter()

  const searchParams = useSearchParams()
  const initialMessage = searchParams.get('initialMessage')

  const { refreshConversations } = useConversations()

  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const { id: conversationId } = useParams()
  const hasSentInitial = useRef(false)
  const loadedConversationId = useRef<string | null>(null)

  const send = useCallback(
    async (contentArg?: string) => {
      const content = (contentArg ?? input).trim()
      if (!content) return
      if (!contentArg) setInput('')

      const nextMessages: ConversationMessage[] = [
        ...messages,
        {
          role: MsgRoles.USER,
          content,
          createdAt: new Date(),
        },
      ]

      setMessages(nextMessages)

      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac

      try {
        setIsThinking(true)
        const res = await chat({
          messages: nextMessages,
          conversationId,
          isNewChat: !!initialMessage,
          signal: ac.signal,
        })
        setIsThinking(false)
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
              (m, index) =>
                m.role === MsgRoles.ASSISTANT && index === cp.length - 1,
            )
            if (i >= 0) cp[i] = { ...cp[i], content: cp[i].content + chunk }
            else
              cp.push({
                role: MsgRoles.ASSISTANT,
                content: chunk,
                createdAt: new Date(),
              })
            return cp
          })
        }
      } catch (error) {
        setMessages((prev) => {
          const cp = [...prev]
          const i = cp.findIndex(
            (m, index) =>
              m.role === MsgRoles.ASSISTANT && index === cp.length - 1,
          )
          if (i >= 0)
            cp[i] = {
              ...cp[i],
              content:
                cp[i].content + '\n\n[Error: ' + (error as Error).message + ']',
              isError: true,
            }
          return cp
        })
      } finally {
        setIsThinking(false)
        if (abortRef.current === ac) abortRef.current = null
      }
    },
    [conversationId, input, initialMessage, messages],
  )

  useEffect(() => {
    if (!initialMessage || hasSentInitial.current) return
    hasSentInitial.current = true
    ;(async () => {
      setIsLoading(true)
      await send(initialMessage)
      await refreshConversations()
      setIsLoading(false)
      router.replace(`/c/${conversationId}`) // Remove initialMessage from URL
    })()
  }, [initialMessage, send, conversationId, router, refreshConversations])

  useEffect(() => {
    ;(async () => {
      if (!conversationId) {
        setMessages([])
        loadedConversationId.current = null
        return
      }

      if (initialMessage) return

      if (loadedConversationId.current === conversationId) return

      loadedConversationId.current = conversationId as string

      setIsLoading(true)
      const result = await getConversations(loadedConversationId.current)
      setIsLoading(false)
      if (!result?.data) {
        setMessages([])
        return
      }
      setMessages(result.data[0]?.messages ?? [])
    })()
  }, [conversationId, initialMessage])

  return (
    <div className="relative flex flex-col w-[70%] h-full">
      {isLoading ? (
        <Image
          src={loadingIcon}
          alt="loading"
          className={clsx(
            'absolute top-[50%] left-[50%] translate-[-50%, -50%]',
            'animate-[spin_2s_infinite] w-10 h-10',
          )}
        />
      ) : (
        <div className="pb-[250px] space-y-3 overflow-y-auto scrollbar-hide">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={clsx(
                'max-w-lg',
                'px-4 py-1.5 data-[multiline]:py-3',
                `rounded-[18px] ${
                  msg?.role === MsgRoles.USER
                    ? 'place-self-end bg-pink-50 text-[#4d1f34]'
                    : 'place-self-start text-black'
                }`,
              )}
            >
              {msg?.content}
            </div>
          ))}
          {isThinking && (
            <div
              className={clsx(
                'relative w-fit',
                'before:absolute before:top-0 before:left-0 before:block before:w-7 before:h-7',
                'before:bg-linear-to-l before:from-transparent before:via-white before:to-transparent',
                'before:animate-[thinking-sweep_1.5s_linear_infinite]',
                'text-gray-400 text-base',
              )}
            >
              Thinking
            </div>
          )}
        </div>
      )}
      <div
        className={clsx(
          'absolute bottom-[50px]',
          'flex flex-col justify-center',
          'w-full rounded-3xl z-10 bg-white',
        )}
      >
        <AskInput
          value={input}
          onChange={setInput}
          onKeyDown={async (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              await send()
            }
          }}
        />
        <div className="h-[60px] leading-[60px] text-xs text-gray-400 text-center">
          ChatGPT can make mistakes. Check important info.
        </div>
      </div>
    </div>
  )
}
