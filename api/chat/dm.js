import { requireUser } from '../_lib/auth.js'
import {
  DM_TYPE,
  dmChannelId,
  staffDirectory,
  staffIdentity,
  streamServer,
  streamUser,
} from '../_lib/chat.js'
import { getDb } from '../_lib/db.js'
import { HttpError, handle, readJson } from '../_lib/http.js'

/**
 * Direct messages between two staff members. Only the server creates them, so a
 * conversation always has exactly the two people in it and nobody else can read it.
 */
export default handle({
  /** Everyone on staff chat, by name, with what their profile card shows. */
  async GET(req) {
    const user = await requireUser(req)
    const db = await getDb()
    await staffIdentity(db, user)
    const staff = await staffDirectory(db)
    return { staff: staff.sort((a, b) => a.name.localeCompare(b.name)) }
  },

  /** Opens (creating if needed) your conversation with `userId`. */
  async POST(req) {
    const user = await requireUser(req)
    const { userId } = await readJson(req)
    const db = await getDb()
    const me = await staffIdentity(db, user)
    const them = (await staffDirectory(db)).find((s) => s.id === userId)
    if (!them || them.id === me.id) throw new HttpError(404, "That person isn't on staff chat")
    const { server } = streamServer()
    await server.upsertUsers([streamUser(them)])
    const id = dmChannelId(me.id, them.id)
    const channel = server.channel(DM_TYPE, id, { created_by_id: me.id, members: [me.id, them.id] })
    await channel.create()
    return { type: DM_TYPE, id }
  },
})
