import { Get, type ApiResponse } from '@/lib/http/server'

export function getMessages<T>({
  conversationId,
}: {
  conversationId: string
}): ApiResponse<T> {
  return Get<T>('/api/messages', { conversationId })
}

export function getConversations<T>(conversationId?: number): ApiResponse<T> {
  return Get<T>('/api/conversations', { conversationId })
}

