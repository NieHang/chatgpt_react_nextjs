import { SessionMemory } from '@/agent/sessionMemory'
import { describe, expect, it, vi } from 'vitest'
import OpenAI from 'openai'
import { ProxyAgent } from 'undici'
import { ReplaceDecisionTool } from './tools/replaceDecision'
import { ToolRegistry } from './registry'
import { ContextManager } from './context'
import { CostTracker } from './costTracker'
import { runAgentLoop } from './agentLoop'

// Registry imports production file tools; these tests must not connect to MongoDB.
vi.mock('@/lib/db', () => ({ getDb: vi.fn() }))

it('changedFiles deduplication', () => {
  const memory = new SessionMemory()

  memory.recordFile('123')
  memory.recordFile('456')

  expect(memory.snapShot().changedFiles).toStrictEqual(['123', '456'])
})

it('beginTasks clear previous state', () => {
  const memory = new SessionMemory()

  memory.beginTask('task A', '123')
  memory.recordFile('file 1')
  memory.recordDecision('edit file 1')
  memory.setNextSteps(['continue task A'])

  memory.beginTask('task B', '123')

  const snapshot = memory.snapShot()
  expect(snapshot.currentTask).toBe('task B')
  expect(snapshot.changedFiles).toStrictEqual([])
  expect(snapshot.decisions).toStrictEqual([])
  expect(snapshot.nextSteps).toStrictEqual([])
})

it('prompt, only including latest states and warning', () => {
  const memory = new SessionMemory()

  memory.beginTask('validate before publish', '123')
  memory.recordDecision('do not skip failure test')
  memory.setNextSteps(['locate the error'])

  const prompt = memory.toPromptBlock()
  expect(prompt).match(/Phase: working/)
  expect(prompt).match(/do not skip failure test/)
  expect(prompt).match(/Re-check files and decisions/)
})

const oldDecision = 'Save the report as CSV.'
const newDecision = 'Save the report as JSON.'
const otherDecision = 'Keep all existing report rows.'

function createDecisionScenario(client: OpenAI, model = 'test-model') {
  const memory = new SessionMemory()
  memory.beginTask(
    'Create a report containing name Ada and score 7.',
    'test-conversation',
  )
  memory.recordDecision(oldDecision)
  memory.recordDecision(otherDecision)

  const writes: { filename: string; content: string; decisions: string[] }[] =
    []
  const registry = new ToolRegistry()
  registry.register(ReplaceDecisionTool)
  registry.register({
    name: 'SaveReport',
    description:
      'Save a report with the supplied filename and complete content.',
    isReadOnly: false,
    inputSchema: {
      type: 'object',
      properties: {
        filename: {
          type: 'string',
          description: 'Report filename, including extension.',
        },
        content: { type: 'string', description: 'Complete report content.' },
      },
      required: ['filename', 'content'],
    },
    execute(args) {
      if (
        typeof args.filename !== 'string' ||
        typeof args.content !== 'string'
      ) {
        return {
          isError: true,
          content: 'filename and content must be strings',
        }
      }
      // Capture actual action arguments and memory at execution time, not final prose.
      writes.push({
        filename: args.filename,
        content: args.content,
        decisions: memory.snapShot().decisions,
      })
      return { isError: false, content: 'Report saved.' }
    },
  })
  const context = new ContextManager(model, client)
  context.addMessage({
    role: 'user',
    content:
      'Change my previous report-format decision: save the report as JSON instead of CSV. ' +
      `Store the replacement decision exactly as "${newDecision}". ` +
      'Update the stored decision before saving report.json with exactly this object: ' +
      '{"name":"Ada","score":7}. Preserve my other decisions.',
  })
  return {
    memory,
    writes,
    context,
    run: (signal?: AbortSignal) =>
      runAgentLoop({
        client,
        registry,
        context,
        sessionMemory: memory,
        costTracker: new CostTracker(),
        instructions:
          'Use the available tools to perform requested actions. Do not claim an action succeeded unless its tool succeeded.',
        toolContext: {
          userId: 'test-user',
          conversationId: 'test-conversation',
          sessionMemory: memory,
        },
        abortSignal: signal,
      }),
  }
}

