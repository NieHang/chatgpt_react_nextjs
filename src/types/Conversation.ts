import { MsgRole } from '@/constants/conversation'
import { ResponseInputMessageContentList } from 'openai/resources/responses/responses.js'
import type { UploadedFile } from '@/types/UploadedFile'
import type { SessionMemoryData } from '@/agent/sessionMemory'

export type Id = string

export interface ConversationMessage {
  role: MsgRole
  content: string | ResponseInputMessageContentList
  attachments?: UploadedFile[]
  createdAt: Date
  updateAt?: Date
  isError?: boolean
}

export interface Conversation {
  sessionMemory?: SessionMemoryData
  id?: Id
  userId: string
  title?: string
  messages: ConversationMessage[]
  createdAt: Date
  updatedAt: Date
}
