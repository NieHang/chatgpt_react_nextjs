import { ResponseInput } from 'openai/resources/responses/responses.js'

// 1 english token ≈ 4 chars, 1 chinese token ≈ 1.5 chars
export function estimateTokens(text: string): number {
  const asciiChars = text.replace(/[^\x00-\x7F]/g, '').length
  const nonAsciiChars = text.length - asciiChars
  return Math.ceil(asciiChars / 4 + nonAsciiChars / 1.5)
}

// estimate total tokens
export function estimateMessageTokens(messages: ResponseInput): number {
  let total = 0
  for (const msg of messages) {
    if ('content' in msg && typeof msg.content === 'string') {
      total += estimateTokens(msg.content)
    } else if ('content' in msg && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if ('text' in block && typeof block.text === 'string') {
          total += estimateTokens(block.text)
        }
      }
    }
  }
  return total
}
