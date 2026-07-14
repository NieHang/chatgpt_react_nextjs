import type { ConversationMessage } from '@/types/Conversation'

export default function getMessagePreview(
  content?: ConversationMessage['content'],
) {
  if (!content) return ''
  if (typeof content === 'string') return content

  return content.find((item) => item.type === 'input_text')?.text ?? ''
}
