import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
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
import { CLASSROOMS, classroomDayEnd } from './data/schedule'
import { loadModule, preloadLazyModules } from './lazyModules'
import { knownPlacements, useScheduleSync } from './useScheduleSync'
import { navigate, usePath } from './router'

// Manage pulls in charismap's table (antd, pdfmake, xlsx): load it on first open
const ManagePanel = lazy(() =>
  loadModule('manage').then((m) => ({ default: m.ManagePanel })),
)

const MANAGE_TABS = ['teachers', 'classes', 'subjects', 'links']
const TITLES = { classes: 'Classes', teachers: 'Teachers', manage: 'Manage' }

/** `/classes`, `/teachers` or `/manage/<tab>`; anything else maps to its nearest route. */
function routeFor(path) {
  const [first, second] = path.split('/').filter(Boolean)
  if (first === 'teachers') return { view: 'teachers', path: '/teachers' }
  if (first === 'manage') {
    const tab = MANAGE_TABS.includes(second) ? second : MANAGE_TABS[0]
    return { view: 'manage', tab, path: `/manage/${tab}` }
  }
  return { view: 'classes', path: '/classes' }
}

function readStoredTheme() {
  try {
    return localStorage.getItem('timetabler-theme') === 'dark'
  } catch {
    return false
  }
}

function App({ user, catalogVersion, savedSchedule, onCatalogChange, onSignOut }) {
  const path = usePath()
  const route = routeFor(path)
  const { view } = route

  useEffect(preloadLazyModules, [])
  const [selectedClassrooms, setSelectedClassrooms] = useState(() => [
    ...CLASSROOMS,
  ])
  const [selectedTeachers, setSelectedTeachers] = useState(() => [...TEACHERS])
  const [darkMode, setDarkMode] = useState(readStoredTheme)
  const [placements, setPlacements] = useState(() =>
    knownPlacements(savedSchedule?.placements),
  )
  const [dragLessonId, setDragLessonId] = useState(null)
  const [placementError, setPlacementError] = useState(null)
  const [scheduleNote, setScheduleNote] = useState(null)
  const saveStatus = useScheduleSync({
    placements,
    setPlacements,
    saved: savedSchedule,
    enabled: Boolean(user?.admin),
    onConflict: setPlacementError,
  })

  useEffect(() => {
    if (route.path !== path) navigate(route.path, { replace: true })
  }, [route.path, path])

  useEffect(() => {
    document.title = `${TITLES[view]} · Timetabler`
  }, [view])

  // A reloaded catalog may add or drop classes, teachers and lessons
  useEffect(() => {
    setSelectedClassrooms([...CLASSROOMS])
    setSelectedTeachers([...TEACHERS])
    setPlacements((prev) => {
      const ids = new Set(UNSCHEDULED_LESSONS.map((lesson) => lesson.id))
      return Object.fromEntries(
        Object.entries(prev).filter(([id]) => ids.has(id)),
      )
    })
  }, [catalogVersion])

  const visibleClassrooms = useMemo(
    () => CLASSROOMS.filter((id) => selectedClassrooms.includes(id)),
    [selectedClassrooms, catalogVersion],
  )

  const visibleTeachers = useMemo(
    () => TEACHERS.filter((name) => selectedTeachers.includes(name)),
    [selectedTeachers, catalogVersion],
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
        selectedClassrooms.includes(lesson.classroom) && !placements[lesson.id],
    )
  }, [view, selectedClassrooms, selectedTeachers, placements, catalogVersion])

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

  const [exportingPdf, setExportingPdf] = useState(false)

  async function handleDownloadPdf(colour = true) {
    setExportingPdf(true)
    try {
      const { downloadTimetablePdf } = await loadModule('pdf')
      downloadTimetablePdf({
        mode: view === 'teachers' ? 'teacher' : 'classroom',
        groups: view === 'teachers' ? visibleTeachers : visibleClassrooms,
        lessons: UNSCHEDULED_LESSONS,
        placements,
        colour,
      })
    } catch (err) {
      setPlacementError(`Couldn't create the PDF: ${err.message}`)
    } finally {
      setExportingPdf(false)
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
        mate.classroom,
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
            `${mate.subject} is already scheduled for ${mate.classroom} on ${day}.`,
          )
        } else if (check.reason === 'span') {
          setPlacementError(
            'Double periods need two free consecutive slots (not across Assembly, Recess, Jr Lunch, or Sr Lunch).',
          )
        } else if (check.reason === 'break') {
          setPlacementError(
            'That column is a break for this class (Breakfast, Assembly, Recess, Jr Lunch, or Sr Lunch).',
          )
        } else if (check.reason === 'hours') {
          setPlacementError(
            `${mate.classroom} only has classes until ${classroomDayEnd(mate.classroom)}.`,
          )
        } else if (check.reason === 'pre-lunch') {
          setPlacementError(
            `${mate.subject} must be before lunch (not after Jr/Sr Lunch).`,
          )
        } else if (check.reason === 'late') {
          setPlacementError(
            `Junior classes end at 2:30 — only LRC and remedial extras can use ${mate.classroom}'s last period.`,
          )
        } else if (check.reason === 'end-of-day') {
          setPlacementError(
            `LRC and remedial classes are end-of-day extras — nothing else can come after them in ${mate.classroom}'s day.`,
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
        scheduledCount={Object.keys(placements).length}
        saveStatus={user?.admin ? saveStatus : null}
        onAutoSchedule={handleAutoSchedule}
        onClearSchedule={handleClearSchedule}
        onDownloadPdf={handleDownloadPdf}
        pdfDisabled={
          exportingPdf ||
          (view === 'teachers' ? visibleTeachers : visibleClassrooms).length === 0
        }
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((value) => !value)}
        viewTabs={<ViewTabs view={view} />}
        user={user}
        onSignOut={onSignOut}
        manageMode={view === 'manage'}
      />
      {view === 'manage' ? (
        <Suspense fallback={<p className="manage-empty manage">Loading…</p>}>
          <ManagePanel user={user} tab={route.tab} onChanged={onCatalogChange} />
        </Suspense>
      ) : view === 'classes' ? (
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
      {/* Stays mounted under Manage so returning to the grids is instant */}
      <div className="workspace" hidden={view === 'manage'}>
        {view !== 'teachers' ? (
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
          groups={view !== 'teachers' ? visibleClassrooms : visibleTeachers}
          groupMode={view !== 'teachers' ? 'classroom' : 'teacher'}
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
    panelRect.top >= rootRect.top + 8 && panelRect.bottom <= rootRect.bottom - 8

  if (alreadyVisible) return

  panel.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    inline: 'nearest',
  })
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
