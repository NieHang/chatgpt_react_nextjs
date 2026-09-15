import OpenAI from 'openai'
import {
  ResponseInput,
  ResponseInputItem,
} from 'openai/resources/responses/responses.js'
import { ConversationContext } from './type'
import { estimateMessageTokens } from '@/lib/util/agent/estimateTokens'

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
}
