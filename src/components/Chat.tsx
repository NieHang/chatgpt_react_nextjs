'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConversationMessage } from '@/types/Conversation'
import AskInput from '@/components/Form/Input/AskInput'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { getConversations, chat, uploadFiles } from '@/lib/api-wrapper/messages'
import { MsgRole, MsgRoles } from '@/constants/conversation'
import { useConversations } from '@/providers/ConversationProvider'
import Image from 'next/image'
import clsx from 'clsx'
import { Attachment } from '@/types/Form'
import type { UploadedFile } from '@/types/UploadedFile'
import { isVisionImageFile } from '@/lib/fileTypes'
import type { ResponseInputMessageContentList } from 'openai/resources/responses/responses.js'
import FileAttachment from '@/components/common/FileAttachment'
import EditInput from './Form/Input/EditInput'
import { produce } from 'immer'

function buildInputContent(
  files: UploadedFile[],
  text: string,
): ResponseInputMessageContentList {
  return [
    ...files.map((file) =>
      isVisionImageFile(file)
        ? {
            type: 'input_image' as const,
            file_id: file.id,
            detail: 'auto' as const,
          }
        : {
            type: 'input_file' as const,
            file_id: file.id,
          },
    ),
    {
      type: 'input_text',
      text,
    },
  ]
}
export default function Chat() {
  const router = useRouter()

  const searchParams = useSearchParams()
  const { id: conversationId } = useParams()
  const initialMessage = searchParams.get('initialMessage')

  const { refreshConversations } = useConversations()

  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [msgIndexToBeEdited, setMsgIndexToBeEdited] = useState<number | null>(
    null,
  )

  const abortRef = useRef<AbortController | null>(null)
  const hasSentInitial = useRef(false)
  const loadedConversationId = useRef<string | null>(null)

  const messageOptions = [
    {
      src: '/common/copy.svg',
      alt: 'copy message',
      types: [MsgRoles.USER, MsgRoles.ASSISTANT] as MsgRole[],
      fn: ({ message }: { message?: string }) => {
        navigator.clipboard.writeText(message!)
      },
    },
    {
      src: '/common/edit.svg',
      alt: 'edit message',
      types: [MsgRoles.USER] as MsgRole[],
      fn: ({ index }: { index?: number }) => {
        setMsgIndexToBeEdited(index!)
      },
    },
  ]

  const send = useCallback(
    async ({
      contentArg,
      inputFiles,
      editedMessages,
    }: {
      contentArg?: string
      inputFiles?: Attachment[]
      editedMessages?: ConversationMessage[]
    }) => {
      const content = (contentArg ?? input).trim()
      if (!content && !editedMessages) return
      if (!contentArg) setInput('')

      let filesFromOpenAI: UploadedFile[] | null = null

      setIsThinking(true)
      if (inputFiles?.length) {
        const result = await uploadFiles({
          files: inputFiles.map((item) => item.file),
        })

        filesFromOpenAI = result.uploadedFiles
      }

      const nextMessages: ConversationMessage[] = editedMessages || [
        ...messages,
        {
          role: MsgRoles.USER,
          content: filesFromOpenAI?.length
            ? buildInputContent(filesFromOpenAI, content)
            : content,
          ...(filesFromOpenAI?.length ? { attachments: filesFromOpenAI } : {}),
          createdAt: new Date(),
        },
      ]

      setMessages(nextMessages)

      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac

      try {
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

  const handleMsgUpdate = async (val: string) => {
    if (!msgIndexToBeEdited) return
    const editedMessages = produce(messages, (draft) => {
      if (typeof draft[msgIndexToBeEdited].content === 'string')
        draft[msgIndexToBeEdited].content = val
      else {
        const target = draft[msgIndexToBeEdited].content.find(
          (item) => item.type === 'input_text',
        )
        target!.text = val
      }
      draft.splice(msgIndexToBeEdited + 1)
    })
    setMessages(editedMessages)
    await send({ editedMessages })
  }

  useEffect(() => {
    if (!initialMessage || hasSentInitial.current) return
    hasSentInitial.current = true
    ;(async () => {
      setIsLoading(true)
      await send({ contentArg: initialMessage })
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
          src="/common/loading.svg"
          alt="loading"
          width={40}
          height={40}
          className={clsx(
            'absolute top-[50%] left-[50%] translate-[-50%, -50%]',
            'animate-[spin_2s_infinite] w-10 h-10',
          )}
        />
      ) : (
        <div className="pb-[250px] space-y-3 overflow-y-auto scrollbar-hide">
          {messages.map((msg, msgIndex) =>
            msgIndex === msgIndexToBeEdited ? (
              <EditInput
                key={msgIndex}
                msg={msg}
                setMsgIndexToBeEdited={setMsgIndexToBeEdited}
                handleMsgUpdate={handleMsgUpdate}
              />
            ) : (
              <div key={msgIndex} className="group">
                {msg.attachments?.map((file) => (
                  <div
                    key={file.mongoFileId}
                    className={clsx(
                      'relative',
                      'flex items-center place-self-end w-fit',
                      file.isImage && 'justify-center',
                      !file.isImage && 'p-2',
                      'border border-gray-300 rounded-xl',
                      'hover:bg-gray-100',
                      'cursor-pointer',
                    )}
                  >
                    {file.isImage ? (
                      <Image
                        src={file.src}
                        alt={file.name}
                        width={384}
                        height={190}
                        className="rounded-xl object-fit"
                      />
                    ) : (
                      <FileAttachment file={file} />
                    )}
                  </div>
                ))}
                <div
                  className={clsx(
                    'max-w-lg',
                    'data-[multiline]:py-3',
                    `rounded-[18px] ${
                      msg?.role === MsgRoles.USER
                        ? 'place-self-end px-4 py-1.5 bg-pink-50 text-[#4d1f34]'
                        : 'place-self-start text-black'
                    }`,
                  )}
                >
                  {typeof msg.content === 'string'
                    ? msg.content
                    : msg.content.map((item, index) =>
                        item.type === 'input_text' ? (
                          <span key={index}>{item.text}</span>
                        ) : null,
                      )}
                </div>
                <div
                  className={clsx(
                    'flex items-center justify-end invisible mt-1',
                    'group-hover:visible',
                    msg?.role === MsgRoles.USER
                      ? 'place-self-end'
                      : 'place-self-start',
                  )}
                >
                  {messageOptions.map(
                    (option, index) =>
                      option.types.includes(msg.role) && (
                        <div
                          key={index}
                          className={clsx(
                            'flex items-center justify-center p-2 cursor-pointer',
                            'hover:bg-gray-200 rounded-xl',
                          )}
                          onClick={() =>
                            option.fn({
                              message:
                                typeof msg.content === 'string'
                                  ? msg.content
                                  : msg.content.find(
                                      (item) => item.type === 'input_text',
                                    )!.text,
                              index: msgIndex,
                            })
                          }
                        >
                          <Image
                            src={option.src}
                            alt={option.alt}
                            width={20}
                            height={20}
                          />
                        </div>
                      ),
                  )}
                </div>
              </div>
            ),
          )}
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
          onKeyDown={async (inputFiles) => {
            await send({ inputFiles })
          }}
        />
        <div className="h-[60px] leading-[60px] text-xs text-gray-400 text-center">
          ChatGPT can make mistakes. Check important info.
        </div>
      </div>
    </div>
  )
}
