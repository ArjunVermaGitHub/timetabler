import { getToken } from '@clerk/react'

const TIMEOUT_MS = 20_000

export class ApiError extends Error {
  constructor(status, message, data = {}) {
    super(message)
    this.status = status
    this.data = data
  }
}

/** Status 0 means the request never got an answer (offline, timed out, server unreachable). */
export function isNetworkError(error) {
  return error instanceof ApiError && error.status === 0
}

function networkError(timedOut) {
  if (!navigator.onLine) return new ApiError(0, 'No internet connection')
  return new ApiError(
    0,
    timedOut ? 'The server took too long to answer' : "Couldn't reach the server",
  )
}

export async function api(path, { method = 'GET', body } = {}) {
  // The API only accepts JSON writes (CSRF guard), even bodiless ones
  if (method !== 'GET' && body === undefined) body = {}
  const token = await getToken().catch(() => null)
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let response
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
  } catch {
    throw networkError(controller.signal.aborted)
  } finally {
    clearTimeout(timer)
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const fallback =
      response.status >= 500
        ? 'The server ran into a problem'
        : `Request failed (${response.status})`
    throw new ApiError(response.status, data.error ?? fallback, data)
  }
  return data
}
