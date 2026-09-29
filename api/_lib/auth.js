import { createClerkClient, verifyToken } from '@clerk/backend'
import { HttpError } from './http.js'

function secretKey() {
  const value = process.env.CLERK_SECRET_KEY
  if (!value) throw new Error('CLERK_SECRET_KEY is not set')
  return value
}

let clerk = null
function clerkClient() {
  clerk ??= createClerkClient({ secretKey: secretKey() })
  return clerk
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

function bearerToken(req) {
  const header = req.headers.authorization ?? ''
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null
}

/** The site the request was made to; Clerk tokens minted for any other site are refused. */
function requestOrigin(req) {
  const host = req.headers['x-forwarded-host'] ?? req.headers.host
  const proto =
    req.headers['x-forwarded-proto'] ??
    (process.env.VERCEL ? 'https' : 'http')
  return `${String(proto).split(',')[0]}://${host}`
}

const EMAIL_TTL_MS = 5 * 60 * 1000
const emailCache = new Map()

/** Only a verified primary address counts; cached briefly to spare the Clerk API. */
async function verifiedEmail(userId) {
  const cached = emailCache.get(userId)
  if (cached && cached.at > Date.now() - EMAIL_TTL_MS) return cached.email
  const user = await clerkClient().users.getUser(userId)
  const primary = user.emailAddresses.find(
    (address) => address.id === user.primaryEmailAddressId,
  )
  const email =
    primary?.verification?.status === 'verified'
      ? normalizeEmail(primary.emailAddress)
      : null
  emailCache.set(userId, { email, at: Date.now() })
  return email
}

/** `null` when signed out; `{ email: null }` when signed in without a usable school email. */
export async function currentUser(req) {
  const token = bearerToken(req)
  if (!token) return null
  let claims
  try {
    claims = await verifyToken(token, {
      secretKey: secretKey(),
      authorizedParties: [requestOrigin(req)],
    })
  } catch {
    return null
  }
  const email = await verifiedEmail(claims.sub)
  if (!email || !isAllowedEmail(email)) return { email, allowed: false }
  return { email, allowed: true, admin: isAdmin(email) }
}

export async function requireUser(req) {
  const user = await currentUser(req)
  if (!user) throw new HttpError(401, 'Please sign in')
  if (!user.allowed) {
    throw new HttpError(403, `Sign in with your ${allowedDomain()} email`)
  }
  return user
}

export async function requireAdmin(req) {
  const user = await requireUser(req)
  if (!user.admin) throw new HttpError(403, 'Only admins can make changes')
  return user
}
