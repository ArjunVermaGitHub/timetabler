import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Channel,
  ChannelHeader,
  ChannelList,
  Chat,
  MessageComposer,
  MessageList,
  Thread,
  Window,
  useChatContext,
} from 'stream-chat-react'
import 'stream-chat-react/dist/css/index.css'
import { api } from '../api'
import { inNativeApp } from '../nativeApp'
import { ProfileCard } from './ProfileCard'
import { AskDeleteContext } from './askDelete'
import { DeleteConfirm } from './DeleteConfirm'
import { MessageParts } from './MessageParts'
import { renderWithSender } from './senderText'

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
          <strong>Chat notifications are blocked.</strong> Allow notifications for this site
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
              body: 'If you can see this, @mentions and messages will reach you too.',
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
        @mentions you or messages you.
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
        className="chat-new-btn"
        onClick={() =>
          Notification.requestPermission().then((result) => {
            setPermission(result)
            if (result === 'granted') {
              new Notification('Notifications are on', {
                body: "You'll see one like this when someone @mentions you or messages you.",
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

/** The conversation you already have with someone, if it's loaded. */
function existingDm(client, personId) {
  return Object.values(client.activeChannels).find(
    (c) =>
      c.type === 'messaging' &&
      c.state.members[personId] &&
      Object.keys(c.state.members).length === 2,
  )
}

/** Opens your conversation with someone: straight away if it's loaded, else via the server. */
function useOpenDm({ onOpening, onOpened, onFailed }) {
  const { client, setActiveChannel } = useChatContext()
  return async (person) => {
    const existing = existingDm(client, person.id)
    if (existing) {
      setActiveChannel(existing)
      return
    }
    onOpening(person)
    try {
      const ref = await api('/api/chat/dm', { method: 'POST', body: { userId: person.id } })
      const channel = client.channel(ref.type, ref.id)
      await channel.watch()
      setActiveChannel(channel)
      onOpened()
    } catch (e) {
      onFailed(e.message)
    }
  }
}

/** Staff to start a conversation with, filtered as you type. */
function NewMessage({ staff, error, onClose, dm }) {
  const openDm = useOpenDm(dm)
  const [search, setSearch] = useState('')

  const open = (person) => {
    onClose()
    openDm(person)
  }

  const query = search.trim().toLowerCase()
  const shown = (staff ?? []).filter(
    (s) => s.name.toLowerCase().includes(query) || s.email.includes(query),
  )
  return (
    <div className="chat-new">
      <div className="chat-new-head">
        <input
          className="chat-new-search"
          type="search"
          placeholder="Message someone…"
          aria-label="Search staff"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <button type="button" className="chat-notify-later" onClick={onClose}>
          Cancel
        </button>
      </div>
      {error ? <p className="chat-new-note">{error}</p> : null}
      {staff === null && !error ? <p className="chat-new-note">Loading staff…</p> : null}
      {staff && shown.length === 0 ? <p className="chat-new-note">Nobody matches.</p> : null}
      <ul className="chat-new-list">
        {shown.map((person) => (
          <li key={person.id}>
            <button type="button" onClick={() => open(person)}>
              {person.name}
              <span className="chat-new-email">{person.email}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Tells the app which conversation is open, and opens one it asks for. */
function ActiveConversation({ chat, onChange }) {
  const { client, channel, setActiveChannel } = useChatContext()
  const { requestedCid, clearRequested, setActiveCid } = chat
  const cid = channel?.cid ?? null
  useEffect(() => {
    setActiveCid(cid)
    onChange()
  }, [cid, setActiveCid, onChange])
  useEffect(() => () => setActiveCid(null), [setActiveCid])
  useEffect(() => {
    if (!requestedCid) return
    const [type, id] = requestedCid.split(':')
    const target = client.channel(type, id)
    target
      .watch()
      .then(() => setActiveChannel(target))
      .catch(() => {})
    clearRequested()
  }, [requestedCid, client, setActiveChannel, clearRequested])
  return null
}

const MENTION = '.str-chat__message-mention[data-user-id]'
const HOVER_OPEN_MS = 350
const HOVER_CLOSE_MS = 250

/**
 * Profile cards for people in the chat: hovering an avatar or @mention opens one,
 * clicking keeps it open (and is how phones get it), as does clicking a DM's header.
 */
function useProfileCards() {
  const [card, setCard] = useState(null)
  const cardRef = useRef(null)
  const timers = useRef({})
  useEffect(() => {
    cardRef.current = card
  }, [card])
  useEffect(() => () => clearTimeout(timers.current.close), [])

  const cards = useMemo(() => {
    const cancel = () => {
      clearTimeout(timers.current.open)
      clearTimeout(timers.current.close)
    }
    const close = () => {
      cancel()
      setCard(null)
    }
    const show = (el, id, pinned) => {
      cancel()
      const { left, top, bottom } = el.getBoundingClientRect()
      setCard({ id, anchor: { left, top, bottom }, pinned })
    }
    const leave = () => {
      clearTimeout(timers.current.open)
      if (cardRef.current?.pinned) return
      timers.current.close = setTimeout(() => setCard((c) => (c?.pinned ? c : null)), HOVER_CLOSE_MS)
    }
    const hover = (el, id) => {
      cancel()
      if (cardRef.current?.pinned) return
      if (cardRef.current?.id !== id) timers.current.open = setTimeout(() => show(el, id, false), HOVER_OPEN_MS)
      el.addEventListener('mouseleave', leave, { once: true })
    }
    return { cancel, close, show, leave, hover }
  }, [])
  return [card, cards]
}

function ProfileLayer({ layoutRef, card, cards, people, me, placements, dm, onTimetable }) {
  const { channel } = useChatContext()
  const openDm = useOpenDm(dm)

  useEffect(() => {
    const layout = layoutRef.current
    if (!layout) return
    let hovered = null
    const onOver = (e) => {
      const el = e.target.closest(MENTION)
      if (el === hovered) return
      hovered = el
      if (el) {
        cards.hover(el, el.dataset.userId)
        el.addEventListener('mouseleave', () => (hovered = null), { once: true })
      }
    }
    const onClick = (e) => {
      const mention = e.target.closest(MENTION)
      if (mention) {
        cards.show(mention, mention.dataset.userId, true)
        return
      }
      const header = e.target.closest('.str-chat__channel-header')
      if (header && channel?.type === 'messaging') {
        const other = Object.keys(channel.state.members).find((id) => id !== me.id)
        if (other) cards.show(header.querySelector('.str-chat__channel-header__data__title') ?? header, other, true)
      }
    }
    const onScroll = (e) => {
      if (!e.target.closest?.('.profile-card')) cards.close()
    }
    layout.addEventListener('mouseover', onOver)
    layout.addEventListener('click', onClick)
    layout.addEventListener('scroll', onScroll, true)
    return () => {
      layout.removeEventListener('mouseover', onOver)
      layout.removeEventListener('click', onClick)
      layout.removeEventListener('scroll', onScroll, true)
    }
  }, [layoutRef, cards, channel, me.id])

  useEffect(() => {
    if (!card) return
    const onDown = (e) => {
      if (e.target.closest('.profile-card, .str-chat__avatar, .str-chat__channel-header')) return
      if (e.target.closest(MENTION)) return
      cards.close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') cards.close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [card, cards])

  const person = card ? people.get(card.id) : null
  if (!person) return null
  return (
    <ProfileCard
      person={person}
      isMe={person.id === me.id}
      canMessage={
        person.id !== me.id && !(channel?.type === 'messaging' && channel.state.members[person.id])
      }
      placements={placements}
      anchor={card.anchor}
      onClose={cards.close}
      onMessage={() => {
        cards.close()
        openDm(person)
      }}
      onTimetable={() => {
        cards.close()
        onTimetable(person.teacher)
      }}
      onMouseEnter={cards.cancel}
      onMouseLeave={cards.leave}
    />
  )
}

const SORT = { last_message_at: -1 }
const OPTIONS = { state: true, watch: true, limit: 30 }

export function ChatPanel({ chat, darkMode, placements, onShowTimetable }) {
  const { client, me, channelRef } = chat
  const [picking, setPicking] = useState(false)
  // On narrow screens the list and the conversation take turns
  const [listOpen, setListOpen] = useState(false)
  const filters = useMemo(
    () => ({ members: { $in: [me.id] }, type: { $in: [channelRef.type, 'messaging'] } }),
    [me.id, channelRef.type],
  )
  const roomFirst = useCallback(
    (channels) => [
      ...channels.filter((c) => c.type === channelRef.type),
      ...channels.filter((c) => c.type !== channelRef.type),
    ],
    [channelRef.type],
  )
  // A new conversation being set up: the chat area shows it straight away
  const [opening, setOpening] = useState(null)
  const closeList = useCallback(() => {
    setListOpen(false)
    setOpening(null)
  }, [])
  // Fetched up front so the picker opens with names already there
  const [staff, setStaff] = useState(null)
  const [staffError, setStaffError] = useState(null)
  useEffect(() => {
    api('/api/chat/dm')
      .then((data) => setStaff(data.staff))
      .catch((e) => setStaffError(e.message))
  }, [])
  const people = useMemo(() => new Map((staff ?? []).map((s) => [s.id, s])), [staff])
  const others = useMemo(() => staff && staff.filter((s) => s.id !== me.id), [staff, me.id])
  const dm = useMemo(
    () => ({
      onOpening: (person) => {
        setListOpen(false)
        setOpening({ name: person.name })
      },
      onOpened: () => setOpening(null),
      onFailed: (message) => setOpening((o) => o && { ...o, error: message }),
    }),
    [],
  )
  const [pendingDelete, setPendingDelete] = useState(null)
  const closeDelete = useCallback(() => setPendingDelete(null), [])
  const layoutRef = useRef(null)
  // Stable for good: Stream's memoised messages keep the first handlers they're given
  const [card, cards] = useProfileCards()
  const onUserHover = useCallback(
    (e, user) => {
      const el = e.currentTarget ?? e.target
      if (el instanceof Element) cards.hover(el, user.id)
    },
    [cards],
  )
  const onUserClick = useCallback(
    (e, user) => {
      const el = e.currentTarget ?? e.target
      if (el instanceof Element) cards.show(el, user.id, true)
    },
    [cards],
  )
  return (
    <div className="chat-panel">
      <NotifyPrompt />
      <Chat client={client} theme={darkMode ? 'str-chat__theme-dark' : 'str-chat__theme-light'}>
        <div className={`chat-layout${listOpen ? ' is-list' : ''}`} ref={layoutRef}>
          <aside
            className="chat-side"
            aria-label="Conversations"
            onClick={(e) => {
              if (e.target.closest('button.str-chat__channel-list-item')) setListOpen(false)
            }}
          >
            {picking ? (
              <NewMessage
                staff={others}
                error={staffError}
                onClose={() => setPicking(false)}
                dm={dm}
              />
            ) : (
              <div className="chat-side-head">
                <span>Chats</span>
                <button type="button" className="chat-new-btn" onClick={() => setPicking(true)}>
                  New message
                </button>
              </div>
            )}
            <ChannelList
              filters={filters}
              sort={SORT}
              options={OPTIONS}
              customActiveChannel={channelRef.id}
              channelRenderFilterFn={roomFirst}
            />
          </aside>
          <AskDeleteContext.Provider value={setPendingDelete}>
            <MessageParts>
              <Channel>
                <Window>
                  <button type="button" className="chat-back" onClick={() => setListOpen(true)}>
                    ‹ Chats
                  </button>
                  <ChannelHeader />
                  <MessageList
                    onUserClick={onUserClick}
                    onUserHover={onUserHover}
                    renderText={renderWithSender}
                  />
                  <MessageComposer focus />
                </Window>
                <Thread />
              </Channel>
            </MessageParts>
          </AskDeleteContext.Provider>
          {pendingDelete ? (
            <DeleteConfirm
              key={pendingDelete.message.id}
              pending={pendingDelete}
              onClose={closeDelete}
            />
          ) : null}
          {opening ? (
            <div className="chat-opening" role="status">
              <div className="chat-opening-head">{opening.name}</div>
              <div className="chat-opening-body">
                {opening.error ? (
                  <>
                    <p>{opening.error}</p>
                    <button type="button" className="chat-new-btn" onClick={() => setOpening(null)}>
                      Back
                    </button>
                  </>
                ) : (
                  <span className="chat-spinner" aria-label="Opening conversation" />
                )}
              </div>
            </div>
          ) : null}
        </div>
        <ActiveConversation chat={chat} onChange={closeList} />
        <ProfileLayer
          layoutRef={layoutRef}
          card={card}
          cards={cards}
          people={people}
          me={me}
          placements={placements}
          dm={dm}
          onTimetable={onShowTimetable}
        />
      </Chat>
    </div>
  )
}
