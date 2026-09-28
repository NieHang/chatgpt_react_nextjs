import { CostTracker } from '@/agent/costTracker'
import { runAgentLoop } from '@/agent/agentLoop'
import { ContextManager } from '@/agent/context'
import { AgentConfig } from '@/agent/type'
import getOpenAIClient from '@/lib/openAIClient'
import { ResponseInput } from 'openai/resources/responses/responses.js'
import { createDefaultToolRegistry } from '@/agent/registry'
import { SessionMemory } from '@/agent/sessionMemory'
import { PermissionBehavior, ToolPendingExecution } from '@/agent/permissions'
import { HookBus } from '@/agent/hooks/hookBus'
import { makePermissionHook } from '@/agent/hooks/builtins'
import { getMcpManager } from '@/agent/mcp/manager'

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
  resume?: {
    pausedRun: ToolPendingExecution
    callId: string
    userDecision: PermissionBehavior
  }
}

export default async function initAgentLoop() {
  const mcp = getMcpManager()
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
        resume,
      } = params
      const openAIClient = getOpenAIClient(config.apiKey)
      const registry = createDefaultToolRegistry()
      for (const tool of mcp.getTools()) registry.register(tool)
      const hookBus = new HookBus()
      hookBus.register(makePermissionHook('default'))
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
        resume,
        hookBus,
      })

      return result
    },
  }
}
