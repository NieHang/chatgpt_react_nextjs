import { ObjectId } from 'mongodb'
import { NextRequest } from 'next/server'
import type { Message } from '@/types/Conversation'
import { getDb } from '@/lib/db'
import { MsgRoles, CollectionNames } from '@/constants/conversation'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const {
    messages,
    conversationId,
    isNewChat,
  }: { messages: Message[]; conversationId: string; isNewChat: boolean } =
    await req.json()

  if (!process.env.OPENAI_API_KEY) {
    return new Response('OpenAI API key not configured', { status: 500 })
  }

  if (!conversationId) {
    return new Response('Invalid conversation ID', { status: 400 })
  }

  const _cid = new ObjectId(conversationId)

  const db = await getDb().catch((error) => {
    console.error('Failed to connect to database:', error)
    return null
  })
  const conversationsCollection = db
    ? db.collection(CollectionNames.CONVERSATIONS)
    : null
  const messagesCollection = db ? db.collection(CollectionNames.MESSAGES) : null

  const runWithDb = async (
    label: string,
    fn: () => Promise<void>
  ): Promise<void> => {
    if (!db) return
    try {
      await fn()
    } catch (error) {
      console.error(`${label}:`, error)
    }
  }

  const updateConversationTimestamp = async (at: Date) => {
    if (!messagesCollection) return
    await messagesCollection.updateOne(
      {
        _id: _cid,
      },
      {
        $set: {
          updatedAt: at,
        },
      }
    )
  }

  const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      stream: true,
      messages: messages ?? [
        {
          role: MsgRoles.USER,
          content: 'Hello, world!',
        },
      ],
      temperature: 0.7,
    }),
  })

  if (!aiRes.ok || !aiRes.body) {
    const text = await aiRes.text().catch(() => '<no body>')
    return new Response('Error from OpenAI API: ' + text, {
      status: aiRes.status,
    })
  }

  const lastUser = [...messages].reverse().find((m) => m.role === MsgRoles.USER)
  const userContent = lastUser?.content ?? ''

  await runWithDb('Error persisting user message', async () => {
    if (!messagesCollection) return

    const timestamp = new Date()
    if (isNewChat) {
      await conversationsCollection?.insertOne({
        _id: _cid,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }
    await messagesCollection.insertOne({
      role: MsgRoles.USER,
      content: userContent,
      conversationId: _cid,
      createdAt: timestamp,
    })
    await updateConversationTimestamp(timestamp)
  })

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  let buffer = ''
  let assistantContent = ''

  const stream = new ReadableStream({
    async start(controller) {
      const reader = aiRes.body!.getReader()
      let shouldStop = false

      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: ')) continue

            const data = trimmed.slice(5).trim()
            if (data === '[DONE]') {
              shouldStop = true
              break
            }

            try {
              const json = JSON.parse(data)
              const delta = json.choices?.[0]?.delta?.content
              if (delta) {
                assistantContent += delta
                const chunk = encoder.encode(delta)
                controller.enqueue(chunk)
              }
            } catch (e) {
              console.error('Error parsing JSON:', e)
            }
          }
          if (shouldStop) {
            break
          }
        }
        if (assistantContent) {
          await runWithDb('Error persisting assistant message', async () => {
            if (!messagesCollection) return

            const timestamp = new Date()
            await messagesCollection.insertOne({
              role: MsgRoles.ASSISTANT,
              content: assistantContent,
              conversationId: _cid,
              createdAt: timestamp,
            })
            await updateConversationTimestamp(timestamp)
          })
        }
        controller.close()
      } catch (e) {
        controller.error(e)
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

