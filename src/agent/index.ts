import { runAgentLoop } from '@/agent/agentLoop'
import { ContextManager } from '@/agent/context'
import { AgentConfig } from '@/agent/type'
import getOpenAIClient from '@/lib/openAIClient'
import { ResponseInput } from 'openai/resources/responses/responses.js'
import { createDefaultToolRegistry } from '@/agent/registry'

interface RunAgentLoopParams {
  config: AgentConfig
  messages: ResponseInput
  signal?: AbortSignal
  userId: string
  conversationId?: string
  onText?: (text: string) => void
}

const SYSTEM_PROMPT = `You are a helpful assistant. You will be given a user input and you should respond with a helpful answer. You should also ask the user for clarification if needed.`

export default function initAgentLoop() {
  return {
    run: async (params: RunAgentLoopParams) => {
      const { config, messages, signal, onText, userId, conversationId } =
        params
      const openAIClient = getOpenAIClient(config.apiKey)
      const registry = createDefaultToolRegistry()

      const contextManager = new ContextManager(
        config.model,
        SYSTEM_PROMPT,
        openAIClient,
      )

      const toolContext = {
        userId,
        conversationId,
      }

      contextManager.addMessages(messages)

      const result = await runAgentLoop({
        client: openAIClient,
        registry,
        context: contextManager,
        toolContext,
        abortSignal: signal,
        onText,
      })

      return result
    },
  }
}
