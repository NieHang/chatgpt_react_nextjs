import OpenAI from 'openai'
import { ContextManager } from '@/agent/context'
import { ResponseTextDeltaEvent } from 'openai/resources/responses/responses.js'
import { ToolRegistry } from '@/agent/registry'
import type { ResponseInputItem } from 'openai/resources/responses/responses.js'
import { ToolContext, ToolResult } from '@/agent/type'
import { CostTracker } from '@/agent/costTracker'
import { SessionMemory } from '@/agent/sessionMemory'
import {
  PermissionBehavior,
  savePausedRun,
  ToolPendingExecution,
} from '@/agent/permissions'
import { ResponseFunctionToolCall } from 'openai/resources/responses/responses.mjs'
import { HookBus } from './hooks/hookBus'

type StopReason =
  | 'end_turn'
  | 'max_turns'
  | 'error'
  | 'aborted'
  | 'permission_denied'
  | 'await_permission'

interface AgentLoopParams {
  runId: string
  client: OpenAI
  registry: ToolRegistry
  hookBus: HookBus
  sessionMemory: SessionMemory
  context: ContextManager
  costTracker: CostTracker
  instructions?: string
  toolContext: ToolContext
  abortSignal?: AbortSignal
  onText?: (text: string) => void
  resume?: {
    pausedRun: ToolPendingExecution
    callId: string
    userDecision: PermissionBehavior
  }
}

interface AgentLoopError {
  code?: number
  message?: string
  errorType?: string
  status?: number
}

interface AgentLoopResult extends AgentLoopError {
  reason: StopReason
  finalResponse?: string
  turnCount: number
  extraInfo?: {
    runId?: string
    callId?: string
    decision?: PermissionBehavior
  }
}

type ToolBatchParams = {
  toolUseBlocks: ResponseFunctionToolCall[]
  toolResults: ResponseInputItem.FunctionCallOutput[]
  startIndex: number
  waitForApprovingCallId?: string
  userDecision?: PermissionBehavior
}

type ToolBatchResult =
  | { reason: 'completed' }
  | { reason: 'error'; message: string }
  | {
      reason: 'await_permission'
      message: string
      turnCount: number
      extraInfo: {
        runId: string
        callId: string
        decision: PermissionBehavior
      }
    }

