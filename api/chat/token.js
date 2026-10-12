import { requireUser } from '../_lib/auth.js'
import { STAFF_ROOM, SYSTEM_USER, staffIdentity, streamServer, teacherChatId } from '../_lib/chat.js'
import { getDb } from '../_lib/db.js'
import { handle } from '../_lib/http.js'

/**
 * Signs a staff member into the staff room. Every teacher with an email is
 * registered up front so @mentions can reach people who haven't opened chat yet.
 */
export default handle({
  async GET(req) {
    const user = await requireUser(req)
    const { key, server } = streamServer()
    const db = await getDb()
    const me = await staffIdentity(db, user)
    const teachers = await db
      .collection('teachers')
      .find({ email: { $nin: [null, ''] } }, { projection: { name: 1 } })
      .toArray()
    const staff = teachers.map((t) => ({ id: teacherChatId(t), name: t.name }))
    await server.upsertUsers([
      { id: SYSTEM_USER, name: 'Timetabler' },
      ...staff.filter((s) => s.id !== me.id),
      { ...me, role: user.admin ? 'admin' : 'user' },
    ])

    const channel = server.channel(STAFF_ROOM.type, STAFF_ROOM.id, {
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
      channel: STAFF_ROOM,
    }
  },
})
