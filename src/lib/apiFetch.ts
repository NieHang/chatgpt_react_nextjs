type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

type ApiFetchInit = RequestInit & {
  json?: unknown
}

export function apiFetch(
  input: RequestInfo | URL,
  init: ApiFetchInit = {},
): Promise<Response> {
  const { json, headers, body, method, ...rest } = init
  const mergedHeaders = new Headers(headers ?? {})
  const requestMethod = (method ?? 'GET').toUpperCase()
  const requestInit: RequestInit = {
    ...rest,
    method: requestMethod,
    headers: mergedHeaders,
  }

  if (json !== undefined && !mergedHeaders.has('Content-Type')) {
    mergedHeaders.set('Content-Type', 'application/json')
  }

  if (requestMethod !== 'GET' && requestMethod !== 'HEAD') {
    requestInit.body = json !== undefined ? JSON.stringify(json) : body
  }

  return fetch(input, requestInit).catch((error) => {
    console.error('Network error:', error)
    throw error
  })
}

export async function fetchJson<T>(
  input: RequestInfo | URL,
  init: ApiFetchInit = {},
): Promise<ApiResponse<T>> {
  const response = await apiFetch(input, {
    method: init.method ?? 'GET',
    ...init,
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return {
    code: body?.code,
    message: body?.message,
    data: body?.data,
  }
}

