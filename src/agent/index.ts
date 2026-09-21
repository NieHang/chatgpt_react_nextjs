import { CostTracker } from '@/agent/costTracker'
import { runAgentLoop } from '@/agent/agentLoop'
import { ContextManager } from '@/agent/context'
import { AgentConfig } from '@/agent/type'
import getOpenAIClient from '@/lib/openAIClient'
import { ResponseInput } from 'openai/resources/responses/responses.js'
import { createDefaultToolRegistry } from '@/agent/registry'
import { SessionMemory } from '@/agent/sessionMemory'

interface RunAgentLoopParams {
  runId: string
  config: AgentConfig
  messages: ResponseInput
  sessionMemory: SessionMemory
  instructions?: string
  signal?: AbortSignal
  userId: string
  conversationId?: string
  onText?: (text: string) => void
}

export default function initAgentLoop() {
  return {
    run: async (params: RunAgentLoopParams) => {
      const {
        runId,
        config,
        messages,
        signal,
        onText,
        userId,
        conversationId,
        sessionMemory,
      } = params
      const openAIClient = getOpenAIClient(config.apiKey)
      const registry = createDefaultToolRegistry()
      // TODO: move costTracker outside run function because it can only track one request now
      const costTracker = new CostTracker()

      const contextManager = new ContextManager(config.model, openAIClient)

      const toolContext = {
        userId,
        conversationId,
        sessionMemory,
      }

      contextManager.addMessages(messages)

      const result = await runAgentLoop({
        runId,
        client: openAIClient,
        registry,
        sessionMemory,
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
