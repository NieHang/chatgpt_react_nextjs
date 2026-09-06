import { ResponseInput } from 'openai/resources/responses/responses.js'

export interface AgentConfig {
  model: string
  apiKey: string
  // cwd: string
}

export interface ConversationContext {
  model: string
  messages: ResponseInput
  systemPrompt: string
}
