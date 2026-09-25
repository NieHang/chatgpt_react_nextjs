import type {
  Hook,
  HookEvent,
  HookInput,
  HookResult,
  AggregatedResult,
} from './types'

const DEFAULT_HOOK_TIMEOUT_MS = 5000

export class HookBus {
  private hooks = new Map<HookEvent, Hook[]>()

  register(hook: Hook): void {
    const bucket = this.hooks.get(hook.event) ?? []
    bucket.push(hook)
    this.hooks.set(hook.event, bucket)
  }

  private getMatching(input: HookInput): Hook[] {
    const bucket = this.hooks.get(input.event) ?? []

    let matchQuery = undefined

    switch (input.event) {
      case 'PreToolUse':
      case 'PostToolUse':
        matchQuery = input.toolName
        break
      // TODO: implement 'SessionStart' and other hook events in need
    }

    return bucket.filter((h) => {
      if (!h.matcher || h.matcher === '*') return true
      if (matchQuery === undefined) return true
      return h.matcher === matchQuery
    })
  }

  async emit(input: HookInput): Promise<AggregatedResult> {
    const matching = this.getMatching(input)

    if (matching.length === 0)
      return {
        blocked: false,
        needsApproval: false,
        additionalContexts: [],
      }

    const aggregated: AggregatedResult = {
      blocked: false,
      needsApproval: false,
      additionalContexts: [],
    }

    for (const hook of matching) {
      const budget = hook.timeoutMs ?? DEFAULT_HOOK_TIMEOUT_MS
      let result: HookResult | void
      try {
        result = await withTimeout(
          Promise.resolve(hook.callback(input)),
          budget,
          hook.name,
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.log(`[Hook] ${hook.name} failed: ${message}`)

        if (hook.failClosed) {
          aggregated.blocked = true
          aggregated.blockReason ??= `Hook ${hook.name} failed: ${message}`
        }

        continue
      }

      if (!result) continue

      if (result.block) {
        aggregated.blocked = true
        aggregated.blockReason ??= result.reason ?? `Blocked by hook ${hook.name}`
      }

      if (result.requestApproval && input.event === 'PreToolUse') {
        aggregated.needsApproval = true
        aggregated.approvalReason ??= result.reason ?? 'Allow this action?'
      }

      if (result.additionalContext) {
        aggregated.additionalContexts.push(result.additionalContext)
      }
    }

    return aggregated
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, name: string): Promise<T> {
  if (!Number.isFinite(ms)) return p

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Hook ${name} timed out after ${ms}ms`)),
      ms,
    )
    p.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}