export async function runAgentLoop({
  runId,
  client,
  registry,
  sessionMemory,
  context,
  costTracker,
  instructions,
  abortSignal,
  onText,
  toolContext,
  resume,
  hookBus,
}: AgentLoopParams): Promise<AgentLoopResult> {
  const maxTurns = 10
  let turnCount = 0

  async function executeToolBatch({
    toolUseBlocks,
    toolResults,
    startIndex,
    waitForApprovingCallId,
    userDecision,
  }: ToolBatchParams): Promise<ToolBatchResult> {
    for (let i = startIndex; i < toolUseBlocks.length; i++) {
      const toolUse = toolUseBlocks[i]

      const tool = registry.get(toolUse.name)

      if (!tool) {
        toolResults.push({
          type: 'function_call_output',
          call_id: toolUse.call_id,
          output: JSON.stringify({
            error: 'tool_not_found',
            message: `Tool "${toolUse.name}" not found in registry`,
          }),
        })
        continue
      }

      const matchDecision = toolUse.call_id === waitForApprovingCallId
      const approved = userDecision === 'allow' && matchDecision
      const denied = userDecision === 'deny' && matchDecision

      if (denied) {
        toolResults.push({
          type: 'function_call_output',
          call_id: waitForApprovingCallId,
          output: JSON.stringify({
            error: 'permission_denied',
            message:
              'The user denied this action. It was not executed. Do not retry it without a new user request.',
          }),
        })
        continue
      }

      const args = JSON.parse(toolUse.arguments)

      const preToolUse = await hookBus.emit({
        event: 'PreToolUse',
        toolName: tool.name,
        toolInput: args,
        isReadonly: tool.isReadOnly,
        isApproved: approved,
      })

      if (preToolUse.blocked) {
        console.log(
          `\n[Hook] Blocked ${tool.name}: ${preToolUse.blockReason ?? '(no reason)'}`,
        )
        toolResults.push({
          type: 'function_call_output',
          call_id: toolUse.call_id,
          output: JSON.stringify({
            error: 'hook_blocked',
            message: `Blocked by hook: ${preToolUse.blockReason ?? 'operation not permitted'}`,
            isError: true,
            hookContext: preToolUse.additionalContexts,
          }),
        })
        continue
      }

      // Denial takes precedence over approval requests from other hooks.
      if (preToolUse.needsApproval) {
        try {
          await savePausedRun({
            runId,
            userId: toolContext.userId,
            conversationId: toolContext.conversationId ?? '',
            instructions: instructions ?? '',
            messages: [...context.getMessages()],
            toolUseBlocks,
            toolResults: [...toolResults],
            nextToolIndex: i,
            approvalCallId: toolUse.call_id,
            status: 'awaiting_permission',
          })
        } catch (err) {
          return {
            reason: 'error',
            message: `Could not save pending approval: ${err instanceof Error ? err.message : String(err)}`,
          }
        }
        return {
          reason: 'await_permission',
          turnCount,
          message: preToolUse.approvalReason ?? 'Allow this action?',
          extraInfo: { runId, callId: toolUse.call_id, decision: 'ask' },
        }
      }

      console.log(
        `[Tool] Executing tool: ${tool.name} with args:`,
        toolUse.arguments,
      )

      let result: ToolResult & { error?: string; message?: string }
      try {
        result = await tool.execute(args, toolContext)
      } catch (err) {
        const message = `Tool execution error: ${err instanceof Error ? err.message : String(err)}`
        result = {
          error: 'tool_execution_error',
          message,
          content: message,
          isError: true,
        }
      }

      console.log(
        `[Tool] ${result.isError ? 'ERROR' : 'OK'}: ${result.content.slice(0, 200)}`,
      )

      // Post hooks observe both returned errors and thrown exceptions.
      const postToolUse = await hookBus.emit({
        event: 'PostToolUse',
        toolName: toolUse.name,
        toolInput: args,
        isError: result.isError,
        toolResult: result,
      })

      if (
        !result.isError &&
        toolUse.name === 'WriteFile' &&
        typeof args.file_id === 'string'
      ) {
        sessionMemory.recordFile(args.file_id)
      }

      toolResults.push({
        type: 'function_call_output',
        call_id: toolUse.call_id,
        output: JSON.stringify({
          ...result,
          hookContext: [
            ...preToolUse.additionalContexts,
            ...postToolUse.additionalContexts,
          ],
        }),
      })

      if (postToolUse.blocked) {
        context.addMessages(toolResults)
        return {
          reason: 'error',
          message: `Stopped after ${tool.name}: ${postToolUse.blockReason}. The tool already ran; its side effects have not been rolled back.`,
        }
      }
    }

    context.addMessages(toolResults)

    return {
      reason: 'completed',
    }
  }

  if (resume?.pausedRun) {
    const { toolUseBlocks, toolResults, nextToolIndex } = resume.pausedRun
    const batchResult = await executeToolBatch({
      toolUseBlocks,
      toolResults: [...toolResults],
      startIndex: nextToolIndex,
      waitForApprovingCallId: resume.callId,
      userDecision: resume.userDecision,
    })

    if (batchResult.reason !== 'completed') {
      return {
        ...batchResult,
        turnCount,
      }
    }
  }

  while (true) {
    if (abortSignal?.aborted) {
      return { reason: 'aborted', turnCount }
    }

    await context.maybeCompact()

    turnCount++

    if (turnCount >= maxTurns) {
      return { reason: 'max_turns', turnCount }
    }

    const { messages, model } = context.getContext()

    let response

    try {
      const stream = client.responses.stream(
        {
          model,
          instructions: [instructions, sessionMemory.toPromptBlock()].join(
            '\n\n',
          ),
          input: messages,
          tools: registry.toAPIFormat(),
        },
        { signal: abortSignal },
      )

      stream.on(
        'response.output_text.delta',
        (event: ResponseTextDeltaEvent) => {
          if (onText) onText(event.delta)
        },
      )

      response = await stream.finalResponse()
      if (response.usage) {
        costTracker.add(response.usage, model)
      }
      if (response.status === 'failed') {
        throw new Error(response.error?.message ?? 'OpenAI response failed')
      }
    } catch (error: unknown) {
      if (error instanceof OpenAI.APIError) {
        return {
          reason: 'error',
          turnCount,
          code: error.status,
          message: error.message,
          errorType: error.type,
          status: error.status,
        }
      }
      return {
        reason: 'error',
        turnCount,
        message: error instanceof Error ? error.message : String(error),
      }
    }

    const outputItems = response.output.map((item) => {
      if (item.type === 'function_call') {
        const { parsed_arguments, ...call } = item
        return call
      }

      if (item.type === 'message') {
        return {
          ...item,
          content: item.content.map((part) => {
            const { parsed, ...content } = part
            return content
          }),
        }
      }

      return item
    })

    context.addMessages(outputItems as ResponseInputItem[])

    const toolUseBlocks = response.output.filter(
      (block) => block.type === 'function_call',
    )

    if (toolUseBlocks.length === 0) {
      return {
        reason: 'end_turn',
        finalResponse: response.output_text,
        turnCount,
      }
    }

    const toolResults: ResponseInputItem.FunctionCallOutput[] = []

    const batchResult = await executeToolBatch({
      toolUseBlocks,
      toolResults,
      startIndex: 0,
    })

    if (batchResult.reason !== 'completed') {
      return {
        ...batchResult,
        turnCount,
      }
    }
  }
}
