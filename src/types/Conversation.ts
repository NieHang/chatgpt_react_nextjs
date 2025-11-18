export type Id = string

export interface Conversation {
  id?: Id
  title?: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  _id?: Id
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  conversationId?: Id
  createdAt?: Date
}

