import OpenAI from 'openai'
import {
  ResponseInput,
  ResponseInputItem,
} from 'openai/resources/responses/responses.js'
import { ConversationContext } from './type'
import { estimateMessageTokens } from '@/lib/util/agent/estimateTokens'

const COMPACT_THRESHOLD = 80_000
const KEEP_RECENT_MESSAGES = 10

export class ContextManager {
  private model: string
  private messages: ResponseInput = []
  // private systemPrompt: string
  private sessionFile: string | undefined // TODO: support session file in the future
  private client: OpenAI

  constructor(model: string, client: OpenAI, sessionFile?: string) {
    this.model = model
    this.client = client
    this.sessionFile = sessionFile
  }

  getContext(): ConversationContext {
    return {
      messages: [...this.messages],
      model: this.model,
    }
  }

  getMessages(): ResponseInput {
    return this.messages
  }

  getEstimatedTokens(): number {
    return estimateMessageTokens(this.messages)
  }

  addMessage(message: ResponseInputItem): void {
    this.messages.push(message)
  }

  addMessages(messages: ResponseInput): void {
    this.messages.push(...messages)
  }

  setModel(model: string): void {
    this.model = model
  }

  buildSummaryContent(messages: ResponseInput) {
    const parts = []
    for (const msg of messages) {
      const role = 'role' in msg && msg.role.toUpperCase()

      if ('content' in msg && typeof msg.content === 'string') {
        parts.push(`[${role}]: ${msg.content}`)
      } else if ('content' in msg && Array.isArray(msg.content)) {
        const texts: string[] = []
        for (const block of msg.content) {
          if ('text' in block && typeof block.text === 'string') {
            texts.push(block.text)
          }
        }
        parts.push(`[${role}]: ${texts.join('\n')}`)
      } else if (msg.type === 'function_call') {
        parts.push(
          `[Tool call][call_id: ${msg.call_id}]: ${msg.name}(${msg.arguments.slice(0, 200)})`,
        )
      } else if (msg.type === 'function_call_output') {
        parts.push(
          `[Tool result][call_id: ${msg.call_id}]: (${JSON.stringify(msg.output).slice(0, 200)})`,
        )
      }
    }
    return parts.join('\n')
  }

  async maybeCompact(): Promise<boolean> {
    const tokenCount = this.getEstimatedTokens()
    if (tokenCount < COMPACT_THRESHOLD) return false

    console.log(
      `\n[Context] Token count ~${tokenCount} exceeds threshold ${COMPACT_THRESHOLD}. Compacting...`,
    )

    const messageToCompress = this.messages.slice(0, -KEEP_RECENT_MESSAGES)
    const recentMessages = this.messages.slice(-KEEP_RECENT_MESSAGES)
    if (recentMessages.length === 0) return false

    try {
      const summaryContent = this.buildSummaryContent(messageToCompress)

      const response = await this.client.responses.create({
        model: 'gpt-4o-mini',
        max_output_tokens: 2048,
        instructions:
          'You are a conversation summarizer. Summarize the conversation history below into a concise but comprehensive summary. ' +
          'Focus on: what files were read/modified, what commands were run, what problems were found, what solutions were applied, ' +
          'and any important context. Keep technical details like file paths and error messages.',
        input: [
          {
            role: 'user',
            content: `Summarize this conversation:\n\n${summaryContent}`,
          },
        ],
      })

      const summaryText = response.output_text || 'Summary unavailable'

      this.messages = [
        {
          role: 'user',
          content: `[Previous conversation summary]\n${summaryText}`,
        },
        {
          role: 'assistant',
          content: `Understood. I have the context from our previous conversation. How can I help you continue?`,
        },
        ...recentMessages,
      ]

      const newTokenCount = this.getEstimatedTokens()
      console.log(
        `[Context] Compacted: ~${tokenCount} → ~${newTokenCount} tokens`,
      )

      return true
    } catch (err) {
      console.log('[Context] Compaction failed:', err)

      if (this.messages.length > KEEP_RECENT_MESSAGES * 2) {
        this.messages = this.messages.slice(-KEEP_RECENT_MESSAGES * 2)
      }

      return false
    }
  }
}
