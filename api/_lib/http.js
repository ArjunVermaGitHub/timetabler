export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

export function send(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

export function query(req) {
  return Object.fromEntries(new URL(req.url, 'http://local').searchParams)
}

export async function readJson(req) {
  // Vercel pre-parses JSON bodies; the Vite dev server hands over the raw stream
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {}
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8') || '{}')
    return req.body
  }
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    throw new HttpError(400, 'Invalid JSON body')
  }
}

/**
 * Method router with uniform error handling. Writes must be JSON so a
 * cross-site form post (no CORS preflight) can never ride the session cookie.
 */
export function handle(methods) {
  return async (req, res) => {
    const fn = methods[req.method]
    if (!fn) return send(res, 405, { error: 'Method not allowed' })
    try {
      if (req.method !== 'GET') {
        const type = req.headers['content-type'] ?? ''
        if (!type.includes('application/json')) {
          throw new HttpError(415, 'Expected application/json')
        }
      }
      const out = await fn(req, res)
      if (!res.writableEnded) send(res, 200, out ?? { ok: true })
    } catch (error) {
      if (error instanceof HttpError) {
        return send(res, error.status, { ...error.extra, error: error.message })
      }
      console.error(error)
      send(res, 500, { error: 'Server error' })
    }
  }
}
