import { apiFetch, fetchJson } from '@/lib/apiFetch'
import { Conversation, ConversationMessage } from '@/types/Conversation'
import { ParamValue } from 'next/dist/server/request/params'

export function getConversations(conversationId?: string) {
  return fetchJson<Conversation[]>(
    !!conversationId
      ? `/api/conversations?conversationId=${conversationId}`
      : '/api/conversations',
  )
}

export function chat({
  messages,
  conversationId,
  isNewChat,
  signal,
}: {
  messages: ConversationMessage[]
  conversationId: ParamValue
  isNewChat: boolean
  signal?: AbortSignal
}) {
  return apiFetch('/api/chat', {
    method: 'POST',
    json: {
      messages,
      conversationId,
      isNewChat,
    },
    signal,
  })
}
