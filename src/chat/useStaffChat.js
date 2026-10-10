import { useEffect, useRef, useState } from 'react'
import { loadModule } from '../lazyModules'
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
 * someone @mentions you while you're on another tab or another view.
 */
export function useStaffChat(enabled, onChatView) {
  const [chat, setChat] = useState({ status: enabled ? 'connecting' : 'off' })
  const [unread, setUnread] = useState(0)
  const viewing = useRef(onChatView)
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

  const { client, me } = chat
  useEffect(() => {
    if (!client || !me) return undefined
    const sub = client.on((event) => {
      if (typeof event.total_unread_count === 'number') {
        setUnread(event.total_unread_count)
      }
      if (!NEW_MESSAGE.has(event.type) || !mentionsMe(event, me)) return
      if (!document.hidden && viewing.current) return
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
      const note = new Notification(`${event.message.user?.name ?? 'Someone'} mentioned you`, {
        body: event.message.text?.slice(0, 160) ?? '',
        tag: event.message.id,
      })
      note.onclick = () => {
        window.focus()
        navigate('/chat')
        note.close()
      }
    })
    return () => sub.unsubscribe()
  }, [client, me])

  return { ...chat, unread }
}
