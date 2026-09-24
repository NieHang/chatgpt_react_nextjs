import { PermissionBehavior } from '@/agent/permissions'
import { apiFetch } from '@/lib/apiFetch'

export async function confirmPermission(params: {
  model: string
  conversationId: string
  runId: string
  callId: string
  userDecision: PermissionBehavior
  callBack: (res: Response) => void
}) {
  const response = await recoverPausedRun(params)
  params.callBack(response)
}

export function recoverPausedRun({
  model,
  conversationId,
  runId,
  userDecision,
  callId,
}: {
  model: string
  conversationId: string
  runId: string
  callId: string
  userDecision: PermissionBehavior
}) {
  return apiFetch(`/api/agent/resume`, {
    method: 'POST',
    json: {
      model,
      conversationId,
      runId,
      userDecision,
      callId,
    },
  })
}

