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

function NotifyPrompt() {
  const [permission, setPermission] = useState(() =>
    typeof Notification === 'undefined' || inNativeApp() ? 'unsupported' : Notification.permission,
  )
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(NOTIFY_DISMISSED) === '1')
  if (permission !== 'default' || dismissed) return null
  return (
    <div className="chat-notify" role="status">
      <svg className="chat-notify-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
        <path d="M10 20.5a2 2 0 0 0 4 0" />
      </svg>
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
        onClick={() => Notification.requestPermission().then(setPermission)}
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
