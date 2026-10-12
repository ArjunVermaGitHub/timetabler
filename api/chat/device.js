import { createHash, randomBytes } from 'node:crypto'
import { isAdmin, isAllowedEmail, requireUser } from '../_lib/auth.js'
import { STAFF_ROOM, staffIdentity, streamServer } from '../_lib/chat.js'
import { getDb } from '../_lib/db.js'
import { HttpError, handle } from '../_lib/http.js'

const hash = (key) => createHash('sha256').update(key).digest('hex')

async function devices() {
  const db = await getDb()
  const collection = db.collection('chatDevices')
  globalThis.__chatDeviceIndex ??= collection.createIndex({ hash: 1 }, { unique: true })
  await globalThis.__chatDeviceIndex
  return { db, collection }
}

/** The phone behind a `Device <key>` header, or a 401 once it's signed out or lost access. */
async function deviceFor(req) {
  const header = req.headers.authorization ?? ''
  const key = header.startsWith('Device ') ? header.slice(7).trim() : ''
  if (!key) throw new HttpError(401, 'Missing device key')
  const { db, collection } = await devices()
  const device = await collection.findOne({ hash: hash(key) })
  if (!device) throw new HttpError(401, 'Unknown device')
  try {
    const user = { email: device.email, admin: isAdmin(device.email) }
    if (!isAllowedEmail(user.email)) throw new HttpError(403, 'No longer allowed')
    const me = await staffIdentity(db, user)
    if (me.id !== device.chatUserId) throw new HttpError(403, 'Chat identity changed')
  } catch (error) {
    await collection.deleteOne({ _id: device._id })
    throw new HttpError(401, error.message)
  }
  return { device, collection }
}

/**
 * Background mention checks for the Android app, which can't use Firebase push.
 * Signing in on the site mints a device key (only its hash is stored); the app
 * polls with it now and then and shows a notification for each new @mention.
 */
export default handle({
  async POST(req) {
    const user = await requireUser(req)
    const { db, collection } = await devices()
    const me = await staffIdentity(db, user)
    const key = randomBytes(32).toString('base64url')
    const now = new Date()
    await collection.insertOne({
      hash: hash(key),
      email: user.email,
      chatUserId: me.id,
      checkedAt: now,
      createdAt: now,
    })
    return { key, userId: me.id }
  },

  async GET(req) {
    const { device, collection } = await deviceFor(req)
    const { server } = streamServer()
    const state = await server.channel(STAFF_ROOM.type, STAFF_ROOM.id).query({
      messages: { limit: 50, created_at_after: device.checkedAt.toISOString() },
    })
    const messages = state.messages ?? []
    const mentions = messages
      .filter(
        (m) =>
          m.user?.id !== device.chatUserId &&
          m.mentioned_users?.some((u) => u.id === device.chatUserId),
      )
      .map((m) => ({ id: m.id, from: m.user?.name ?? 'Someone', text: m.text ?? '' }))
    const newest = messages.reduce(
      (latest, m) => Math.max(latest, Date.parse(m.created_at) || 0),
      device.checkedAt.getTime(),
    )
    await collection.updateOne(
      { _id: device._id },
      { $set: { checkedAt: new Date(newest), lastSeenAt: new Date() } },
    )
    return { mentions }
  },

  async DELETE(req) {
    const header = req.headers.authorization ?? ''
    const key = header.startsWith('Device ') ? header.slice(7).trim() : ''
    if (key) await (await devices()).collection.deleteOne({ hash: hash(key) })
    return { ok: true }
  },
})
