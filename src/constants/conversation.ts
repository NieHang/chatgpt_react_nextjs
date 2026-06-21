export const MsgRoles = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  TOOL: 'tool',
} as const

export const CollectionNames = {
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  FILES: 'files',
}

export type MsgRole = (typeof MsgRoles)[keyof typeof MsgRoles]
