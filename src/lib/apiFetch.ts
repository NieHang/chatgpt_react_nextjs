type ApiFetchInit = RequestInit & {
  json?: unknown
}

export function apiFetch(
  input: RequestInfo | URL,
  init: ApiFetchInit = {}
): Promise<Response> {
  const { json, headers, body, ...rest } = init
  const mergedHeaders = new Headers(headers ?? {})

  if (json !== undefined && !mergedHeaders.has('Content-Type')) {
    mergedHeaders.set('Content-Type', 'application/json')
  }

  return fetch(input, {
    ...rest,
    body: json !== undefined ? JSON.stringify(json) : body,
    headers: mergedHeaders,
  })
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init: ApiFetchInit = {}
): Promise<T> {
  const response = await apiFetch(input, {
    method: init.method ?? 'GET',
    ...init,
  })

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}
