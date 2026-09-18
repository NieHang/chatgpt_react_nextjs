import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/db'
import { CollectionNames } from '@/constants/conversation'
import type { Conversation } from '@/types/Conversation'
import type { SessionMemoryData } from '@/agent/sessionMemory'

function conversationFilter(userId: string, conversationId: string) {
  if (!userId) throw new Error('User ID is required for session memory')
  if (!ObjectId.isValid(conversationId)) {
    throw new Error('Invalid conversation ID for session memory')
  }
  return { _id: new ObjectId(conversationId), userId }
}

export async function loadSessionMemory(
  userId: string,
  conversationId: string,
): Promise<SessionMemoryData | null> {
  const filter = conversationFilter(userId, conversationId)
  const db = await getDb()
  if (!db) throw new Error('Database unavailable while loading session memory')

  const conversation = await db
    .collection<Conversation>(CollectionNames.CONVERSATIONS)
    .findOne(filter, { projection: { sessionMemory: 1 } })

  return conversation?.sessionMemory ?? null
}

export async function saveSessionMemory(
  userId: string,
  conversationId: string,
  memory: SessionMemoryData,
): Promise<void> {
  const filter = conversationFilter(userId, conversationId)
  if (memory.conversationId !== filter._id.toHexString()) {
    throw new Error('Session memory belongs to a different conversation')
  }
  const db = await getDb()
  if (!db) throw new Error('Database unavailable while saving session memory')

  // The chat route creates the conversation before starting the agent.
  // Do not upsert: a missing or unowned conversation must not be created here.
  const result = await db
    .collection<Conversation>(CollectionNames.CONVERSATIONS)
    .updateOne(filter, { $set: { sessionMemory: memory } })

  if (result.matchedCount === 0) {
    throw new Error('Conversation not found while saving session memory')
  }
}
