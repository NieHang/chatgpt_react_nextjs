import { ObjectId } from 'mongodb'
import { NextRequest } from 'next/server'
import type { Conversation, ConversationMessage } from '@/types/Conversation'
import { getDb } from '@/lib/db'
import { MsgRoles, CollectionNames } from '@/constants/conversation'
import generateTitle from '@/app/api/chat/generateTitle'
import {
  EasyInputMessage,
  ResponseCreateParamsStreaming,
  Tool,
} from 'openai/resources/responses/responses.js'
import { intelligenceToReasoningEffort } from '@/constants/model'
import { auth } from '@/auth'
import decryptApiKeyFromDB from '@/lib/util/decryptApiKeyFromDB'
import initAgentLoop from '@/agent/index'
import { ResponseInput } from 'openai/resources/responses/responses.js'

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

const agent = initAgentLoop()

export async function POST(req: NextRequest) {
  const {
    model,
    intelligence,
    tool,
    messages,
    conversationId,
    isNewChat,
  }: {
    model: string
    intelligence: string
    tool?: Tool
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

  const session = await auth()

  if (!session?.user.id)
    return Response.json(
      {
        message: 'Unauthorized',
      },
      { status: 401 },
    )

  const userId = session.user.id

  const _cid = new ObjectId(conversationId)

  const db = await getDb().catch((error) => {
    console.error('Failed to connect to database:', error)
    return null
  })

  const apiKey = await decryptApiKeyFromDB({ db: db!, userId })

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

  const reasoningEffort =
    intelligenceToReasoningEffort[
      intelligence as keyof typeof intelligenceToReasoningEffort
    ]

  const fetchOptions: ResponseCreateParamsStreaming = {
    model,
    stream: true,
    input: messages?.map(({ role, content }) => ({
      role: role === MsgRoles.TOOL ? MsgRoles.USER : role,
      content,
    })) as EasyInputMessage[],
    ...(reasoningEffort
      ? {
          reasoning: {
            effort: reasoningEffort,
          },
        }
      : {}),
    tools: tool ? [tool] : [],
  }

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
        apiKey,
        userMessage: getMessageText(userContent),
      })
      await conversationsCollection?.insertOne({
        _id: _cid,
        userId,
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
        const result = await agent.runAgentLoop({
          config: { model, apiKey: apiKey as string },
          messages: fetchOptions.input as ResponseInput,
          signal: req.signal,
          onText(text) {
            assistantContent += text
            controller.enqueue(encoder.encode(text))
          },
        })

        if (result.reason !== 'end_turn') {
          throw new Error(result.message ?? `Agent stopped: ${result.reason}`)
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
