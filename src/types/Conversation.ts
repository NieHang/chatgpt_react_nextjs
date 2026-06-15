import { MsgRole } from '@/constants/conversation'

export type Id = string

export interface ConversationMessage {
  role: MsgRole
  content: string
  createdAt: Date
  updateAt?: Date
  isError?: boolean
}

export interface Conversation {
  id?: Id
  title?: string
  content?: string
  messages: ConversationMessage[]
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  _id?: Id
  role: MsgRole
  content: string
  conversationId?: Id
  createdAt?: Date
}
