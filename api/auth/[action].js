import {
  allowedDomain,
  checkPassword,
  currentUser,
  endSession,
  hashLinkToken,
  hashPassword,
  isAdmin,
  isAllowedEmail,
  isValidEmail,
  newLinkToken,
  normalizeEmail,
  passwordMatches,
  startSession,
} from '../_lib/auth.js'
import { getDb } from '../_lib/db.js'
import { HttpError, handle, readJson, send } from '../_lib/http.js'
import { mailConfigured, sendAccountLink } from '../_lib/mail.js'

const LINK_TTL = { verify: 24 * 60 * 60 * 1000, reset: 60 * 60 * 1000 }
const RESEND_MS = 60 * 1000
const MAX_FAILED_LOGINS = 5
const LOCK_MS = 15 * 60 * 1000

function schoolEmail(value) {
  const email = normalizeEmail(value)
  if (!isValidEmail(email)) throw new HttpError(400, 'Enter a valid email')
  if (!isAllowedEmail(email)) {
    throw new HttpError(403, `Use your ${allowedDomain()} email`)
  }
  return email
}

function appUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  // Local dev only: never build emailed links from a client-supplied Host in production
  if (process.env.VERCEL) throw new Error('APP_URL is not set')
  return `http://${req.headers.host}`
}

/** Store a fresh one-time link for `purpose` and email it (or hand it back in local dev). */
async function sendLink(req, db, email, purpose) {
  const tokens = db.collection('authTokens')
  const now = new Date()
  const recent = await tokens.findOne({
    email,
    purpose,
    createdAt: { $gt: new Date(now.getTime() - RESEND_MS) },
  })
  if (recent) {
    throw new HttpError(429, 'An email was just sent — wait a minute and try again')
  }
  const { token, hash } = newLinkToken()
  await tokens.deleteMany({ email, purpose })
  await tokens.insertOne({
    hash,
    email,
    purpose,
    createdAt: now,
    expiresAt: new Date(now.getTime() + LINK_TTL[purpose]),
  })
  const link = `${appUrl(req)}/?${purpose}=${token}`
  if (mailConfigured()) {
    await sendAccountLink(purpose, email, link)
    return {}
  }
  if (!process.env.VERCEL) {
    console.log(`[timetabler] ${purpose} link for ${email}: ${link}`)
    return { devLink: link }
  }
  throw new HttpError(503, 'Email sending is not set up yet')
}

/** Consume a one-time link token; it can only ever be used once. */
async function useLink(db, token, purpose) {
  const entry = await db.collection('authTokens').findOneAndDelete({
    hash: hashLinkToken(token),
    purpose,
    expiresAt: { $gt: new Date() },
  })
  if (!entry) {
    throw new HttpError(
      400,
      purpose === 'verify'
        ? 'This confirmation link has expired or was already used — sign in to get a new one'
        : 'This reset link has expired or was already used — ask for a new one',
    )
  }
  return entry.email
}

function signIn(res, email) {
  startSession(res, email)
  return { user: { email, admin: isAdmin(email) } }
}

const actions = {
  me: {
    GET(req) {
      return { user: currentUser(req) }
    },
  },

  logout: {
    POST(_req, res) {
      endSession(res)
      return { ok: true }
    },
  },

  register: {
    async POST(req) {
      const body = await readJson(req)
      const email = schoolEmail(body.email)
      const password = checkPassword(body.password)
      const db = await getDb()
      const users = db.collection('users')
      const existing = await users.findOne({ email })
      if (existing?.passwordHash && existing.verified) {
        throw new HttpError(
          409,
          'That email already has an account — sign in or reset your password',
        )
      }
      const now = new Date()
      await users.updateOne(
        { email },
        {
          $set: { passwordHash: await hashPassword(password), verified: false },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      )
      return { ok: true, ...(await sendLink(req, db, email, 'verify')) }
    },
  },

  login: {
    async POST(req, res) {
      const body = await readJson(req)
      const email = schoolEmail(body.email)
      const password = String(body.password ?? '')
      const db = await getDb()
      const users = db.collection('users')
      const user = await users.findOne({ email })
      const now = new Date()

      if (user?.lockedUntil > now) {
        const minutes = Math.ceil((user.lockedUntil - now) / 60000)
        throw new HttpError(
          429,
          `Too many wrong passwords — try again in ${minutes} min or reset your password`,
        )
      }

      if (!(await passwordMatches(password, user?.passwordHash))) {
        if (user) {
          const failed = (user.failedLogins ?? 0) + 1
          await users.updateOne(
            { email },
            failed >= MAX_FAILED_LOGINS
              ? {
                  $set: {
                    failedLogins: 0,
                    lockedUntil: new Date(now.getTime() + LOCK_MS),
                  },
                }
              : { $set: { failedLogins: failed } },
          )
        }
        throw new HttpError(401, 'Wrong email or password')
      }

      if (!user.verified) {
        const sent = await sendLink(req, db, email, 'verify').catch((error) => {
          if (error.status === 429) return {}
          throw error
        })
        throw new HttpError(
          403,
          `Confirm your email first — we've sent a link to ${email}`,
          { unverified: true, ...sent },
        )
      }

      await users.updateOne(
        { email },
        { $set: { lastLoginAt: now, failedLogins: 0 }, $unset: { lockedUntil: '' } },
      )
      return signIn(res, email)
    },
  },

  'verify-email': {
    async POST(req, res) {
      const db = await getDb()
      const email = await useLink(db, (await readJson(req)).token, 'verify')
      await db
        .collection('users')
        .updateOne(
          { email },
          { $set: { verified: true, lastLoginAt: new Date() } },
        )
      return signIn(res, email)
    },
  },

  'forgot-password': {
    async POST(req) {
      const email = schoolEmail((await readJson(req)).email)
      const db = await getDb()
      const user = await db.collection('users').findOne({ email })
      // Same answer whether or not the account exists
      if (!user?.passwordHash) return { ok: true }
      const sent = await sendLink(req, db, email, 'reset').catch((error) => {
        if (error.status === 429) return {}
        throw error
      })
      return { ok: true, ...sent }
    },
  },

  'reset-password': {
    async POST(req, res) {
      const body = await readJson(req)
      const password = checkPassword(body.password)
      const db = await getDb()
      const email = await useLink(db, body.token, 'reset')
      await db.collection('users').updateOne(
        { email },
        {
          // Following the emailed link also proves the address
          $set: {
            passwordHash: await hashPassword(password),
            verified: true,
            failedLogins: 0,
            lastLoginAt: new Date(),
          },
          $unset: { lockedUntil: '' },
        },
      )
      await db.collection('authTokens').deleteMany({ email, purpose: 'reset' })
      return signIn(res, email)
    },
  },
}

const routes = Object.fromEntries(
  Object.entries(actions).map(([name, methods]) => [name, handle(methods)]),
)

export default function auth(req, res) {
  const action = new URL(req.url, 'http://local').pathname.split('/').pop()
  const route = routes[action]
  if (!route) return send(res, 404, { error: 'Not found' })
  return route(req, res)
}
