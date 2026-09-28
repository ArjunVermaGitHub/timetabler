import crypto from 'node:crypto'
import { HttpError } from './http.js'

const COOKIE = 'tt_session'
const SESSION_SECONDS = 60 * 60 * 24 * 14

function secret() {
  const value = process.env.JWT_SECRET
  if (!value || value.length < 32) throw new Error('JWT_SECRET is not set')
  return value
}

function hmac(data) {
  return crypto.createHmac('sha256', secret()).update(data).digest('base64url')
}

function safeEqual(a, b) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && crypto.timingSafeEqual(x, y)
}

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/** ALLOWED_EMAIL_DOMAIN is comma-separated, e.g. "rajghatbesantschool.org,gmail.com". */
export function allowedDomains() {
  return (process.env.ALLOWED_EMAIL_DOMAIN ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean)
}

export function allowedDomain() {
  return allowedDomains()
    .map((d) => `@${d}`)
    .join(' or ')
}

export function isAllowedEmail(email) {
  return allowedDomains().some((domain) => email.endsWith(`@${domain}`))
}

export function isAdmin(email) {
  return (process.env.TIMETABLER_ADMIN_EMAILS ?? '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean)
    .includes(email)
}

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 }

function scrypt(password, salt, { N, r, p, keylen }) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, { N, r, p }, (error, key) =>
      error ? reject(error) : resolve(key),
    )
  })
}

/** `scrypt$N$r$p$salt$hash`, so cost can be raised later without breaking old hashes. */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const key = await scrypt(password, salt, SCRYPT)
  return [
    'scrypt',
    SCRYPT.N,
    SCRYPT.r,
    SCRYPT.p,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$')
}

const DUMMY_HASH = hashPassword('timing-equaliser')

export async function passwordMatches(password, stored) {
  // Unknown emails still pay the hashing cost, so timing doesn't reveal accounts
  const [kind, N, r, p, salt, hash] = String(stored ?? (await DUMMY_HASH)).split('$')
  if (kind !== 'scrypt') return false
  const expected = Buffer.from(hash, 'base64url')
  const key = await scrypt(password, Buffer.from(salt, 'base64url'), {
    N: Number(N),
    r: Number(r),
    p: Number(p),
    keylen: expected.length,
  })
  return crypto.timingSafeEqual(key, expected) && stored != null
}

export function checkPassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters')
  }
  if (password.length > 200) throw new HttpError(400, 'Password is too long')
  return password
}

/** Email links carry a random token; only its hash is stored. */
export function newLinkToken() {
  const token = crypto.randomBytes(32).toString('base64url')
  return { token, hash: hashLinkToken(token) }
}

export function hashLinkToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('base64url')
}

function signSession(email) {
  const payload = Buffer.from(
    JSON.stringify({
      email,
      exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
    }),
  ).toString('base64url')
  return `${payload}.${hmac(`session:${payload}`)}`
}

function verifySession(token) {
  const [payload, sig] = String(token ?? '').split('.')
  if (!payload || !sig || !safeEqual(hmac(`session:${payload}`), sig)) {
    return null
  }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof data.email !== 'string' || data.exp < Date.now() / 1000) {
      return null
    }
    return data
  } catch {
    return null
  }
}

function readCookie(req, name) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

function cookieFlags() {
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production'
  return `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`
}

export function startSession(res, email) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${signSession(email)}; ${cookieFlags()}; Max-Age=${SESSION_SECONDS}`,
  )
}

export function endSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; ${cookieFlags()}; Max-Age=0`)
}

export function currentUser(req) {
  const session = verifySession(readCookie(req, COOKIE))
  // Re-check the domain so tightening ALLOWED_EMAIL_DOMAIN revokes old sessions
  if (!session || !isAllowedEmail(session.email)) return null
  return { email: session.email, admin: isAdmin(session.email) }
}

export function requireUser(req) {
  const user = currentUser(req)
  if (!user) throw new HttpError(401, 'Please sign in')
  return user
}

export function requireAdmin(req) {
  const user = requireUser(req)
  if (!user.admin) throw new HttpError(403, 'Only admins can make changes')
  return user
}
