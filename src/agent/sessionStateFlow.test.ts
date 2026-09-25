import OpenAI from 'openai'
import { ProxyAgent } from 'undici'
import { expect, it, vi } from 'vitest'
import { ContextManager } from './context'
import { CostTracker } from './costTracker'
import { SessionMemory } from './sessionMemory'
import { ToolRegistry } from './registry'
import { UpdateSessionStateTool } from './tools/updateSessionState'
import { runAgentLoop } from './agentLoop'
import { HookBus } from './hooks/hookBus'

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }))

function setup(
  client: OpenAI,
  task = 'Create a travel plan for Japan',
  message = '旅游计划先这样吧，不想去了',
  model = 'test',
) {
  const memory = new SessionMemory()
  memory.beginTask(task, 'conversation-1')
  memory.recordDecision('Preserve this decision')
  memory.setNextSteps(['Confirm dates'])
  const registry = new ToolRegistry()
  registry.register(UpdateSessionStateTool)
  const context = new ContextManager(model, client)
  context.addMessage({ role: 'user', content: task })
  context.addMessage({
    role: 'assistant',
    content: 'What dates do you have in mind?',
  })
  context.addMessage({ role: 'user', content: message })
  const onText = vi.fn()
  return {
    memory,
    context,
    onText,
    run: () =>
      runAgentLoop({
        runId: 'test-run',
        hookBus: new HookBus(),
        client,
        registry,
        context,
        sessionMemory: memory,
        costTracker: new CostTracker(),
        toolContext: {
          userId: 'test',
          conversationId: 'conversation-1',
          sessionMemory: memory,
        },
        onText,
        abortSignal: AbortSignal.timeout(90_000),
      }),
  }
}

const toolResponse = (args: Record<string, unknown>) => ({
  status: 'completed',
  output_text: '',
  output: [
    {
      type: 'function_call',
      name: 'UpdateSessionState',
      arguments: JSON.stringify(args),
      id: 'fc_1',
      call_id: 'call_1',
    },
  ],
})
const answer = { status: 'completed', output_text: 'Understood.', output: [] }

it('lets the model correct an optional state call and supplies refreshed memory', async () => {
  const responses = [
    toolResponse({ action: 'stop', task: 'Japan trip' }),
    toolResponse({ action: 'stop' }),
    answer,
  ]
  const stream = vi.fn(() => ({
    on: (_event: string, callback: (event: { delta: string }) => void) =>
      callback({ delta: 'text' }),
    finalResponse: async () => responses.shift(),
  }))
  const scenario = setup({ responses: { stream } } as unknown as OpenAI)
  expect((await scenario.run()).reason).toBe('end_turn')
  for (const n of [1, 2, 3]) {
    expect(stream).toHaveBeenNthCalledWith(
      n,
      expect.not.objectContaining({ tool_choice: expect.anything() }),
      expect.anything(),
    )
  }
  expect(stream).toHaveBeenNthCalledWith(
    3,
    expect.not.objectContaining({ tool_choice: expect.anything() }),
    expect.anything(),
  )
  expect(stream).toHaveBeenNthCalledWith(
    3,
    expect.objectContaining({
      instructions: expect.stringContaining('Phase: blocked'),
    }),
    expect.anything(),
  )
  expect(scenario.memory.snapShot()).toMatchObject({
    phase: 'blocked',
    nextSteps: [],
    decisions: ['Preserve this decision'],
  })
  expect(scenario.onText).toHaveBeenCalledTimes(3)
})

it('allows a direct streamed answer without calling the state tool', async () => {
  const stream = vi.fn(() => ({
    on: (_event: string, callback: (event: { delta: string }) => void) =>
      callback({ delta: 'Understood.' }),
    finalResponse: async () => answer,
  }))
  const scenario = setup({ responses: { stream } } as unknown as OpenAI)
  const before = scenario.memory.snapShot()
  expect((await scenario.run()).reason).toBe('end_turn')
  expect(stream).toHaveBeenCalledTimes(1)
  expect(scenario.onText).toHaveBeenCalledWith('Understood.')
  expect(scenario.memory.snapShot()).toEqual(before)
})
