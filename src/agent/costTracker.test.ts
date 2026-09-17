import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type OpenAI from 'openai'
import { CostTracker } from './costTracker'

const MODEL = 'gpt-4o-mini'
const START = new Date('2026-01-01T00:00:00Z')

function usage(input: number, output: number, cached = 0): OpenAI.Responses.ResponseUsage {
  return {
    input_tokens: input,
    input_tokens_details: { cached_tokens: cached },
    output_tokens: output,
    output_tokens_details: { reasoning_tokens: 0 },
    total_tokens: input + output,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(START)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('CostTracker.add (gpt-4o-mini only)', () => {
  // Independent expected amounts: standard USD / 1M tokens =
  // input $0.15, cached input $0.075, output $0.60.
  // https://developers.openai.com/api/docs/models/gpt-4o-mini
  it.each([
    { name: 'uncached input', input: 10_000, output: 0, cached: 0, billableInput: 10_000, cost: '0.0015' },
    { name: 'output only', input: 0, output: 10_000, cached: 0, billableInput: 0, cost: '0.0060' },
    { name: 'fully cached input', input: 20_000, output: 0, cached: 20_000, billableInput: 0, cost: '0.0015' },
    { name: 'mixed input and output', input: 10_000, output: 2_000, cached: 4_000, billableInput: 6_000, cost: '0.0024' },
    { name: 'zero usage', input: 0, output: 0, cached: 0, billableInput: 0, cost: '0.0000' },
  ])('accounts correctly for $name', ({ input, output, cached, billableInput, cost }) => {
    const tracker = new CostTracker()
    const responseUsage = usage(input, output, cached)
    tracker.add(responseUsage, MODEL)

    const [total, breakdown] = tracker.summary().split('\n')
    expect(total).toBe(`Total: $${cost} Duration: 0s`)
    expect(breakdown).toContain(`${MODEL}: $${cost} (1 call, `)
    expect(breakdown).toContain(`in ${billableInput} / out ${output} / cacheRead ${cached}`)

    // Cached tokens are a subset of input, not additional tokens.
    const counts = breakdown.match(/in (\d+) \/ out (\d+) \/ cacheRead (\d+)/)!
    expect(Number(counts[1]) + Number(counts[2]) + Number(counts[3]))
      .toBe(responseUsage.total_tokens)
  })

  it('accumulates tokens, costs, and calls without counting cached input twice', () => {
    const tracker = new CostTracker()
    tracker.add(usage(10_000, 2_000, 4_000), MODEL) // $0.0024
    tracker.add(usage(20_000, 3_000, 8_000), MODEL) // $0.0042

    const lines = tracker.summary().split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe('Total: $0.0066 Duration: 0s')
    expect(lines[1]).toContain('gpt-4o-mini: $0.0066 (2 call, ')
    expect(lines[1]).toContain('in 18000 / out 5000 / cacheRead 12000')
  })

  it('retains small costs until summary formatting instead of rounding each call', () => {
    const tracker = new CostTracker()
    for (let i = 0; i < 2_000; i++) tracker.add(usage(1, 0), MODEL)

    // Each call costs $0.00000015; together they cost $0.0003.
    expect(tracker.summary()).toContain('Total: $0.0003 Duration: 0s')
    expect(tracker.summary()).toContain('(2000 call, in 2000 / out 0 / cacheRead 0')
  })

  it('does not mutate the API usage object', () => {
    const tracker = new CostTracker()
    const responseUsage = usage(10_000, 2_000, 4_000)
    tracker.add(responseUsage, MODEL)
    expect(responseUsage).toEqual(usage(10_000, 2_000, 4_000))
  })
})

describe('CostTracker.summary', () => {
  it('reports zero cost and no model breakdown before any calls', () => {
    expect(new CostTracker().summary()).toBe('Total: $0.0000 Duration: 0s')
  })

  it.each([
    [1_499, 1],
    [1_500, 2],
    [12_600, 13],
  ])('rounds %i milliseconds to %i seconds since construction', (elapsed, seconds) => {
    const tracker = new CostTracker()
    vi.setSystemTime(START.getTime() + elapsed)
    expect(tracker.summary()).toBe(`Total: $0.0000 Duration: ${seconds}s`)
  })

  it('formats costs to four decimal places without rounding token counts', () => {
    const tracker = new CostTracker()
    tracker.add(usage(1_234, 567), MODEL) // $0.0005253
    expect(tracker.summary()).toContain('Total: $0.0005 Duration: 0s')
    expect(tracker.summary()).toContain('gpt-4o-mini: $0.0005 (1 call, in 1234 / out 567 / cacheRead 0')
  })

  it('does not reset accumulated usage when read repeatedly', () => {
    const tracker = new CostTracker()
    tracker.add(usage(10_000, 2_000, 4_000), MODEL)
    const first = tracker.summary()
    expect(tracker.summary()).toBe(first)
    tracker.add(usage(10_000, 2_000, 4_000), MODEL)
    expect(tracker.summary()).toContain('Total: $0.0048 Duration: 0s')
    expect(tracker.summary()).toContain('(2 call, in 12000 / out 4000 / cacheRead 8000')
  })
})
