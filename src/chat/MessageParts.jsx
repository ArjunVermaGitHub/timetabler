import { useContext } from 'react'
import {
  ContextMenuButton,
  MessageActions,
  WithComponents,
  defaultMessageActionSet,
  useChannelStateContext,
  useComponentContextIcons,
  useContextMenuContext,
  useMessageContext,
} from 'stream-chat-react'
import { AskDeleteContext } from './askDelete'

const isDeleted = (message) => message.type === 'deleted' || Boolean(message.deleted_at)

/** Stable per person, so a name keeps its colour across the conversation. */
function hueFor(id) {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return (hash % 12) * 30
}

/**
 * The sender's name at the top of their bubble in group conversations (CSS keeps it to the
 * first of a run). Drawn from the message text renderer, the only hook inside the bubble, so
 * it skips text that isn't this message's own (a quoted reply's).
 */
export function SenderName({ text }) {
  const { message, isMyMessage, onUserClick, onUserHover } = useMessageContext()
  const { channel } = useChannelStateContext()
  const group = Object.keys(channel?.state?.members ?? {}).length > 2
  if (!group || !message.user || isMyMessage() || text !== message.text) return null
  return (
    <button
      type="button"
      className="chat-sender"
      style={{ '--sender-hue': hueFor(message.user.id) }}
      onClick={onUserClick}
      onMouseOver={onUserHover}
    >
      {message.user.name || message.user.id}
    </button>
  )
}

function DeletedBubble() {
  const { isMyMessage } = useMessageContext()
  const { IconNoSign } = useComponentContextIcons()
  return (
    <div className="str-chat__message-bubble chat-deleted">
      <div className="str-chat__message-text">
        <IconNoSign />
        <span>{isMyMessage() ? 'You deleted this message' : 'This message was deleted'}</span>
      </div>
    </div>
  )
}

function DeleteAction() {
  const ask = useContext(AskDeleteContext)
  const { closeMenu } = useContextMenuContext()
  const { handleDelete, message } = useMessageContext()
  const { channel } = useChannelStateContext()
  const { IconDelete } = useComponentContextIcons()
  if (isDeleted(message)) return null
  const audience =
    channel.type === 'team'
      ? 'everyone in the staff room'
      : Object.keys(channel.state.members).length > 2
        ? 'everyone in this conversation'
        : 'both of you'
  return (
    <ContextMenuButton
      aria-label="Delete message"
      className="str-chat__message-actions-list-item-button"
      Icon={IconDelete}
      role="menuitem"
      variant="destructive"
      onClick={() => {
        closeMenu()
        ask({ message, audience, remove: handleDelete })
      }}
    >
      Delete message
    </ContextMenuButton>
  )
}

const ACTIONS = defaultMessageActionSet.map((action) =>
  action.type === 'delete' ? { ...action, Component: DeleteAction } : action,
)

function ChatMessageActions(props) {
  return <MessageActions {...props} messageActionSet={ACTIONS} />
}

const OVERRIDES = {
  MessageActions: ChatMessageActions,
  MessageDeletedBubble: DeletedBubble,
}

/** Our sender names, delete flow and deleted-message bubble for the messages inside. */
export function MessageParts({ children }) {
  return <WithComponents overrides={OVERRIDES}>{children}</WithComponents>
}

