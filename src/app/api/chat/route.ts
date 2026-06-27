import { ObjectId } from 'mongodb'
import { NextRequest } from 'next/server'
import type { Conversation, ConversationMessage } from '@/types/Conversation'
import { getDb } from '@/lib/db'
import { MsgRoles, CollectionNames } from '@/constants/conversation'
import generateTitle from '@/app/api/chat/generateTitle'
import {
  EasyInputMessage,
  ResponseCreateParamsStreaming,
} from 'openai/resources/responses/responses.js'
import getOpenAIClient from '@/lib/openAIClient'

export const runtime = 'nodejs'

function getMessageText(content: ConversationMessage['content']) {
  if (typeof content === 'string') return content

  return content.find((item) => item.type === 'input_text')?.text ?? ''
}

function normalizeMessageDates(message: ConversationMessage) {
  return {
    ...message,
    createdAt: new Date(message.createdAt),
    ...(message.updateAt ? { updateAt: new Date(message.updateAt) } : {}),
  }
}

export async function POST(req: NextRequest) {
  const {
    messages,
    conversationId,
    isNewChat,
  }: {
    messages: ConversationMessage[]
    conversationId: string
    isNewChat: boolean
  } = await req.json()

  if (!process.env.OPENAI_API_KEY) {
    return new Response('OpenAI API key not configured', { status: 500 })
  }

  if (!conversationId) {
    return new Response('Invalid conversation ID', { status: 400 })
  }

  const _cid = new ObjectId(conversationId)

  const openAIClient = getOpenAIClient()!

  const db = await getDb().catch((error) => {
    console.error('Failed to connect to database:', error)
    return null
  })
  const conversationsCollection = db
    ? db.collection<Conversation>(CollectionNames.CONVERSATIONS)
    : null

  const runWithDb = async (
    label: string,
    fn: () => Promise<void>,
  ): Promise<void> => {
    if (!db) return
    try {
      await fn()
    } catch (error) {
      console.error(`${label}:`, error)
    }
  }

  const fetchOptions: ResponseCreateParamsStreaming = {
    model: 'gpt-4o-mini',
    stream: true,
    input: messages?.map(({ role, content }) => ({
      role: role === MsgRoles.TOOL ? MsgRoles.USER : role,
      content,
    })) as EasyInputMessage[],
    temperature: 0.7,
  }

  const result = await openAIClient.responses.create(fetchOptions)

  const lastUser = [...messages].reverse().find((m) => m.role === MsgRoles.USER)
  const userContent = lastUser?.content ?? ''
  const userAttachments = lastUser?.attachments

  await runWithDb('Error persisting user conversation', async () => {
    const timestamp = new Date()
    const userMessage: ConversationMessage = {
      role: MsgRoles.USER,
      content: userContent,
      ...(userAttachments?.length ? { attachments: userAttachments } : {}),
      createdAt: timestamp,
    }
    if (isNewChat) {
      const title = await generateTitle({
        openAIClient,
        userMessage: getMessageText(userContent),
      })
      await conversationsCollection?.insertOne({
        _id: _cid,
        title,
        messages: [userMessage],
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    } else {
      await conversationsCollection?.updateOne(
        { _id: _cid },
        {
          $set: {
            messages: messages.map(normalizeMessageDates),
            updatedAt: timestamp,
          },
        },
      )
    }
  })

  let assistantContent = ''
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of result) {
          if (event.type === 'response.output_text.delta') {
            assistantContent += event.delta
            controller.enqueue(encoder.encode(event.delta))
          }

          if (event.type === 'response.failed') {
            throw new Error(
              event.response.error?.message ?? 'OpenAI response failed',
            )
          }

          if (event.type === 'error') {
            throw new Error(event.message)
          }
        }

        await runWithDb('Error persisting assistant conversation', async () => {
          if (!assistantContent) return

          const timestamp = new Date()
          await conversationsCollection?.updateOne(
            { _id: _cid },
            {
              $push: {
                messages: {
                  role: MsgRoles.ASSISTANT,
                  content: assistantContent,
                  createdAt: timestamp,
                },
              },
              $set: {
                updatedAt: timestamp,
              },
            },
          )
        })

        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
