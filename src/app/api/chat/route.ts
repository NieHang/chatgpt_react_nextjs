import { ObjectId } from 'mongodb'
import { NextRequest, NextResponse } from 'next/server'
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
import { assembleMemory, loadMemories } from '@/agent/memory'
import { SessionMemory } from '@/agent/sessionMemory'
import {
  loadSessionMemory,
  saveSessionMemory,
} from '@/agent/sessionMemoryStore'
import { randomUUID } from 'node:crypto'
import { ChatEvent } from '@/agent/type'

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

  const runId = randomUUID()
  const sessionMemory = new SessionMemory()
  const savedMemory = await loadSessionMemory(userId, conversationId)
  const lastUser = [...messages].reverse().find((m) => m.role === MsgRoles.USER)
  const userContent = lastUser?.content ?? ''
  const userAttachments = lastUser?.attachments

  if (savedMemory) {
    sessionMemory.restore(savedMemory)
  } else {
    sessionMemory.beginTask(getMessageText(userContent), _cid.toHexString())
  }

  const memories = assembleMemory(
    await loadMemories({
      userId,
      projectName: 'default',
    }),
  )

  const fetchOptions: ResponseCreateParamsStreaming = {
    model,
    stream: true,
    instructions: memories,
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
      await conversationsCollection?.updateOne(
        { _id: _cid, userId },
        {
          $setOnInsert: {
            title,
            messages: [userMessage],
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        },
        { upsert: true },
      )
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
      const sendEvent = (event: ChatEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }
      try {
        const result = await agent
          .run({
            runId,
            config: { model, apiKey: apiKey as string },
            messages: fetchOptions.input as ResponseInput,
            sessionMemory,
            instructions: fetchOptions.instructions ?? undefined,
            signal: req.signal,
            userId,
            conversationId,
            onText(text) {
              assistantContent += text
              sendEvent({ type: 'text', text })
            },
          })
          .finally(async () => {
            await runWithDb('Error persisting session memory', async () => {
              await saveSessionMemory(
                userId,
                conversationId,
                sessionMemory.snapShot(),
              )
            })
          })

        if (result.reason === 'await_permission') {
          const { runId, callId } = result.extraInfo ?? {}

          if (!runId || !callId)
            throw new Error('Missing permission request identifiers')

          sendEvent({
            type: 'permission',
            runId,
            callId,
            message: result.message ?? 'Allow this action?',
          })
        } else if (result.reason !== 'end_turn') {
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
        sendEvent({
          type: 'error',
          message: error instanceof Error ? error.message : 'Chat failed',
        })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
