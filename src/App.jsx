import { useEffect, useMemo, useState } from 'react'
import { ClassroomFilter } from './components/ClassroomFilter'
import { HeaderBar } from './components/HeaderBar'
import { TeacherFilter } from './components/TeacherFilter'
import { TeacherTimetableGrid } from './components/TeacherTimetableGrid'
import { TimetableGrid } from './components/TimetableGrid'
import { UnscheduledTray } from './components/UnscheduledTray'
import { ViewTabs } from './components/ViewTabs'
import { TEACHERS, UNSCHEDULED_LESSONS } from './data/mockLessons'
import { evaluatePlacement } from './data/placement'
import { autoSchedule } from './data/scheduler'
import { CLASSROOMS } from './data/schedule'

function readStoredTheme() {
  try {
    return localStorage.getItem('timetabler-theme') === 'dark'
  } catch {
    return false
  }
}

function App() {
  const [view, setView] = useState('classes')
  const [selectedClassrooms, setSelectedClassrooms] = useState(['8A', '8B'])
  const [selectedTeachers, setSelectedTeachers] = useState(() =>
    TEACHERS.slice(0, 2),
  )
  const [darkMode, setDarkMode] = useState(readStoredTheme)
  const [placements, setPlacements] = useState({})
  const [dragLessonId, setDragLessonId] = useState(null)
  const [placementError, setPlacementError] = useState(null)
  const [scheduleNote, setScheduleNote] = useState(null)

  const visibleClassrooms = useMemo(
    () => CLASSROOMS.filter((id) => selectedClassrooms.includes(id)),
    [selectedClassrooms],
  )

  const visibleTeachers = useMemo(
    () => TEACHERS.filter((name) => selectedTeachers.includes(name)),
    [selectedTeachers],
  )

  const trayLessons = useMemo(() => {
    if (view === 'teachers') {
      return UNSCHEDULED_LESSONS.filter(
        (lesson) =>
          selectedTeachers.includes(lesson.teacher) && !placements[lesson.id],
      )
    }
    return UNSCHEDULED_LESSONS.filter(
      (lesson) =>
        selectedClassrooms.includes(lesson.classroom) &&
        !placements[lesson.id],
    )
  }, [view, selectedClassrooms, selectedTeachers, placements])

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
    try {
      localStorage.setItem('timetabler-theme', darkMode ? 'dark' : 'light')
    } catch {
      // Ignore storage failures (private mode, etc).
    }
  }, [darkMode])

  useEffect(() => {
    if (!placementError) return undefined
    const timer = window.setTimeout(() => setPlacementError(null), 4000)
    return () => window.clearTimeout(timer)
  }, [placementError])

  useEffect(() => {
    if (!scheduleNote) return undefined
    const timer = window.setTimeout(() => setScheduleNote(null), 4000)
    return () => window.clearTimeout(timer)
  }, [scheduleNote])

  function handleDragStartLesson(lessonId) {
    setDragLessonId(lessonId)
    const lesson = UNSCHEDULED_LESSONS.find((item) => item.id === lessonId)
    if (!lesson) return

    // After the drag ghost appears, scroll the matching panel into view.
    window.requestAnimationFrame(() => {
      scrollSchedulePanelIntoView(view, lesson)
    })
  }

  function handleDragEndLesson() {
    setDragLessonId(null)
  }

  // Successful tray → grid drops unmount the source card before dragend runs,
  // so also clear on any native dragend while a drag is active.
  useEffect(() => {
    if (!dragLessonId) return undefined
    function clearDrag() {
      setDragLessonId(null)
    }
    window.addEventListener('dragend', clearDrag, true)
    return () => window.removeEventListener('dragend', clearDrag, true)
  }, [dragLessonId])

  function handleAutoSchedule() {
    const result = autoSchedule(UNSCHEDULED_LESSONS, { clearExisting: true })
    setDragLessonId(null)
    setPlacements(result.placements)
    setSelectedClassrooms([...CLASSROOMS])
    if (result.remaining === 0) {
      setPlacementError(null)
      setScheduleNote(
        `Scheduled all ${result.scheduled} lessons in ${result.ms}ms.`,
      )
    } else {
      setScheduleNote(null)
      setPlacementError(
        `Scheduled ${result.scheduled}/${UNSCHEDULED_LESSONS.length} in ${result.ms}ms — ${result.remaining} still need a slot.`,
      )
    }
  }

  function handleClearSchedule() {
    setDragLessonId(null)
    setPlacements({})
    setPlacementError(null)
    setScheduleNote('Cleared — all lessons are back in the tray.')
  }

  function handleDropLesson(lessonId, classroom, day, slotId) {
    const lesson = UNSCHEDULED_LESSONS.find((item) => item.id === lessonId)
    if (!lesson) return

    const result = evaluatePlacement(
      lesson,
      classroom,
      day,
      slotId,
      UNSCHEDULED_LESSONS,
      placements,
    )

    if (!result.ok) {
      if (result.reason === 'teacher') {
        setPlacementError(
          `${lesson.teacher} is already teaching ${result.conflict.classroom} on ${day} at this time.`,
        )
      } else if (result.reason === 'subject') {
        setPlacementError(
          `${lesson.subject} is already scheduled for ${classroom} on ${day}.`,
        )
      } else if (result.reason === 'occupied') {
        setPlacementError('That slot is already taken.')
      } else if (result.reason === 'span') {
        setPlacementError(
          'Double periods need two free consecutive slots (not across Assembly, Recess, Jr Lunch, or Sr Lunch).',
        )
      } else if (result.reason === 'break') {
        setPlacementError(
          'That column is a break for this class (Breakfast, Assembly, Recess, Jr Lunch, or Sr Lunch).',
        )
      } else if (result.reason === 'classroom') {
        setPlacementError(
          `This class belongs to ${lesson.classroom}, not ${classroom}.`,
        )
      }
      return
    }

    setPlacementError(null)
    setDragLessonId(null)
    setPlacements((prev) => ({
      ...prev,
      [lessonId]: { day, slotId },
    }))
  }

  function handleUnschedule(lessonId) {
    setDragLessonId(null)
    setPlacements((prev) => {
      if (!prev[lessonId]) return prev
      const next = { ...prev }
      delete next[lessonId]
      return next
    })
  }

  return (
    <div className="app">
      <HeaderBar
        unscheduledCount={trayLessons.length}
        scheduledCount={Object.keys(placements).length}
        onAutoSchedule={handleAutoSchedule}
        onClearSchedule={handleClearSchedule}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((value) => !value)}
        viewTabs={<ViewTabs view={view} onChange={setView} />}
      />
      {view === 'classes' ? (
        <ClassroomFilter
          selected={selectedClassrooms}
          onChange={setSelectedClassrooms}
        />
      ) : (
        <TeacherFilter
          selected={selectedTeachers}
          onChange={setSelectedTeachers}
        />
      )}
      {placementError ? (
        <div className="placement-error" role="alert">
          {placementError}
        </div>
      ) : null}
      {scheduleNote ? (
        <div className="schedule-note" role="status">
          {scheduleNote}
        </div>
      ) : null}
      <div className="workspace">
        {view === 'classes' ? (
          <TimetableGrid
            classrooms={visibleClassrooms}
            lessons={UNSCHEDULED_LESSONS}
            placements={placements}
            dragLessonId={dragLessonId}
            onDragStartLesson={handleDragStartLesson}
            onDragEndLesson={handleDragEndLesson}
            onDropLesson={handleDropLesson}
          />
        ) : (
          <TeacherTimetableGrid
            teachers={visibleTeachers}
            lessons={UNSCHEDULED_LESSONS}
            placements={placements}
            dragLessonId={dragLessonId}
            onDragStartLesson={handleDragStartLesson}
            onDragEndLesson={handleDragEndLesson}
            onDropLesson={handleDropLesson}
          />
        )}
        <UnscheduledTray
          groups={view === 'classes' ? visibleClassrooms : visibleTeachers}
          groupMode={view === 'classes' ? 'classroom' : 'teacher'}
          lessons={trayLessons}
          onDragStartLesson={handleDragStartLesson}
          onDragEndLesson={handleDragEndLesson}
          onDropUnschedule={handleUnschedule}
        />
      </div>
    </div>
  )
}

export default App

function scrollSchedulePanelIntoView(view, lesson) {
  const scrollRoot = document.querySelector('.grid-scroll')
  if (!scrollRoot) return

  let panel = null
  if (view === 'classes') {
    panel = scrollRoot.querySelector(
      `[data-classroom="${cssEscape(lesson.classroom)}"]`,
    )
  } else {
    panel = scrollRoot.querySelector(
      `[data-teacher="${cssEscape(lesson.teacher)}"]`,
    )
  }
  if (!panel) return

  const rootRect = scrollRoot.getBoundingClientRect()
  const panelRect = panel.getBoundingClientRect()
  const alreadyVisible =
    panelRect.top >= rootRect.top + 8 &&
    panelRect.bottom <= rootRect.bottom - 8

  if (alreadyVisible) return

  panel.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
}

function cssEscape(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return String(value).replace(/["\\]/g, '\\$&')
}