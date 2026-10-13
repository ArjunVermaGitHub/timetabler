import { StreamChat } from 'stream-chat'
import { api } from '../api'

export const DM_TYPE = 'messaging'

let pending = null

async function connect() {
  const session = await api('/api/chat/token')
  const client = StreamChat.getInstance(session.apiKey)
  let first = session.token
  const tokenProvider = async () => {
    if (first) {
      const token = first
      first = null
      return token
    }
    return (await api('/api/chat/token')).token
  }
  if (client.userID && client.userID !== session.user.id) await client.disconnectUser()
  if (!client.userID) await client.connectUser(session.user, tokenProvider)
  // Mentions, DMs and unread counts only reach the page live for watched
  // channels, so watch them from sign-in rather than when chat is first opened
  await Promise.all([
    client.channel(session.channel.type, session.channel.id).watch(),
    client.queryChannels(
      { type: DM_TYPE, members: { $in: [session.user.id] } },
      { last_message_at: -1 },
      { watch: true, state: true, limit: 30 },
    ),
  ])
  return { client, me: session.user, channelRef: session.channel }
}

/**
 * One shared Stream connection for the signed-in staff member. The server
 * hands out the key, identity and a token, and re-issues tokens on expiry.
 */
export function connectStaffChat() {
  pending ??= connect().catch((error) => {
    pending = null
    throw error
  })
  return pending
}

export async function disconnectStaffChat() {
  const connection = pending
  pending = null
  if (!connection) return
  try {
    await (await connection).client.disconnectUser()
  } catch {
    // Already gone
  }
}
