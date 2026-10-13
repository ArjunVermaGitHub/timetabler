import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { loadModule } from '../lazyModules'
import { appChatUser, inNativeApp, postToApp } from '../nativeApp'
import { navigate } from '../router'

const NEW_MESSAGE = new Set(['message.new', 'notification.message_new'])

function mentionsMe(event, me) {
  const message = event.message
  return Boolean(
    message &&
      message.user?.id !== me.id &&
      message.mentioned_users?.some((user) => user.id === me.id),
  )
}

/**
 * Staff chat connection, unread count, and a desktop notification when
 * someone @mentions you while you're on another tab or another view. The
 * mention is also kept for an in-page toast, which shows even when the
 * browser or OS silently drops desktop notifications.
 */
export function useStaffChat(enabled, onChatView) {
  const [chat, setChat] = useState({ status: enabled ? 'connecting' : 'off' })
  const [unread, setUnread] = useState(0)
  const [mention, setMention] = useState(null)
  const viewing = useRef(onChatView)
  useEffect(() => {
    viewing.current = onChatView
    if (onChatView) setMention(null)
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

  const { client, me } = chat
  useEffect(() => {
    if (!client || !me) return undefined
    const sub = client.on((event) => {
      if (typeof event.total_unread_count === 'number') {
        setUnread(event.total_unread_count)
      }
      if (!NEW_MESSAGE.has(event.type) || !mentionsMe(event, me)) return
      if (!document.hidden && viewing.current) return
      const title = `${event.message.user?.name ?? 'Someone'} mentioned you`
      const body = event.message.text?.slice(0, 160) ?? ''
      if (!viewing.current) setMention({ id: event.message.id, title, body })
      if (inNativeApp()) {
        postToApp({ type: 'notify', id: event.message.id, title, body })
        return
      }
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
      const note = new Notification(title, { body, tag: event.message.id })
      note.onclick = () => {
        window.focus()
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

  return { ...chat, unread, mention, dismissMention: () => setMention(null) }
}
