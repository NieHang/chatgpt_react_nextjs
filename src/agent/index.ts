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
  onText?: (text: string) => void
}

const SYSTEM_PROMPT = `You are a helpful assistant. You will be given a user input and you should respond with a helpful answer. You should also ask the user for clarification if needed.`

export default function initAgentLoop() {
  return {
    runAgentLoop: async (params: RunAgentLoopParams) => {
      const { config, messages, signal, onText } = params
      const openAIClient = getOpenAIClient(config.apiKey)
      const registry = createDefaultToolRegistry()

      const contextManager = new ContextManager(
        config.model,
        SYSTEM_PROMPT,
        openAIClient,
      )

      contextManager.addMessages(messages)

      const result = await runAgentLoop({
        client: openAIClient,
        registry,
        context: contextManager,
        abortSignal: signal,
        onText,
      })

      return result
    },
  }
}
