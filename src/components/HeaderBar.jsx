import { useEffect, useRef, useState } from 'react'
import { useClerk } from '@clerk/react'

const SAVE_LABELS = {
  pending: 'Saving…',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Not saved, retrying…',
}

export function HeaderBar({
  scheduledCount = 0,
  saveStatus = null,
  onAutoSchedule,
  onClearSchedule,
  onDownloadPdf,
  pdfDisabled = false,
  darkMode,
  onToggleDarkMode,
  viewTabs,
  user,
  onSignOut,
  manageMode = false,
}) {
  const ref = useRef(null)
  const { openUserProfile } = useClerk()

  // Publish the (wrapping) header height so fixed overlays can sit just below it
  useEffect(() => {
    const header = ref.current
    const root = document.documentElement
    const observer = new ResizeObserver(() => {
      root.style.setProperty('--header-h', `${header.offsetHeight}px`)
    })
    observer.observe(header)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--header-h')
    }
  }, [])

  return (
    <header className="header" ref={ref}>
      <div className="header-left">
        <h1>Timetable</h1>
        {viewTabs}
      </div>
      <div className="header-actions">
        {manageMode ? null : (
          <div className="header-group">
            {saveStatus ? (
              <span className={`save-status is-${saveStatus}`} role="status">
                <span className="save-dot" aria-hidden="true" />
                {SAVE_LABELS[saveStatus]}
              </span>
            ) : null}
            <button
              type="button"
              className="hb-btn is-ghost is-danger"
              onClick={onClearSchedule}
              disabled={scheduledCount === 0}
              title="Move every scheduled lesson back to the tray"
            >
              <Icon name="clear" />
              Clear
            </button>
            <PdfMenu onDownload={onDownloadPdf} disabled={pdfDisabled} />
            <button type="button" className="hb-btn is-primary" onClick={onAutoSchedule}>
              <Icon name="spark" />
              Auto-schedule
            </button>
          </div>
        )}
        <div className="header-group is-utility">
          <button
            type="button"
            className="hb-icon"
            onClick={onToggleDarkMode}
            aria-pressed={darkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <Icon name={darkMode ? 'sun' : 'moon'} />
          </button>
          {user ? (
            <button
              type="button"
              className="hb-user"
              onClick={() => openUserProfile()}
              title={`${user.email} · account and password`}
            >
              <span className="hb-avatar" aria-hidden="true">
                {user.email[0].toUpperCase()}
              </span>
              <span className="hb-user-name">{user.email.split('@')[0]}</span>
              {user.admin ? <span className="header-role">admin</span> : null}
            </button>
          ) : null}
          {onSignOut ? (
            <button
              type="button"
              className="hb-icon"
              onClick={onSignOut}
              aria-label="Sign out"
              title="Sign out"
            >
              <Icon name="logout" />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}

const ICON_PATHS = {
  spark: 'M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.5l-1.8-5L5 9.7l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z',
  download: 'M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14',
  clear: 'M4 7h16M9 7V4.5h6V7m-8.5 0l1 12.5h9l1-12.5',
  chevron: 'M6 9l6 6 6-6',
  moon: 'M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  logout: 'M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l-4-4 4-4M6 12h10',
}

function Icon({ name, className = '' }) {
  return (
    <svg
      className={`hb-svg ${className}`}
      viewBox="0 0 24 24"
      fill={name === 'spark' ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={name === 'spark' ? 0 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  )
}

function PdfMenu({ onDownload, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !ref.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  function pick(colour) {
    setOpen(false)
    onDownload(colour)
  }

  return (
    <div className="pdf-menu" ref={ref}>
      <button
        type="button"
        className="hb-btn is-secondary"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Download the timetables on screen as a PDF"
      >
        <Icon name="download" />
        PDF
        <Icon name="chevron" className="hb-chevron" />
      </button>
      {open ? (
        <div className="pdf-menu-list" role="menu">
          <button type="button" role="menuitem" onClick={() => pick(true)}>
            Colour
          </button>
          <button type="button" role="menuitem" onClick={() => pick(false)}>
            Black &amp; white
            <span>Best for printing</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
