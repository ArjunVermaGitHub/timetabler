import { requireUser } from '../_lib/auth.js'
import {
  STAFF_ROOM,
  SYSTEM_USER,
  staffDirectory,
  staffIdentity,
  streamServer,
  streamUser,
} from '../_lib/chat.js'
import { getDb } from '../_lib/db.js'
import { handle } from '../_lib/http.js'

/**
 * Signs a staff member into the staff room. Everyone who can chat is registered
 * up front so @mentions and DMs can reach people who haven't opened chat yet.
 * Nobody gets Stream's admin role, which could read every DM.
 */
export default handle({
  async GET(req) {
    const user = await requireUser(req)
    const { key, server } = streamServer()
    const db = await getDb()
    const me = await staffIdentity(db, user)
    const staff = await staffDirectory(db)
    await server.upsertUsers([
      { id: SYSTEM_USER, name: 'Timetabler' },
      ...staff.filter((s) => s.id !== me.id).map(streamUser),
      { ...me, role: 'user' },
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
