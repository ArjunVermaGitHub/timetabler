import { StreamChat } from 'stream-chat'
import { api } from '../api'

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
