import { getToken } from '@clerk/react'

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
  const token = await getToken().catch(() => null)
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(response.status, data.error ?? `Request failed (${response.status})`, data)
  }
  return data
}
