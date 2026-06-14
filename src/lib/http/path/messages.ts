import { fetchJson } from '@/lib/apiFetch'
import { Conversation } from '@/types/Conversation'

export function getConversations(conversationId?: string) {
  return fetchJson<Conversation[]>(
    !!conversationId
      ? `/api/conversations?conversationId=${conversationId}`
      : '/api/conversations',
  )
}
