import { MsgRole } from '@/constants/conversation'
import { ResponseInputMessageContentList } from 'openai/resources/responses/responses.js'

export type Id = string

export interface ConversationMessage {
  role: MsgRole
  content: string | ResponseInputMessageContentList
  createdAt: Date
  updateAt?: Date
  isError?: boolean
}

export interface Conversation {
  id?: Id
  title?: string
  messages: ConversationMessage[]
  createdAt: Date
  updatedAt: Date
}
