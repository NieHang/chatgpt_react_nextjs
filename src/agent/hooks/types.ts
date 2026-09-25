import type { ToolResult } from '../type'

export type HookEvent =
  | 'SessionStart'
  | 'UserPromptSubmit'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'Stop'

export type HookInput =
  | { event: 'SessionStart' }
  | { event: 'UserPromptSubmit'; prompt: string }
  | {
      event: 'PreToolUse'
      toolName: string
      toolInput: Record<string, unknown>
      isReadonly: boolean
      isApproved: boolean
    }
  | {
      event: 'PostToolUse'
      toolName: string
      toolInput: Record<string, unknown>
      isError: boolean
      toolResult: ToolResult
    }
  | { event: 'Stop'; finalText: string }

export interface HookResult {
  block?: boolean
  /** PreToolUse only: pause before execution for user approval. */
  requestApproval?: boolean
  reason?: string
  additionalContext?: string
}

export interface Hook {
  name: string
  event: HookEvent
  matcher?: string
  timeoutMs?: number
  failClosed?: boolean
  callback(input: HookInput): HookResult | void | Promise<HookResult | void>
}

export interface AggregatedResult {
  blocked: boolean
  blockReason?: string
  needsApproval: boolean
  approvalReason?: string
  additionalContexts: string[]
}
