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

function NotifyPrompt() {
  const [permission, setPermission] = useState(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  if (permission !== 'default') return null
  return (
    <div className="chat-notify" role="status">
      Get a desktop notification when someone @mentions you.
      <button
        type="button"
        className="hb-btn is-secondary"
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
