import { Link } from '../router'

const VIEWS = [
  ['classes', 'Class view', '/classes'],
  ['teachers', 'Teacher view', '/teachers'],
  ['manage', 'Manage', '/manage'],
]

export function ViewTabs({ view }) {
  return (
    <nav className="view-tabs" aria-label="Timetable view">
      {VIEWS.map(([id, label, to]) => (
        <Link
          key={id}
          to={to}
          aria-current={view === id ? 'page' : undefined}
          className={view === id ? 'view-tab is-on' : 'view-tab'}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
