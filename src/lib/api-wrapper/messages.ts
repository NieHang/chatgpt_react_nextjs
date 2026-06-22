import { apiFetch, fetchJson } from '@/lib/apiFetch'
import { Conversation, ConversationMessage } from '@/types/Conversation'
import { ParamValue } from 'next/dist/server/request/params'
import type { UploadedFile } from '@/types/UploadedFile'

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

type UploadFilesResponse = {
  uploadedFiles: UploadedFile[]
}

export async function uploadFiles({ files }: { files: File[] }) {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  const response = await apiFetch('/api/upload-files', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Failed to upload files: ${response.status}`)
  }

  return response.json() as Promise<UploadFilesResponse>
}
