import { MsgRoles } from '@/constants/conversation'
import { ProxyAgent } from 'undici'

type GenerateTitleOptions = {
  dispatcher?: ProxyAgent
}

async function generateTitle(
  userMessage: string,
  options: GenerateTitleOptions = {},
) {
  const fallback = 'NEW CHAT'

  try {
    const fetchOptions: RequestInit & { dispatcher?: unknown } = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Create a concise title for this chat using only the user message. Do not add facts, names, topics, or assumptions that are not present. If the message is vague, use a neutral title based on its exact words. Return only the title, 2 to 6 words, no quotes, no ending punctuation.',
          },
          {
            role: MsgRoles.USER,
            content: userMessage,
          },
        ],
        temperature: 0.1,
      }),
    }

    if (options.dispatcher) fetchOptions.dispatcher = options.dispatcher

    const res = await fetch(
      'https://api.openai.com/v1/chat/completions',
      fetchOptions,
    )

    if (!res.ok) return fallback

    const data = await res.json()
    const title = data.choices?.[0]?.message?.content
    return title || fallback
  } catch (error) {
    console.error('Failed to generate conversation title:', error)
    return fallback
  }
}

export default generateTitle

