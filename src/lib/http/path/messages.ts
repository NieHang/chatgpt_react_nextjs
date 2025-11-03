import { Get, type ApiResponse } from '@/lib/http/server'

export function getMessages<T>({
  conversationId,
}: {
  conversationId: string
}): ApiResponse<T> {
  return Get<T>('/api/messages', { conversationId })
}

