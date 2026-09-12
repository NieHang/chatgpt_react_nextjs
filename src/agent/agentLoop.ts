import OpenAI from 'openai'
import { ContextManager } from '@/agent/context'
import { ResponseTextDeltaEvent } from 'openai/resources/responses/responses.js'
import { ToolRegistry } from '@/agent/registry'
import type { ResponseInputItem } from 'openai/resources/responses/responses.js'
import { ToolContext } from './type'

type StopReason =
  | 'end_turn'
  | 'max_turns'
  | 'error'
  | 'aborted'
  | 'permission_denied'

interface AgentLoopParams {
  client: OpenAI
  registry: ToolRegistry
  context: ContextManager
  toolContext: ToolContext
  abortSignal?: AbortSignal
  onText?: (text: string) => void
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
}

export async function runAgentLoop({
  client,
  registry,
  context,
  abortSignal,
  onText,
  toolContext,
}: AgentLoopParams): Promise<AgentLoopResult> {
  const maxTurns = 5
  let turnCount = 0

  while (true) {
    if (abortSignal?.aborted) {
      return { reason: 'aborted', turnCount }
    }

    turnCount++

    if (turnCount >= maxTurns) {
      return { reason: 'max_turns', turnCount }
    }

    const { messages, systemPrompt, model } = context.getContext()

    let response

    try {
      const stream = client.responses.stream(
        {
          model,
          instructions: systemPrompt,
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

    for (const toolUse of toolUseBlocks) {
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
  }
}
