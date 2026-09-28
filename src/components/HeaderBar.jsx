import { useEffect, useRef } from 'react'

export function HeaderBar({
  scheduledCount = 0,
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
            <button
              type="button"
              className="clear-schedule"
              onClick={onDownloadPdf}
              disabled={pdfDisabled}
              title="Download the timetables on screen as a PDF"
            >
              Download PDF
            </button>
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
