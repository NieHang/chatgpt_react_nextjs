import { apiFetch, fetchJson } from '@/lib/apiFetch'

export function getApiKeyLast4() {
  return fetchJson<string>('/api/key')
}

export function updateApiKey({ apiKey }: { apiKey: string }) {
  return apiFetch('/api/key', {
    method: 'POST',
    json: {
      apiKey,
    },
  })
}
