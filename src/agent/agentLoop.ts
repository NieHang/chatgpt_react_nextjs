import OpenAI from 'openai'
import { ContextManager } from './context'
import { ResponseTextDeltaEvent } from 'openai/resources/responses/responses.js'

type StopReason =
  | 'end_turn'
  | 'max_turns'
  | 'error'
  | 'aborted'
  | 'permission_denied'

interface AgentLoopParams {
  client: OpenAI
  context: ContextManager
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
  context,
  abortSignal,
  onText,
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
        },
        { signal: abortSignal },
      )

      stream.on(
        'response.output_text.delta',
        (event: ResponseTextDeltaEvent) => {
          console.log('Received text delta:', event.delta)
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

    context.addMessage({
      role: 'assistant',
      content: response.output_text,
    })

    const toolUseBlocks = response.output.filter(
      (block) => block.type === 'custom_tool_call',
    )

    if (toolUseBlocks.length === 0) {
      return {
        reason: 'end_turn',
        finalResponse: response.output_text,
        turnCount,
      }
    }
  }
}
