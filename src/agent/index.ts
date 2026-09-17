import { CostTracker } from '@/agent/costTracker'
import { runAgentLoop } from '@/agent/agentLoop'
import { ContextManager } from '@/agent/context'
import { AgentConfig } from '@/agent/type'
import getOpenAIClient from '@/lib/openAIClient'
import { ResponseInput } from 'openai/resources/responses/responses.js'
import { createDefaultToolRegistry } from '@/agent/registry'

interface RunAgentLoopParams {
  config: AgentConfig
  messages: ResponseInput
  instructions?: string
  signal?: AbortSignal
  userId: string
  conversationId?: string
  onText?: (text: string) => void
}

export default function initAgentLoop() {
  return {
    run: async (params: RunAgentLoopParams) => {
      const { config, messages, signal, onText, userId, conversationId } =
        params
      const openAIClient = getOpenAIClient(config.apiKey)
      const registry = createDefaultToolRegistry()
      const costTracker = new CostTracker()

      const contextManager = new ContextManager(config.model, openAIClient)

      const toolContext = {
        userId,
        conversationId,
      }

      contextManager.addMessages(messages)

      const result = await runAgentLoop({
        client: openAIClient,
        registry,
        context: contextManager,
        costTracker,
        instructions: params.instructions,
        toolContext,
        abortSignal: signal,
        onText,
      })

      return result
    },
  }
}
