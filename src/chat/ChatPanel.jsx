import { useMemo, useState } from 'react'
import {
  Channel,
  ChannelHeader,
  Chat,
  MessageComposer,
  MessageList,
  Thread,
  Window,
} from 'stream-chat-react'
import 'stream-chat-react/dist/css/index.css'
import { inNativeApp } from '../nativeApp'

const NOTIFY_DISMISSED = 'timetabler.chat-notify-dismissed'
const BLOCKED_DISMISSED = 'timetabler.chat-notify-blocked-dismissed'

const BELL = (
  <svg className="chat-notify-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </svg>
)

function NotifyPrompt() {
  const [permission, setPermission] = useState(() =>
    typeof Notification === 'undefined' || inNativeApp() ? 'unsupported' : Notification.permission,
  )
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(NOTIFY_DISMISSED) === '1')
  const [blockedDismissed, setBlockedDismissed] = useState(
    () => localStorage.getItem(BLOCKED_DISMISSED) === '1',
  )
  if (permission === 'denied' && !blockedDismissed) {
    return (
      <div className="chat-notify" role="status">
        {BELL}
        <span className="chat-notify-text">
          <strong>Mention notifications are blocked.</strong> Allow notifications for this site
          from the icon beside the address bar, then reload.
        </span>
        <button
          type="button"
          className="chat-notify-later"
          onClick={() => {
            localStorage.setItem(BLOCKED_DISMISSED, '1')
            setBlockedDismissed(true)
          }}
        >
          Got it
        </button>
      </div>
    )
  }
  if (permission === 'granted') {
    return (
      <div className="chat-notify-on">
        Desktop notifications are on.
        <button
          type="button"
          className="chat-notify-test"
          onClick={() =>
            new Notification('Test notification', {
              body: 'If you can see this, @mentions will reach you too.',
            })
          }
        >
          Send a test
        </button>
      </div>
    )
  }
  if (permission !== 'default' || dismissed) return null
  return (
    <div className="chat-notify" role="status">
      {BELL}
      <span className="chat-notify-text">
        <strong>Know when you&apos;re needed.</strong> Get a desktop notification when someone
        @mentions you.
      </span>
      <button
        type="button"
        className="chat-notify-later"
        onClick={() => {
          localStorage.setItem(NOTIFY_DISMISSED, '1')
          setDismissed(true)
        }}
      >
        Not now
      </button>
      <button
        type="button"
        className="hb-btn is-primary"
        onClick={() =>
          Notification.requestPermission().then((result) => {
            setPermission(result)
            if (result === 'granted') {
              new Notification('Notifications are on', {
                body: "You'll see one like this when someone @mentions you.",
              })
            }
          })
        }
      >
        Turn on
      </button>
    </div>
  )
}

export function ChatPanel({ chat, darkMode }) {
  const { client, channelRef } = chat
  const channel = useMemo(
    () => client.channel(channelRef.type, channelRef.id),
    [client, channelRef.type, channelRef.id],
  )
  return (
    <div className="chat-panel">
      <NotifyPrompt />
      <Chat client={client} theme={darkMode ? 'str-chat__theme-dark' : 'str-chat__theme-light'}>
        <Channel channel={channel}>
          <Window>
            <ChannelHeader />
            <MessageList />
            <MessageComposer focus />
          </Window>
          <Thread />
        </Channel>
      </Chat>
    </div>
  )
}
