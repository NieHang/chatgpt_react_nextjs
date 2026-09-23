import { PermissionBehavior } from '@/agent/permissions'
import { apiFetch } from '@/lib/apiFetch'

export async function approvePermission(params: {
  model: string
  conversationId: string
  runId: string
  callId: string
  decision: PermissionBehavior
  callBack: (res: Response) => void
}) {
  const response = await recoverPausedRun(params)
  params.callBack(response)
}

export function recoverPausedRun({
  model,
  conversationId,
  runId,
}: {
  model: string
  conversationId: string
  runId: string
}) {
  return apiFetch(`/api/agent/resume`, {
    method: 'POST',
    json: {
      model,
      conversationId,
      runId,
    },
  })
}

