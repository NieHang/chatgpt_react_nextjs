import type { Hook } from './types'
import {
  checkWritePermission,
  type PermissionDecision,
  type PermissionMode,
} from '../permissions'

export function makePermissionHook(mode: PermissionMode): Hook {
  return {
    name: 'builtin:permission',
    event: 'PreToolUse',
    timeoutMs: Number.POSITIVE_INFINITY,
    failClosed: true,
    callback(input) {
      if (input.event !== 'PreToolUse') return
      const { toolName, toolInput, isReadonly } = input

      if (isReadonly || input.isApproved || mode === 'bypass') return

      let decision: PermissionDecision = {
        behavior: 'ask',
        reason: `executing the tool ${toolName} with side effects: ${JSON.stringify(toolInput)}`,
      }

      if (toolName === 'WriteFile') {
        decision = checkWritePermission(String(toolInput.file_id ?? ''), mode)
      }

      const behavior = decision.behavior
      if (behavior === 'ask') {
        return {
          requestApproval: true,
          reason: decision.reason,
        }
      }
      if (behavior === 'deny') {
        return {
          block: true,
          reason: decision.reason,
        }
      }
    },
  }
}
