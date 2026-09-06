import OpenAI from 'openai'
import {
  ResponseInput,
  ResponseInputItem,
} from 'openai/resources/responses/responses.js'
import { ConversationContext } from './type'

export class ContextManager {
  private model: string
  private messages: ResponseInput = []
  private systemPrompt: string
  private sessionFile: string | undefined // TODO: support session file in the future
  private client: OpenAI

  constructor(
    model: string,
    systemPrompt: string,
    client: OpenAI,
    sessionFile?: string,
  ) {
    this.model = model
    this.systemPrompt = systemPrompt
    this.client = client
    this.sessionFile = sessionFile
  }

  getContext(): ConversationContext {
    return {
      messages: [...this.messages],
      systemPrompt: this.systemPrompt,
      model: this.model,
    }
  }

  getMessages(): ResponseInput {
    return this.messages
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
