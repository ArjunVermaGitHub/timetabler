import { StreamChat } from 'stream-chat'
import { requireUser } from '../_lib/auth.js'
import { getDb } from '../_lib/db.js'
import { HttpError, handle } from '../_lib/http.js'

const CHANNEL_TYPE = 'team'
const CHANNEL_ID = 'staff-room'
const SYSTEM_USER = 'timetabler'

function streamServer() {
  const key = process.env.STREAM_API_KEY
  const secret = process.env.STREAM_API_SECRET
  if (!key || !secret) throw new HttpError(503, "Staff chat isn't set up yet")
  return { key, server: StreamChat.getInstance(key, secret) }
}

/** Chat ids follow the teacher record, so a changed email keeps the same history. */
const teacherChatId = (teacher) => `t-${teacher._id}`
const adminChatId = (email) => `a-${email.replace(/[^a-z0-9@_-]/g, '_')}`

/**
 * Signs a staff member into the staff room. Every teacher with an email is
 * registered up front so @mentions can reach people who haven't opened chat yet.
 */
export default handle({
  async GET(req) {
    const user = await requireUser(req)
    const { key, server } = streamServer()
    const db = await getDb()
    const teachers = await db
      .collection('teachers')
      .find({ email: { $nin: [null, ''] } }, { projection: { name: 1, email: 1 } })
      .toArray()
    const own = teachers.find((t) => t.email === user.email)
    if (!own && !user.admin) {
      throw new HttpError(403, 'Staff chat is for teachers. Ask an admin to add your email to your teacher record.')
    }

    const me = own
      ? { id: teacherChatId(own), name: own.name }
      : { id: adminChatId(user.email), name: user.email.split('@')[0] }
    const staff = teachers.map((t) => ({ id: teacherChatId(t), name: t.name }))
    await server.upsertUsers([
      { id: SYSTEM_USER, name: 'Timetabler' },
      ...staff.filter((s) => s.id !== me.id),
      { ...me, role: user.admin ? 'admin' : 'user' },
    ])

    const channel = server.channel(CHANNEL_TYPE, CHANNEL_ID, {
      name: 'Staff room',
      created_by_id: SYSTEM_USER,
    })
    await channel.create()
    const members = [...new Set([me.id, ...staff.map((s) => s.id)])]
    await channel.addMembers(members)

    return {
      apiKey: key,
      user: me,
      token: server.createToken(me.id),
      channel: { type: CHANNEL_TYPE, id: CHANNEL_ID },
    }
  },
})
