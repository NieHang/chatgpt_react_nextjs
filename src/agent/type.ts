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

export interface ToolContext {
  userId: string
  conversationId?: string
}

export interface ToolInputSchema {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
  [key: string]: unknown
}

export interface ToolResult {
  content: string
  isError: boolean
}

export interface Tool {
  name: string
  description: string
  inputSchema: ToolInputSchema
  execute(
    args: Record<string, unknown>,
    context?: ToolContext,
  ): Promise<ToolResult>
  isReadOnly: boolean
}
