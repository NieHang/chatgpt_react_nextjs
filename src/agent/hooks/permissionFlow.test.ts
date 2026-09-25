import type OpenAI from 'openai'
import type { ResponseFunctionToolCall } from 'openai/resources/responses/responses.js'
import { beforeEach, expect, it, vi } from 'vitest'
import { runAgentLoop } from '../agentLoop'
import { ContextManager } from '../context'
import { CostTracker } from '../costTracker'
import { ToolRegistry } from '../registry'
import { SessionMemory } from '../sessionMemory'
import { savePausedRun, type PermissionMode, type ToolPendingExecution } from '../permissions'
import { HookBus } from './hookBus'
import { makePermissionHook } from './builtins'
import type { Hook } from './types'

vi.mock('@/lib/db', () => ({ getDb: vi.fn() }))
vi.mock('../permissions', async (importOriginal) => ({
  ...await importOriginal<typeof import('../permissions')>(),
  savePausedRun: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  vi.mocked(savePausedRun).mockReset().mockResolvedValue(undefined)
})

const call = (id = 'call-1', args = JSON.stringify({ file_id: 'file-1', content: 'new text' })): ResponseFunctionToolCall => ({
  type: 'function_call', name: 'WriteFile', call_id: id, arguments: args,
})

function setup(calls = [call()], mode: PermissionMode = 'default', hooks: Hook[] = []) {
  const execute = vi.fn().mockResolvedValue({ content: 'written', isError: false })
  const registry = new ToolRegistry()
  registry.register({ name: 'WriteFile', description: '', isReadOnly: false, inputSchema: { type: 'object', properties: {} }, execute })
  const responses = [
    { status: 'completed', output_text: '', output: calls },
    { status: 'completed', output_text: 'Done', output: [] },
  ]
  const stream = vi.fn(() => ({ on: vi.fn(), finalResponse: async () => responses.shift() }))
  const client = { responses: { stream } } as unknown as OpenAI
  const context = new ContextManager('test-model', client)
  const hookBus = new HookBus()
  hookBus.register(makePermissionHook(mode))
  hooks.forEach((hook) => hookBus.register(hook))
  const params = {
    runId: 'run-1', client, registry, context, hookBus,
    sessionMemory: new SessionMemory(), costTracker: new CostTracker(),
    toolContext: { userId: 'user-1', conversationId: 'conversation-1' },
  }
  const outputs = () => context.getMessages().filter((item) => item.type === 'function_call_output')
  return { execute, stream, params, outputs, run: () => runAgentLoop(params) }
}

it('pauses before writes with correct identifiers and resumes only the approved call', async () => {
  const pre = vi.fn(() => undefined)
  const scenario = setup([call(), call('call-2')], 'default', [{ name: 'inspect', event: 'PreToolUse', callback: pre }])
  expect(await scenario.run()).toMatchObject({ reason: 'await_permission', extraInfo: { runId: 'run-1', callId: 'call-1' } })
  expect(scenario.execute).not.toHaveBeenCalled()
  expect(scenario.stream).toHaveBeenCalledTimes(1)
  const pausedRun = vi.mocked(savePausedRun).mock.calls[0][0]
  expect(pausedRun).toMatchObject({ approvalCallId: 'call-1', nextToolIndex: 0, toolResults: [] })
  expect(pre).toHaveBeenCalledWith(expect.objectContaining({ toolInput: { file_id: 'file-1', content: 'new text' }, isApproved: false }))
  const result = await runAgentLoop({ ...scenario.params, resume: { pausedRun, callId: 'call-1', userDecision: 'allow' } })
  expect(result).toMatchObject({ reason: 'await_permission', extraInfo: { callId: 'call-2' } })
  expect(scenario.execute).toHaveBeenCalledTimes(1)
  expect(pre).toHaveBeenCalledWith(expect.objectContaining({ isApproved: true }))
  const next = vi.mocked(savePausedRun).mock.calls[1][0]
  expect(next).toMatchObject({ nextToolIndex: 1, approvalCallId: 'call-2' })
  expect(next.toolResults).toHaveLength(1)
  expect((await runAgentLoop({ ...scenario.params, resume: { pausedRun: next, callId: 'call-2', userDecision: 'allow' } })).reason).toBe('end_turn')
  expect(scenario.execute).toHaveBeenCalledTimes(2)
  expect(scenario.outputs()).toHaveLength(2)
  expect(savePausedRun).toHaveBeenCalledTimes(2)
})

it('does not execute a denied call', async () => {
  const scenario = setup()
  await scenario.run()
  const pausedRun = vi.mocked(savePausedRun).mock.calls[0][0]
  expect((await runAgentLoop({ ...scenario.params, resume: { pausedRun, callId: 'call-1', userDecision: 'deny' } })).reason).toBe('end_turn')
  expect(scenario.execute).not.toHaveBeenCalled()
  expect(JSON.stringify(scenario.outputs())).toContain('permission_denied')
})

it('does not let user approval bypass other pre-hook denials', async () => {
  const scenario = setup()
  await scenario.run()
  scenario.params.hookBus.register({ name: 'policy', event: 'PreToolUse', callback: () => ({ block: true, reason: 'Protected file' }) })
  const pausedRun = vi.mocked(savePausedRun).mock.calls[0][0]
  await runAgentLoop({ ...scenario.params, resume: { pausedRun, callId: 'call-1', userDecision: 'allow' } })
  expect(scenario.execute).not.toHaveBeenCalled()
  expect(JSON.stringify(scenario.outputs())).toContain('Protected file')
})

it('gives denial precedence over approval requests without saving a paused run', async () => {
  const scenario = setup([call()], 'default', [{ name: 'policy', event: 'PreToolUse', callback: () => ({ block: true, reason: 'Protected file' }) }])
  await scenario.run()
  expect(scenario.execute).not.toHaveBeenCalled()
  expect(savePausedRun).not.toHaveBeenCalled()
})

it.each(['acceptEdits', 'bypass'] as const)('executes allowed writes without saving approval in %s mode', async (mode) => {
  const scenario = setup([call()], mode)
  expect((await scenario.run()).reason).toBe('end_turn')
  expect(scenario.execute).toHaveBeenCalledTimes(1)
  expect(savePausedRun).not.toHaveBeenCalled()
})

it('does not execute when persisting approval fails', async () => {
  vi.mocked(savePausedRun).mockRejectedValue(new Error('Database unavailable'))
  const scenario = setup()
  expect(await scenario.run()).toMatchObject({ reason: 'error', message: expect.stringContaining('Database unavailable') })
  expect(scenario.execute).not.toHaveBeenCalled()
})

it.each(['{invalid', 'null', '[]'])('returns a tool error for invalid arguments: %s', async (args) => {
  const scenario = setup([call('call-1', args)])
  expect((await scenario.run()).reason).toBe('end_turn')
  expect(scenario.execute).not.toHaveBeenCalled()
  expect(savePausedRun).not.toHaveBeenCalled()
  expect(JSON.stringify(scenario.outputs())).toContain('invalid_tool_arguments')
})

it('passes tool results to post hooks and carries hook context into model input', async () => {
  const post = vi.fn(() => ({ additionalContext: 'post guidance' }))
  const scenario = setup([call()], 'bypass', [
    { name: 'pre', event: 'PreToolUse', callback: () => ({ additionalContext: 'pre guidance' }) },
    { name: 'post', event: 'PostToolUse', callback: post },
  ])
  await scenario.run()
  expect(post).toHaveBeenCalledWith(expect.objectContaining({ toolResult: { content: 'written', isError: false }, toolInput: { file_id: 'file-1', content: 'new text' } }))
  expect(JSON.stringify(scenario.outputs())).toContain('pre guidance')
  expect(JSON.stringify(scenario.outputs())).toContain('post guidance')
})

it.each(['returned', 'thrown'])('emits PostToolUse for %s errors', async (kind) => {
  const post = vi.fn()
  const scenario = setup([call()], 'bypass', [{ name: 'post', event: 'PostToolUse', callback: post }])
  if (kind === 'thrown') scenario.execute.mockRejectedValue(new Error('Failed'))
  else scenario.execute.mockResolvedValue({ content: 'Failed', isError: true })
  await scenario.run()
  expect(post).toHaveBeenCalledTimes(1)
  expect(post).toHaveBeenCalledWith(expect.objectContaining({ isError: true, toolResult: expect.objectContaining({ isError: true, content: expect.stringContaining('Failed') }) }))
})

it.each(['block', 'throw'])('stops subsequent tools after a post-hook %s', async (kind) => {
  const scenario = setup([call(), call('call-2')], 'bypass', [{
    name: 'post', event: 'PostToolUse', failClosed: true,
    callback: () => { if (kind === 'throw') throw new Error('Audit unavailable'); return { block: true, reason: 'Audit rejected' } },
  }])
  expect(await scenario.run()).toMatchObject({ reason: 'error', message: expect.stringContaining('already ran') })
  expect(scenario.execute).toHaveBeenCalledTimes(1)
  expect(scenario.stream).toHaveBeenCalledTimes(1)
})

it('rejects approval for a different call', async () => {
  const scenario = setup()
  await scenario.run()
  const pausedRun: ToolPendingExecution = vi.mocked(savePausedRun).mock.calls[0][0]
  expect(await runAgentLoop({ ...scenario.params, resume: { pausedRun, callId: 'wrong-call', userDecision: 'allow' } })).toMatchObject({ reason: 'error' })
  expect(scenario.execute).not.toHaveBeenCalled()
})
