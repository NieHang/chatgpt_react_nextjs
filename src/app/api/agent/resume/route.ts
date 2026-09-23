import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { auth } from '@/auth'
import { CollectionNames, MsgRoles } from '@/constants/conversation'
import { ObjectId } from 'mongodb'
import initAgentLoop from '@/agent/index'
import decryptApiKeyFromDB from '@/lib/util/decryptApiKeyFromDB'
import { ChatEvent } from '@/agent/type'
import { Conversation } from '@/types/Conversation'
import { SessionMemory } from '@/agent/sessionMemory'
import { loadSessionMemory } from '@/agent/sessionMemoryStore'

const agent = initAgentLoop()

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user.id)
      return Response.json(
        {
          message: 'Unauthorized',
        },
        { status: 401 },
      )

    const {
      model,
      conversationId,
      runId,
      callId,
    }: {
      model: string
      conversationId: string
      runId: string
      callId: string
    } = await req.json()

    const userId = session.user.id

    const db = await getDb()

    const apiKey = await decryptApiKeyFromDB({ db: db!, userId })

    const conversationCollection = await db!.collection<Conversation>(
      CollectionNames.CONVERSATIONS,
    )

    const conversation = await conversationCollection.findOneAndUpdate(
      {
        _id: new ObjectId(conversationId),
        userId,
        'pausedRun.runId': runId,
      },
      {
        $set: {
          'pausedRun.status': 'running',
        },
      },
      {
        returnDocument: 'after',
      },
    )

    if (!conversation) {
      return NextResponse.json(
        { message: 'Pending approval not found or already handled' },
        { status: 409 },
      )
    }

    const { pausedRun } = conversation

    const sessionMemory = new SessionMemory()
    const savedMemory = await loadSessionMemory(userId, conversationId)

    if (savedMemory) sessionMemory.restore(savedMemory)

    const encoder = new TextEncoder()

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const sendEvent = (event: ChatEvent) => {
          controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
        }

        let assistantContent = ''

        try {
          const result = await agent.run({
            runId: pausedRun.runId,
            userId,
            conversationId,
            messages: pausedRun.messages,
            config: { model, apiKey },
            sessionMemory,
            instructions: pausedRun.instructions,
            signal: req.signal,

            resume: {
              pausedRun,
              approvedCallId: callId,
            },

            onText(text) {
              assistantContent += text
              sendEvent({ type: 'text', text })
            },
          })

          if (result.reason === 'await_permission') {
            const { runId, callId } = result.extraInfo ?? {}

            if (!runId || !callId) {
              throw new Error('Missing permission request identifiers')
            }

            sendEvent({
              type: 'permission',
              runId,
              callId,
              message: result.message ?? 'Allow this action?',
            })
          } else if (result.reason !== 'end_turn') {
            throw new Error(result.message ?? `Agent stopped: ${result.reason}`)
          }

          const timestamp = new Date()
          await conversationCollection?.updateOne(
            { _id: new ObjectId(conversationId) },
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
        } catch (error) {
          sendEvent({
            type: 'error',
            message: error instanceof Error ? error.message : 'Resume failed',
          })
        } finally {
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
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { message: 'Failed to fetch paused run' },
      { status: 500 },
    )
  }
}

