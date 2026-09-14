import { runAgentLoop } from '@/agent/agentLoop'
import { ContextManager } from '@/agent/context'
import { AgentConfig } from '@/agent/type'
import getOpenAIClient from '@/lib/openAIClient'
import { ResponseInput } from 'openai/resources/responses/responses.js'
import { createDefaultToolRegistry } from '@/agent/registry'
import { loadMemories, assembleMemory } from '@/agent/memory'

interface RunAgentLoopParams {
  config: AgentConfig
  messages: ResponseInput
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

      const contextManager = new ContextManager(config.model, openAIClient)

      const toolContext = {
        userId,
        conversationId,
      }

      const memory = assembleMemory(
        await loadMemories({
          userId,
          projectName: 'default',
        }),
      )

      if (memory.trim()) {
        contextManager.addMessage({
          role: 'system',
          content: memory,
        })
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
