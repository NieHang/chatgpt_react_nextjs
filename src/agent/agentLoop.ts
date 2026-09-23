import OpenAI from 'openai'
import { ContextManager } from '@/agent/context'
import { ResponseTextDeltaEvent } from 'openai/resources/responses/responses.js'
import { ToolRegistry } from '@/agent/registry'
import type {
  ParsedResponseFunctionToolCall,
  ResponseInput,
  ResponseInputItem,
} from 'openai/resources/responses/responses.js'
import { ToolContext } from '@/agent/type'
import { CostTracker } from '@/agent/costTracker'
import { SessionMemory } from '@/agent/sessionMemory'
import {
  PermissionBehavior,
  PermissionDecision,
  savePausedRun,
  ToolPendingExecution,
} from '@/agent/permissions'
import { ResponseFunctionToolCall } from 'openai/resources/responses/responses.mjs'

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
  sessionMemory: SessionMemory
  context: ContextManager
  costTracker: CostTracker
  instructions?: string
  toolContext: ToolContext
  abortSignal?: AbortSignal
  onText?: (text: string) => void
  resume?: {
    pausedRun: ToolPendingExecution
    approvedCallId: string
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
  approvalCallId?: string
}

type ToolBatchResult =
  | { reason: 'completed' }
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
}: AgentLoopParams): Promise<AgentLoopResult> {
  const maxTurns = 10
  let turnCount = 0

  async function executeToolBatch({
    toolUseBlocks,
    toolResults,
    startIndex,
    approvalCallId,
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

      const approved = toolUse.call_id === approvalCallId

      if (!tool?.isReadOnly && !approved) {
        const args = JSON.parse(toolUse.arguments)
        let decision: PermissionDecision = {
          behavior: 'allow',
          reason: '',
        }

        if (tool?.name === 'WriteFile' && args.file_id) {
          await savePausedRun({
            runId,
            userId: toolContext.userId,
            conversationId: toolContext.conversationId!,
            instructions: instructions!,
            messages: [...context.getMessages()],
            toolUseBlocks,
            toolResults,
            nextToolIndex: i,
            approvalCallId: toolUse.call_id,
            status: 'awaiting_permission',
          })
          decision = {
            behavior: 'ask',
            reason: `write file: ${args.file_id}?`,
          }
        }

        if (decision.behavior === 'ask') {
          return {
            reason: 'await_permission',
            turnCount,
            message: decision.reason,
            extraInfo: {
              runId,
              callId: toolUse.call_id,
              decision: 'allow',
            },
          }
        }
      }

      console.log(
        `[Tool] Executing tool: ${tool.name} with args:`,
        toolUse.arguments,
      )

      try {
        const result = await tool.execute(
          JSON.parse(toolUse.arguments),
          toolContext,
        )

        const preview = result.content.slice(0, 200)
        console.log(`[Tool] ${result.isError ? 'ERROR' : 'OK'}: ${preview}`)

        if (
          !result.isError &&
          toolUse.name === 'WriteFile' &&
          JSON.parse(toolUse.arguments).file_id
        ) {
          sessionMemory.recordFile(JSON.parse(toolUse.arguments).file_id)
        }

        toolResults.push({
          type: 'function_call_output',
          call_id: toolUse.call_id,
          output: JSON.stringify(result),
        })
      } catch (err) {
        const error = err as Error
        console.error(`[Tool] Exception: ${error.message}`)

        toolResults.push({
          type: 'function_call_output',
          call_id: toolUse.call_id,
          output: JSON.stringify({
            error: 'tool_execution_error',
            message: `Tool execution error: ${error.message}`,
          }),
        })
      }
    }

    context.addMessages(toolResults)

    return {
      reason: 'completed',
    }
  }

  if (resume?.pausedRun) {
    const { toolUseBlocks, toolResults, nextToolIndex, approvalCallId } =
      resume.pausedRun
    const batchResult = await executeToolBatch({
      toolUseBlocks,
      toolResults,
      startIndex: nextToolIndex,
      approvalCallId,
    })

    if (batchResult.reason === 'await_permission') {
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
      approvalCallId: resume?.approvedCallId,
    })

    if (batchResult.reason === 'await_permission') {
      return {
        ...batchResult,
        turnCount,
      }
    }
  }
}
