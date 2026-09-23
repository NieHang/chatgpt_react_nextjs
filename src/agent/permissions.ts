import { CollectionNames } from '@/constants/conversation'
import { getDb } from '@/lib/db'
import { ObjectId } from 'mongodb'
import { ResponseInputItem } from 'openai/resources/responses/responses.js'
import { ResponseFunctionToolCall } from 'openai/resources/responses/responses.mjs'

export type PermissionBehavior = 'allow' | 'deny' | 'ask'

export type PermissionMode = 'default' | 'acceptEdits' | 'bypass'

export interface PermissionDecision {
  behavior: PermissionBehavior
  reason: string
}

export type ToolPendingExecution = {
  runId: string
  userId: string
  conversationId: string

  instructions: string
  messages: ResponseInputItem[]
  toolUseBlocks: ResponseFunctionToolCall[]
  toolResults: ResponseInputItem.FunctionCallOutput[]
  nextToolIndex: number

  status: 'awaiting_permission' | 'running' | 'completed'
  approvalCallId: string
}

export function checkWritePermission(
  fileName: string,
  mode: PermissionMode,
): PermissionDecision {
  if (mode === 'bypass') {
    return {
      behavior: 'allow',
      reason: 'bypass mode allowing',
    }
  }

  if (mode === 'acceptEdits') {
    return {
      behavior: 'allow',
      reason: 'acceptEdits mode automatically allows file editing',
    }
  }

  return {
    behavior: 'ask',
    reason: `write a new file: ${fileName}`,
  }
}

export async function savePausedRun(params: ToolPendingExecution) {
  const { userId, conversationId } = params

  if (!userId) throw new Error('User ID is required for paused run')
  if (!ObjectId.isValid(conversationId))
    throw new Error('Invalid conversation ID for paused run')

  const db = await getDb()
  if (!db) throw new Error('Database unavailable while saving paused run')

  const result = await db.collection(CollectionNames.CONVERSATIONS).updateOne(
    {
      _id: new ObjectId(conversationId),
      userId,
    },
    {
      $set: {
        pausedRun: {
          ...params,
        },
      },
    },
  )

  if (result.matchedCount === 0)
    throw new Error('Conversation not found while saving paused run')
}

