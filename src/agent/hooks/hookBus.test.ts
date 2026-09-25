import { afterEach, expect, it, vi } from 'vitest'
import { HookBus } from './hookBus'
import type { HookInput } from './types'

const input: HookInput = {
  event: 'PreToolUse', toolName: 'WriteFile', toolInput: {},
  isReadonly: false, isApproved: false,
}

afterEach(() => vi.useRealTimers())

it('matches events and tool names, aggregates context, and preserves denials', async () => {
  const bus = new HookBus()
  const unrelated = vi.fn()
  bus.register({ name: 'read', event: 'PreToolUse', matcher: 'ReadFile', callback: unrelated })
  bus.register({ name: 'post', event: 'PostToolUse', callback: unrelated })
  bus.register({ name: 'ask', event: 'PreToolUse', matcher: '*', callback: () => ({ requestApproval: true, reason: 'Approve write', additionalContext: 'context' }) })
  bus.register({ name: 'deny', event: 'PreToolUse', matcher: 'WriteFile', callback: () => ({ block: true, reason: 'Protected file' }) })
  expect(await bus.emit(input)).toEqual({
    blocked: true, blockReason: 'Protected file', needsApproval: true,
    approvalReason: 'Approve write', additionalContexts: ['context'],
  })
  expect(unrelated).not.toHaveBeenCalled()
})

it.each([false, true])('handles timeouts with failClosed=%s', async (failClosed) => {
  vi.useFakeTimers()
  const bus = new HookBus()
  bus.register({ name: 'slow', event: 'PreToolUse', timeoutMs: 10, failClosed, callback: () => new Promise(() => {}) })
  const pending = bus.emit(input)
  await vi.advanceTimersByTimeAsync(10)
  expect(await pending).toMatchObject({ blocked: failClosed, needsApproval: false })
})

it('fails closed on synchronous exceptions, including non-Error throws', async () => {
  const bus = new HookBus()
  bus.register({ name: 'broken', event: 'PreToolUse', failClosed: true, callback: () => { throw 'unavailable' } })
  expect(await bus.emit(input)).toMatchObject({ blocked: true, blockReason: 'Hook broken failed: unavailable' })
})
