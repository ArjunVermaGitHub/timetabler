import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { loadModule } from '../lazyModules'
import { appChatUser, inNativeApp, postToApp } from '../nativeApp'
import { navigate } from '../router'

const NEW_MESSAGE = new Set(['message.new', 'notification.message_new'])
const DM_TYPE = 'messaging'

/** The alert title for a message worth interrupting someone for, or null. */
function alertTitle(event, me) {
  const message = event.message
  if (!message || message.user?.id === me.id) return null
  const name = message.user?.name ?? 'Someone'
  if (event.channel_type === DM_TYPE) return `Message from ${name}`
  if (message.mentioned_users?.some((user) => user.id === me.id)) return `${name} mentioned you`
  return null
}

/**
 * Staff chat connection, unread count, and a desktop notification for an
 * @mention or a direct message while you're not reading that conversation.
 * The alert is also kept for an in-page toast, which shows even when the
 * browser or OS silently drops desktop notifications.
 */
export function useStaffChat(enabled, onChatView) {
  const [chat, setChat] = useState({ status: enabled ? 'connecting' : 'off' })
  const [unread, setUnread] = useState(0)
  const [mention, setMention] = useState(null)
  const [requestedCid, setRequestedCid] = useState(null)
  const [wasOnChat, setWasOnChat] = useState(onChatView)
  if (wasOnChat !== onChatView) {
    setWasOnChat(onChatView)
    if (onChatView) setMention(null)
  }
  const viewing = useRef(onChatView)
  const activeCid = useRef(null)
  useEffect(() => {
    viewing.current = onChatView
  }, [onChatView])

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    loadModule('chatClient')
      .then((m) => m.connectStaffChat())
      .then((connection) => {
        if (cancelled) return
        setChat({ status: 'ready', ...connection })
        setUnread(connection.client.user?.total_unread_count ?? 0)
      })
      .catch((error) => {
        if (!cancelled) setChat({ status: 'error', error: error.message })
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  const openConversation = useCallback((cid) => {
    setMention(null)
    setRequestedCid(cid)
    navigate('/chat')
  }, [])

  const { client, me } = chat
  useEffect(() => {
    if (!client || !me) return undefined
    const sub = client.on((event) => {
      if (typeof event.total_unread_count === 'number') {
        setUnread(event.total_unread_count)
      }
      // Someone started a conversation with you: watch it so its messages arrive live
      if (event.type === 'notification.added_to_channel' && event.channel_type === DM_TYPE) {
        client.channel(event.channel_type, event.channel_id).watch().catch(() => {})
      }
      if (!NEW_MESSAGE.has(event.type)) return
      const title = alertTitle(event, me)
      if (!title) return
      const reading = viewing.current && activeCid.current === event.cid
      // A window behind another one still counts as visible, so only focus
      // means the person is actually reading the conversation
      if (reading && document.hasFocus()) return
      const body = event.message.text?.slice(0, 160) ?? ''
      if (!reading) setMention({ id: event.message.id, cid: event.cid, title, body })
      if (inNativeApp()) {
        postToApp({ type: 'notify', id: event.message.id, title, body })
        return
      }
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
      const note = new Notification(title, { body, tag: event.message.id })
      note.onclick = () => {
        window.focus()
        setRequestedCid(event.cid)
        navigate('/chat')
        note.close()
      }
    })
    return () => sub.unsubscribe()
  }, [client, me])

  // In the Android app, hand it a device key so it can check for mentions while closed
  useEffect(() => {
    if (!me || !inNativeApp() || appChatUser() === me.id) return
    api('/api/chat/device', { method: 'POST' })
      .then(({ key, userId }) => postToApp({ type: 'chat-device', key, userId }))
      .catch(() => {})
  }, [me])

  const dismissMention = useCallback(() => setMention(null), [])
  const clearRequested = useCallback(() => setRequestedCid(null), [])
  const setActiveCid = useCallback((cid) => {
    activeCid.current = cid
  }, [])
  return {
    ...chat,
    unread,
    mention,
    dismissMention,
    openConversation,
    requestedCid,
    clearRequested,
    setActiveCid,
  }
}
