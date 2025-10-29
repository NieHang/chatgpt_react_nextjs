export type Id = string

export interface Conversation {
  _id?: Id
  title: string
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
