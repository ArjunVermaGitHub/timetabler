export function HeaderBar({
  unscheduledCount,
  scheduledCount = 0,
  onAutoSchedule,
  onClearSchedule,
  darkMode,
  onToggleDarkMode,
  viewTabs,
}) {
  return (
    <header className="header">
      <div className="header-left">
        <h1>Timetable</h1>
        {viewTabs}
        <span className="header-meta">
          Jr P-1 mornings · staggered Jr/Sr lunch · {unscheduledCount} waiting
        </span>
      </div>
      <div className="header-actions">
        <button
          type="button"
          className="theme-toggle"
          onClick={onToggleDarkMode}
          aria-pressed={darkMode}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? 'Light' : 'Dark'}
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
        <button type="button" className="auto-schedule" onClick={onAutoSchedule}>
          Auto-schedule
        </button>
      </div>
    </header>
  )
}
