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
  if (!client.userID) {
    await client.connectUser(session.user, tokenProvider)
    client.on('message.new', (event) => clearSenderTyping(client, event))
  }
  return { client, me: session.user, channelRef: session.channel }
}

/** A message means its sender has stopped typing, even if their typing.stop got lost. */
function clearSenderTyping(client, event) {
  const userId = event.user?.id
  if (!userId || !client.activeChannels[event.cid]?.state.typing[userId]) return
  client.dispatchEvent({ type: 'typing.stop', cid: event.cid, user: event.user })
}

/**
 * Typing events are separate requests, so a typing.start still in flight when a
 * message is sent can land after its typing.stop and leave everyone else seeing
 * "typing…". Hold each stop until the start before it has gone out.
 */
export function orderTypingEvents(channel) {
  if (channel.typingOrdered) return channel
  const keystroke = channel.keystroke.bind(channel)
  const stopTyping = channel.stopTyping.bind(channel)
  let started = Promise.resolve()
  channel.keystroke = (...args) => (started = keystroke(...args).catch(() => {}))
  channel.stopTyping = (...args) => started.then(() => stopTyping(...args))
  channel.typingOrdered = true
  return channel
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
