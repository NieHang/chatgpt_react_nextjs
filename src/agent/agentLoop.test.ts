import { expect, it, vi } from 'vitest'
import type OpenAI from 'openai'
import { ContextManager } from './context'
import { runAgentLoop } from './agentLoop'

it('stops when the turn count reaches the limit', async () => {
  const finalResponse = vi.fn().mockResolvedValue({
    status: 'completed',
    output_text: 'Final response text',
    output: [
      {
        type: 'function_call',
        id: 'tool_call_1',
        call_id: 'call_1',
        name: 'tool_name',
        input: {},
      },
    ],
  })

  const stream = vi.fn().mockReturnValue({
    on: vi.fn(),
    finalResponse,
  })

  const client = {
    responses: { stream },
  } as unknown as OpenAI

  const context = new ContextManager('model', 'system prompt', client)

  const result = await runAgentLoop({
    client,
    context,
    abortSignal: new AbortController().signal,
    onText: vi.fn(),
  })

  expect(result.reason).toBe('max_turns')
})

