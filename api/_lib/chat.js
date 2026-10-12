import { StreamChat } from 'stream-chat'
import { HttpError } from './http.js'

export const STAFF_ROOM = { type: 'team', id: 'staff-room' }
export const SYSTEM_USER = 'timetabler'

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
