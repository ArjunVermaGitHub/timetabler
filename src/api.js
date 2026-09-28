export class ApiError extends Error {
  constructor(status, message, data = {}) {
    super(message)
    this.status = status
    this.data = data
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  // The API only accepts JSON writes (CSRF guard), even bodiless ones
  if (method !== 'GET' && body === undefined) body = {}
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(response.status, data.error ?? `Request failed (${response.status})`, data)
  }
  return data
}
