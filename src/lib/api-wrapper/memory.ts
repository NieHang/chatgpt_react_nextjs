import { apiFetch, fetchJson } from '@/lib/apiFetch'

export function getProjectMemory(projectName: string) {
  return fetchJson<string>(`/api/memory/${encodeURIComponent(projectName)}`)
}

export function updateProjectMemory({
  content,
  projectName,
}: {
  content: string
  projectName: string
}) {
  return apiFetch(`/api/memory/${encodeURIComponent(projectName)}`, {
    method: 'POST',
    json: {
      content,
    },
  })
}
