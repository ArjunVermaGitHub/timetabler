import { createHash, randomBytes } from 'node:crypto'
import { isAdmin, isAllowedEmail, requireUser } from '../_lib/auth.js'
import { DM_TYPE, PUSH_PROVIDER, STAFF_ROOM, staffIdentity, streamServer } from '../_lib/chat.js'
import { getDb } from '../_lib/db.js'
import { HttpError, handle, readJson } from '../_lib/http.js'

const hash = (key) => createHash('sha256').update(key).digest('hex')

async function devices() {
  const db = await getDb()
  const collection = db.collection('chatDevices')
  globalThis.__chatDeviceIndex ??= collection.createIndex({ hash: 1 }, { unique: true })
  await globalThis.__chatDeviceIndex
  return { db, collection }
}

/** Stops Stream pushing to a phone that signed out or lost access. */
async function dropPush(device) {
  if (!device?.pushToken) return
  const { server } = streamServer()
  await server.removeDevice(device.pushToken, device.chatUserId).catch(() => {})
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
    await dropPush(device)
    throw new HttpError(401, error.message)
  }
  return { device, collection }
}

/**
 * Chat notifications for the Android app. Signing in on the site mints a device
 * key (only its hash is stored). With Firebase the app registers its push token
 * here and Stream pushes DMs and staff-room @mentions straight to it; the app
 * also polls now and then as a fallback.
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

  async PUT(req) {
    const { device, collection } = await deviceFor(req)
    const { pushToken } = await readJson(req)
    if (typeof pushToken !== 'string' || !pushToken || pushToken.length > 4096) {
      throw new HttpError(400, 'Missing push token')
    }
    const { server } = streamServer()
    const me = device.chatUserId
    if (device.pushToken && device.pushToken !== pushToken) await dropPush(device)
    await server.addDevice(pushToken, 'firebase', me, PUSH_PROVIDER)
    await server.setPushPreferences([
      { user_id: me, chat_level: 'all' },
      { user_id: me, channel_cid: `${STAFF_ROOM.type}:${STAFF_ROOM.id}`, chat_level: 'mentions' },
    ])
    await collection.updateOne({ _id: device._id }, { $set: { pushToken } })
    return { ok: true }
  },

  async GET(req) {
    const { device, collection } = await deviceFor(req)
    const { server } = streamServer()
    const me = device.chatUserId
    const since = device.checkedAt.toISOString()
    const [room, dms] = await Promise.all([
      server.channel(STAFF_ROOM.type, STAFF_ROOM.id).query({
        messages: { limit: 50, created_at_after: since },
      }),
      // No last_message_at filter: Stream's channel index lags a few seconds behind,
      // and a DM missed now would never be reported once checkedAt moves past it
      server.queryChannels(
        { type: DM_TYPE, members: { $in: [me] } },
        { last_message_at: -1 },
        { limit: 20, message_limit: 25, user_id: me },
      ),
    ])
    const fromOthers = (m) => m.user?.id !== me && Date.parse(m.created_at) >= device.checkedAt.getTime()
    const roomMessages = room.messages ?? []
    const dmMessages = dms.flatMap((c) => c.state.messages).filter(fromOthers)
    const item = (m, title) => ({
      id: m.id,
      from: m.user?.name ?? 'Someone',
      title,
      text: m.text ?? '',
    })
    const mentions = [
      ...roomMessages
        .filter((m) => fromOthers(m) && m.mentioned_users?.some((u) => u.id === me))
        .map((m) => item(m, `${m.user?.name ?? 'Someone'} mentioned you`)),
      ...dmMessages.map((m) => item(m, `Message from ${m.user?.name ?? 'someone'}`)),
    ]
    const messages = [...roomMessages, ...dmMessages]
    // Stream times carry microseconds, so step past the newest message's millisecond
    const newest = messages.reduce(
      (latest, m) => Math.max(latest, (Date.parse(m.created_at) || 0) + 1),
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
    if (key) {
      const { collection } = await devices()
      const device = await collection.findOneAndDelete({ hash: hash(key) })
      await dropPush(device)
    }
    return { ok: true }
  },
})
