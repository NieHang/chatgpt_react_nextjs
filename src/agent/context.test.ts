import { afterEach, describe, expect, it, vi } from 'vitest'
import type OpenAI from 'openai'
import type { ResponseInput } from 'openai/resources/responses/responses.js'
import { ContextManager } from './context'

afterEach(() => {
  vi.restoreAllMocks()
})

function setup(messageCount = 15) {
  const create = vi.fn().mockResolvedValue({
    output_text: 'Previously inspected config.ts',
  })

  const client = {
    responses: { create },
  } as unknown as OpenAI

  const context = new ContextManager('test-model', client)

  const messages: ResponseInput = Array.from(
    { length: messageCount },
    (_, i) => ({
      role: 'user',
      content: `message-[${i}]`,
    }),
  )

  context.addMessages(messages)

  return {
    context,
    create,
    messages,
  }
}

describe('ContextManager.maybeCompact', () => {
  it('skips compaction below the threshold', async () => {
    const { context, create, messages } = setup()

    vi.spyOn(context, 'getEstimatedTokens').mockReturnValue(79_999)

    expect(await context.maybeCompact()).toBe(false)
    expect(create).not.toHaveBeenCalled()
    expect(context.getMessages()).toEqual(messages)
  })

  it('compacts at the threshold and preserves the latest 10 items', async () => {
    const { context, create, messages } = setup()

    vi.spyOn(context, 'getEstimatedTokens')
      .mockReturnValueOnce(80_000)
      .mockReturnValueOnce(1_000)

    expect(await context.maybeCompact()).toBe(true)
    expect(create).toHaveBeenCalledTimes(1)

    // Only the first 5 of the 15 items should be summarized.
    const request = create.mock.calls[0][0]
    expect(request.input).toEqual([
      {
        role: 'user',
        content:
          'Summarize this conversation:\n\n' +
          messages
            .slice(0, 5)
            .map((_, i) => `[USER]: message-[${i}]`)
            .join('\n'),
      },
    ])

    const compacted = context.getMessages()

    // Summary + assistant acknowledgment + 10 recent items.
    expect(compacted).toHaveLength(12)
    expect(compacted[0]).toEqual({
      role: 'user',
      content:
        '[Previous conversation summary]\nPreviously inspected config.ts',
    })
    expect(compacted.slice(2)).toEqual(messages.slice(-10))
  })

  it('keeps the latest 20 items if summarization fails', async () => {
    const { context, create, messages } = setup(25)

    vi.spyOn(context, 'getEstimatedTokens').mockReturnValue(80_000)
    create.mockRejectedValueOnce(new Error('API unavailable'))

    expect(await context.maybeCompact()).toBe(false)
    expect(create).toHaveBeenCalledTimes(1)
    expect(context.getMessages()).toEqual(messages.slice(-20))
  })
})
