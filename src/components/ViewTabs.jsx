export function ViewTabs({ view, onChange }) {
  return (
    <div className="view-tabs" role="tablist" aria-label="Timetable view">
      <button
        type="button"
        role="tab"
        aria-selected={view === 'classes'}
        className={view === 'classes' ? 'view-tab is-on' : 'view-tab'}
        onClick={() => onChange('classes')}
      >
        Classes
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === 'teachers'}
        className={view === 'teachers' ? 'view-tab is-on' : 'view-tab'}
        onClick={() => onChange('teachers')}
      >
        Teachers
      </button>
    </div>
  )
}
