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
  const [selectedClassrooms, setSelectedClassrooms] = useState(() => [
    ...CLASSROOMS,
  ])
  const [selectedTeachers, setSelectedTeachers] = useState(() => [...TEACHERS])
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

  // While dragging, scroll grid (and tray) when the pointer hugs an edge.
  useEffect(() => {
    if (!dragLessonId) return undefined

    let pointer = { x: 0, y: 0 }
    let hasPointer = false
    let rafId = 0

    function onDragOver(event) {
      pointer = { x: event.clientX, y: event.clientY }
      hasPointer = true
    }

    function frame() {
      if (hasPointer) {
        const grid = document.querySelector('.grid-scroll')
        if (grid) autoScrollNearEdges(grid, pointer.x, pointer.y)
        const tray = document.querySelector('.tray-body')
        if (tray) autoScrollNearEdges(tray, pointer.x, pointer.y)
      }
      rafId = window.requestAnimationFrame(frame)
    }

    document.addEventListener('dragover', onDragOver, true)
    rafId = window.requestAnimationFrame(frame)

    return () => {
      window.cancelAnimationFrame(rafId)
      document.removeEventListener('dragover', onDragOver, true)
    }
  }, [dragLessonId])

  function handleAutoSchedule() {
    const result = autoSchedule(UNSCHEDULED_LESSONS, { clearExisting: true })
    setDragLessonId(null)
    setPlacements(result.placements)
    setSelectedClassrooms([...CLASSROOMS])
    setSelectedTeachers([...TEACHERS])
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
    if (lesson.classroom !== classroom) {
      setPlacementError(
        `This class belongs to ${lesson.classroom}, not ${classroom}.`,
      )
      return
    }

    // Elective / co-teach bundles must move as one block
    const mates = lesson.syncGroupId
      ? UNSCHEDULED_LESSONS.filter(
          (item) => item.syncGroupId === lesson.syncGroupId,
        )
      : [lesson]

    let nextPlacements = { ...placements }
    for (const mate of mates) {
      delete nextPlacements[mate.id]
    }

    for (const mate of mates) {
      const check = evaluatePlacement(
        mate,
        classroom,
        day,
        slotId,
        UNSCHEDULED_LESSONS,
        nextPlacements,
      )
      if (!check.ok) {
        if (check.reason === 'teacher') {
          setPlacementError(
            `${mate.teacher} is already teaching ${check.conflict.classroom} on ${day} at this time.`,
          )
        } else if (check.reason === 'subject') {
          setPlacementError(
            `${mate.subject} is already scheduled for ${classroom} on ${day}.`,
          )
        } else if (check.reason === 'span') {
          setPlacementError(
            'Double periods need two free consecutive slots (not across Assembly, Recess, Jr Lunch, or Sr Lunch).',
          )
        } else if (check.reason === 'break') {
          setPlacementError(
            'That column is a break for this class (Breakfast, Assembly, Recess, Jr Lunch, or Sr Lunch).',
          )
        } else if (check.reason === 'pe') {
          setPlacementError(
            'Physical Education must be before lunch (not after Jr/Sr Lunch).',
          )
        } else {
          setPlacementError(
            mate.syncGroupId
              ? `Can't place the ${mate.stream ?? 'elective'} block here.`
              : 'That slot is already taken.',
          )
        }
        return
      }
      nextPlacements = {
        ...nextPlacements,
        [mate.id]: { day, slotId },
      }
    }

    setPlacementError(null)
    setDragLessonId(null)
    setPlacements(nextPlacements)
  }

  function handleUnschedule(lessonId) {
    setDragLessonId(null)
    const lesson = UNSCHEDULED_LESSONS.find((item) => item.id === lessonId)
    setPlacements((prev) => {
      if (!prev[lessonId] && !lesson?.syncGroupId) return prev
      const next = { ...prev }
      if (lesson?.syncGroupId) {
        for (const mate of UNSCHEDULED_LESSONS) {
          if (mate.syncGroupId === lesson.syncGroupId) delete next[mate.id]
        }
      } else {
        delete next[lessonId]
      }
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

const DRAG_SCROLL_EDGE = 72
const DRAG_SCROLL_MAX = 32

/** Scroll a container when the drag pointer is near its edges. */
function autoScrollNearEdges(el, clientX, clientY) {
  const rect = el.getBoundingClientRect()
  const pad = DRAG_SCROLL_EDGE

  // Ignore when the pointer is clearly away from this scrollport.
  if (
    clientX < rect.left - pad ||
    clientX > rect.right + pad ||
    clientY < rect.top - pad ||
    clientY > rect.bottom + pad
  ) {
    return
  }

  let dy = 0
  if (clientY < rect.top + pad) {
    const t = Math.min(1, (rect.top + pad - clientY) / pad)
    dy = -Math.ceil(DRAG_SCROLL_MAX * t * t)
  } else if (clientY > rect.bottom - pad) {
    const t = Math.min(1, (clientY - (rect.bottom - pad)) / pad)
    dy = Math.ceil(DRAG_SCROLL_MAX * t * t)
  }

  let dx = 0
  if (clientX < rect.left + pad) {
    const t = Math.min(1, (rect.left + pad - clientX) / pad)
    dx = -Math.ceil(DRAG_SCROLL_MAX * t * t)
  } else if (clientX > rect.right - pad) {
    const t = Math.min(1, (clientX - (rect.right - pad)) / pad)
    dx = Math.ceil(DRAG_SCROLL_MAX * t * t)
  }

  if (dy) el.scrollTop += dy
  if (dx) el.scrollLeft += dx
}

function cssEscape(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return String(value).replace(/["\\]/g, '\\$&')
}