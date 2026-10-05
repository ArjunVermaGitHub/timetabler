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
        {user ? (
          <span className="header-user" title={user.email}>
            {user.email.split('@')[0]}
            {user.admin ? <span className="header-role">admin</span> : null}
          </span>
        ) : null}
        {user ? (
          <button
            type="button"
            className="theme-toggle"
            onClick={() => openUserProfile()}
            title="Set or change your password"
          >
            Account
          </button>
        ) : null}
        {onSignOut ? (
          <button type="button" className="theme-toggle" onClick={onSignOut}>
            Sign out
          </button>
        ) : null}
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleDarkMode}
          aria-pressed={darkMode}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? 'Light' : 'Dark'}
        </button>
        {manageMode ? null : (
          <>
            {saveStatus ? (
              <span className={`save-status is-${saveStatus}`} role="status">
                {SAVE_LABELS[saveStatus]}
              </span>
            ) : null}
            <PdfMenu onDownload={onDownloadPdf} disabled={pdfDisabled} />
            <button
              type="button"
              className="clear-schedule"
              onClick={onClearSchedule}
              disabled={scheduledCount === 0}
              title="Move every scheduled lesson back to the tray"
            >
              Clear
            </button>
            <button
              type="button"
              className="auto-schedule"
              onClick={onAutoSchedule}
            >
              Auto-schedule
            </button>
          </>
        )}
      </div>
    </header>
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
        className="clear-schedule"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Download the timetables on screen as a PDF"
      >
        Download PDF ▾
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
