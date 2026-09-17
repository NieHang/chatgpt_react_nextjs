import type OpenAI from 'openai'
import { ModelPricing, Breakdown } from '@/agent/type'
import { MODELS } from '@/agent/constants'

const PRICING: Record<string, ModelPricing> = {
  [MODELS['GPT-5.5']]: {
    input: 5,
    output: 30,
    cacheRead: 0.5,
  },
  [MODELS['GPT-5.4']]: {
    input: 2.5,
    output: 15,
    cacheRead: 0.25,
  },
  [MODELS['GPT-4o-mini']]: {
    input: 0.15,
    output: 0.6,
    cacheRead: 0.075,
  },
}

const FALLBACK_PRICING: ModelPricing = {
  input: 3,
  output: 15,
  cacheRead: 0.3,
}

export class CostTracker {
  private totalCostUSD = 0
  private perModel: Record<string, Breakdown> = {}
  private startTime = Date.now()

  add(usage: OpenAI.Responses.ResponseUsage, model: string) {
    const pricing = PRICING[model] ?? FALLBACK_PRICING
    const input = usage.input_tokens - usage.input_tokens_details.cached_tokens
    const output = usage.output_tokens ?? 0
    const cachedTokens = usage.input_tokens_details.cached_tokens ?? 0

    const cost =
      (input * pricing.input +
        output * pricing.output +
        cachedTokens * pricing.cacheRead) /
      1_000_000

    this.totalCostUSD += cost

    const b = (this.perModel[model] ??= {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      costUSD: 0,
      calls: 0,
    })
    b.input += input
    b.output += output
    b.cacheRead += cachedTokens
    b.costUSD += cost
    b.calls += 1
  }

  summary(): string {
    const dur = Math.round((Date.now() - this.startTime) / 1000)
    const lines = [`Total: $${this.totalCostUSD.toFixed(4)} Duration: ${dur}s`]
    for (const [model, b] of Object.entries(this.perModel)) {
      lines.push(
        ` ${model}: $${b.costUSD.toFixed(4)} (${b.calls} call, ` +
          `in ${b.input} / out ${b.output} / cacheRead ${b.cacheRead}`,
      )
    }
    return lines.join('\n')
  }
}

