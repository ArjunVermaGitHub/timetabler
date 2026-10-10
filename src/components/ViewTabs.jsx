import { Link } from '../router'

const VIEWS = [
  ['classes', 'Class view', '/classes'],
  ['teachers', 'Teacher view', '/teachers'],
  ['chat', 'Staff room', '/chat'],
  ['manage', 'Manage', '/manage'],
]

export function ViewTabs({ view, showManage = true, showChat = false, chatUnread = 0 }) {
  const shown = VIEWS.filter(
    ([id]) => (id !== 'manage' || showManage) && (id !== 'chat' || showChat),
  )
  return (
    <nav className="view-tabs" aria-label="Timetable view">
      {shown.map(([id, label, to]) => (
        <Link
          key={id}
          to={to}
          aria-current={view === id ? 'page' : undefined}
          className={view === id ? 'view-tab is-on' : 'view-tab'}
        >
          {label}
          {id === 'chat' && chatUnread > 0 ? (
            <span className="view-tab-badge" aria-label={`${chatUnread} unread`}>
              {chatUnread > 99 ? '99+' : chatUnread}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  )
}
