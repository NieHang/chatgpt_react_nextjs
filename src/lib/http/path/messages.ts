import { Get, type ApiResponse } from '@/lib/http/server'

export function getConversations<T>(conversationId?: string): ApiResponse<T> {
  return Get<T>('/api/conversations', { conversationId })
}
