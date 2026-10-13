import { createHash } from 'node:crypto'
import { StreamChat } from 'stream-chat'
import { normalizeEmail } from './auth.js'
import { HttpError } from './http.js'

export const STAFF_ROOM = { type: 'team', id: 'staff-room' }
export const DM_TYPE = 'messaging'
export const SYSTEM_USER = 'timetabler'
export const PUSH_PROVIDER = 'timetabler-fcm'

export function streamServer() {
  const key = process.env.STREAM_API_KEY
  const secret = process.env.STREAM_API_SECRET
  if (!key || !secret) throw new HttpError(503, "Staff chat isn't set up yet")
  return { key, server: StreamChat.getInstance(key, secret) }
}

/** Chat ids follow the teacher record, so a changed email keeps the same history. */
export const teacherChatId = (teacher) => `t-${teacher._id}`
const adminChatId = (email) => `a-${email.replace(/[^a-z0-9@_-]/g, '_')}`

/** Teachers with an email on their record, plus admins; everyone else is refused. */
export async function staffIdentity(db, user) {
  const own = await db
    .collection('teachers')
    .findOne({ email: user.email }, { projection: { name: 1 } })
  if (own) return { id: teacherChatId(own), name: own.name }
  if (user.admin) return { id: adminChatId(user.email), name: user.email.split('@')[0] }
  throw new HttpError(
    403,
    'Staff chat is for teachers. Ask an admin to add your email to your teacher record.',
  )
}

/** Everyone who can chat: teachers with an email, then admins who aren't also teachers. */
export async function staffDirectory(db) {
  const teachers = await db
    .collection('teachers')
    .find({ email: { $nin: [null, ''] } }, { projection: { name: 1, email: 1 } })
    .toArray()
  const adminEmails = new Set(
    (process.env.TIMETABLER_ADMIN_EMAILS ?? '').split(',').map(normalizeEmail).filter(Boolean),
  )
  const teacherEmails = new Set(teachers.map((t) => normalizeEmail(t.email)))
  return [
    ...teachers.map((t) => {
      const email = normalizeEmail(t.email)
      return { id: teacherChatId(t), name: t.name, email, teacher: t.name, admin: adminEmails.has(email) }
    }),
    ...[...adminEmails]
      .filter((email) => !teacherEmails.has(email))
      .map((email) => ({ id: adminChatId(email), name: email.split('@')[0], email, teacher: null, admin: true })),
  ]
}

/** What Stream stores about a person: just enough to show them, no contact details. */
export const streamUser = ({ id, name }) => ({ id, name })

/** One conversation per pair, whoever starts it (Stream ids can't hold '@'). */
export function dmChannelId(a, b) {
  const pair = [a, b].sort().join('|')
  return `dm-${createHash('sha256').update(pair).digest('hex').slice(0, 32)}`
}