function expectNewDecisionWasCarriedOut(
  scenario: ReturnType<typeof createDecisionScenario>,
) {
  const decisions = scenario.memory.snapShot().decisions
  expect(decisions).toContain(newDecision)
  expect(decisions).toContain(otherDecision)
  expect(decisions).not.toContain(oldDecision)
  expect(decisions).toHaveLength(2)
  expect(scenario.writes).toHaveLength(1)
  const [write] = scenario.writes
  expect(write.filename).toBe('report.json')
  expect(JSON.parse(write.content)).toEqual({ name: 'Ada', score: 7 })
  expect(write.decisions).toContain(newDecision)
  expect(write.decisions).toContain(otherDecision)
  expect(write.decisions).not.toContain(oldDecision)
}

describe('ReplaceDecision tool', () => {
  it('replaces the existing decision using schema argument names and preserves other state', async () => {
    const memory = new SessionMemory()
    memory.beginTask('Create report', 'test-conversation')
    memory.recordDecision(oldDecision)
    memory.recordDecision(otherDecision)
    memory.recordFile('existing-file')
    memory.setNextSteps(['Save report'])
    const before = memory.snapShot()

    const result = await ReplaceDecisionTool.execute(
      { old_value: oldDecision, new_value: newDecision },
      { userId: 'test-user', sessionMemory: memory },
    )

    expect(result.isError).toBe(false)
    expect(memory.snapShot()).toEqual({
      ...before,
      decisions: [otherDecision, newDecision],
      updatedAt: expect.any(String),
    })
    expect(memory.toPromptBlock()).toContain(newDecision)
    expect(memory.toPromptBlock()).not.toContain(oldDecision)
  })

  it('executes replacement, refreshes the next model request, and executes the new action (scripted model)', async () => {
    const call = (name: string, args: Record<string, unknown>, id: string) => ({
      type: 'function_call',
      name,
      arguments: JSON.stringify(args),
      call_id: id,
      id,
    })
    const responses = [
      {
        status: 'completed',
        output_text: '',
        output: [
          call(
            'ReplaceDecision',
            { old_value: oldDecision, new_value: newDecision },
            'replace-1',
          ),
        ],
      },
      {
        status: 'completed',
        output_text: '',
        output: [
          call(
            'SaveReport',
            { filename: 'report.json', content: '{"name":"Ada","score":7}' },
            'save-1',
          ),
        ],
      },
      { status: 'completed', output_text: 'Saved report.json.', output: [] },
    ]
    const stream = vi.fn(() => ({
      on: vi.fn(),
      finalResponse: async () => {
        const response = responses.shift()
        if (!response) throw new Error('Unexpected extra model call')
        return response
      },
    }))
    const client = { responses: { stream } } as unknown as OpenAI
    const scenario = createDecisionScenario(client)
    const result = await scenario.run()

    expect(result.reason).toBe('end_turn')
    expectNewDecisionWasCarriedOut(scenario)
    expect(stream).toHaveBeenCalledTimes(3)
    // Read requests through Vitest's argument matcher so the mock needs no SDK casts.
    expect(stream).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        instructions: expect.stringContaining(oldDecision),
      }),
      expect.anything(),
    )
    for (const n of [2, 3]) {
      expect(stream).toHaveBeenNthCalledWith(
        n,
        expect.objectContaining({
          instructions: expect.stringContaining(newDecision),
        }),
        expect.anything(),
      )
      expect(stream).toHaveBeenNthCalledWith(
        n,
        expect.objectContaining({
          instructions: expect.not.stringContaining(oldDecision),
        }),
        expect.anything(),
      )
    }
    expect(stream).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        input: expect.arrayContaining([
          expect.objectContaining({
            type: 'function_call_output',
            call_id: 'replace-1',
            output: expect.stringContaining('"isError":false'),
          }),
        ]),
      }),
      expect.anything(),
    )
  })
})

