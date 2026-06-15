import OpenAI from 'openai'
import { ResponseCreateParamsNonStreaming } from 'openai/resources/responses/responses.js'

const TITLE_INSTRUCTIONS =
  'Create a concise title for this chat using only the user message. Do not answer the message. Do not repeat the full message. Do not add facts, names, topics, or assumptions that are not present. Return only a title, 2 to 6 words, no quotes, no ending punctuation.'

async function generateTitle({
  openAIClient,
  userMessage,
}: {
  openAIClient: OpenAI
  userMessage: string
}) {
  const fallback = 'NEW CHAT'

  try {
    const fetchOptions: ResponseCreateParamsNonStreaming = {
      model: 'gpt-4o-mini',
      instructions: TITLE_INSTRUCTIONS,
      input: `User message:\n${userMessage}`,
      max_output_tokens: 20,
      temperature: 0.2,
    }

    const res = await openAIClient.responses.create(fetchOptions)

    const title = res.output_text

    return title || fallback
  } catch (error) {
    console.error('Failed to generate conversation title:', error)
    return userMessage || fallback
  }
}

export default generateTitle

