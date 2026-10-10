import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AbbreviateContext } from './abbreviate'
import { measureBoxes, playBoxes } from './animateBoxes'
import { ClassroomFilter } from './components/ClassroomFilter'
import { ErrorBoundary, useOnline } from './components/ErrorScreen'
import { HeaderBar } from './components/HeaderBar'
import { TeacherFilter } from './components/TeacherFilter'
import { TeacherTimetableGrid } from './components/TeacherTimetableGrid'
import { TimetableGrid } from './components/TimetableGrid'
import { UnscheduledTray } from './components/UnscheduledTray'
import { ViewTabs } from './components/ViewTabs'
import { CLASS_TEACHERS, TEACHERS, UNSCHEDULED_LESSONS } from './data/mockLessons'
import { evaluatePlacement } from './data/placement'
import { autoSchedule } from './data/scheduler'
import { CLASSROOMS, classroomDayEnd } from './data/schedule'
import { loadModule, preloadLazyModules } from './lazyModules'
import { knownPlacements, useScheduleSync } from './useScheduleSync'
import { navigate, usePath } from './router'
import { useStaffChat } from './chat/useStaffChat'

// Manage pulls in charismap's table (antd, pdfmake, xlsx): load it on first open.
// A failed lazy() import is cached for good, so each retry needs a fresh one.
const lazyManagePanel = () =>
  lazy(() => loadModule('manage').then((m) => ({ default: m.ManagePanel })))
const lazyChatPanel = () =>
  lazy(() => loadModule('chat').then((m) => ({ default: m.ChatPanel })))

const MANAGE_TABS = ['teachers', 'classes', 'subjects', 'links']
const TITLES = {
  classes: 'Class view',
  teachers: 'Teacher view',
  manage: 'Manage',
  chat: 'Staff room',
}

/**
 * `/classes`, `/teachers`, `/chat` or `/manage/<tab>`; anything else maps to its nearest route.
 * Teachers land on their own timetable; only admins can reach Manage, only staff the chat
 * (once it's configured).
 */
function routeFor(path, { admin, teacher, chat }) {
  const [first, second] = path.split('/').filter(Boolean)
  if (first === 'teachers' || (!first && teacher)) {
    return { view: 'teachers', path: '/teachers' }
  }
  if (first === 'chat' && chat) {
    return { view: 'chat', path: '/chat' }
  }
  if (first === 'manage' && admin) {
    const tab = MANAGE_TABS.includes(second) ? second : MANAGE_TABS[0]
    return { view: 'manage', tab, path: `/manage/${tab}` }
  }
  return { view: 'classes', path: '/classes' }
}

const GRID_VIEWS = new Set(['classes', 'teachers'])

function readStoredTheme() {
  try {
    return localStorage.getItem('timetabler-theme') === 'dark'
  } catch {
    return false
  }
}

function readStoredAbbreviate() {
  try {
    return localStorage.getItem('timetabler-abbreviate') !== 'off'
  } catch {
    return true
  }
}

function App({ user, catalogVersion, savedSchedule, onCatalogChange, onSignOut }) {
  const path = usePath()
  const online = useOnline()
  const [manageAttempt, setManageAttempt] = useState(0)
  const ManagePanel = useMemo(lazyManagePanel, [manageAttempt])
  const readOnly = !user?.admin
  const ownTeacher = user?.teacher ?? null
  const canChat = Boolean(user?.chat && (ownTeacher || user?.admin))
  const route = routeFor(path, { admin: !readOnly, teacher: ownTeacher, chat: canChat })
  const { view } = route
  const staffChat = useStaffChat(canChat, view === 'chat')
  const [chatAttempt, setChatAttempt] = useState(0)
  const ChatPanel = useMemo(lazyChatPanel, [chatAttempt])

  useEffect(() => {
    preloadLazyModules(canChat ? ['pdf', 'manage', 'chat'] : ['pdf', 'manage'])
  }, [canChat])
  const [selectedClassrooms, setSelectedClassrooms] = useState(() => [
    ...CLASSROOMS,
  ])
  const [selectedTeachers, setSelectedTeachers] = useState(() => [...TEACHERS])
  const [darkMode, setDarkMode] = useState(readStoredTheme)
  const [abbreviate, setAbbreviate] = useState(readStoredAbbreviate)
  const boxesBefore = useRef(null)
  const changeAbbreviate = (next) => {
    boxesBefore.current = measureBoxes()
    setAbbreviate(next)
  }
  useLayoutEffect(() => {
    const snapshot = boxesBefore.current
    boxesBefore.current = null
    if (snapshot) playBoxes(snapshot)
  }, [abbreviate])
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

  // A signed-in teacher opens each view on their own timetable / home class
  const homed = useRef(new Set())
  useEffect(() => {
    if (!ownTeacher || !GRID_VIEWS.has(view) || homed.current.has(view)) return
    const home = view === 'teachers' ? ownTeacher : homeClassroom(ownTeacher, placements)
    if (!home) return
    const selector = `[data-${view === 'teachers' ? 'teacher' : 'classroom'}="${cssEscape(home)}"]`
    homed.current.add(view)
    alignPanel(selector)
  }, [view, ownTeacher, placements])

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
    try {
      localStorage.setItem('timetabler-abbreviate', abbreviate ? 'on' : 'off')
    } catch {
      // Ignore storage failures (private mode, etc).
    }
  }, [abbreviate])

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
  // The grid only scrolls to reveal the dragged lesson's own panel.
  useEffect(() => {
    if (!dragLessonId) return undefined
    const lesson = UNSCHEDULED_LESSONS.find((item) => item.id === dragLessonId)

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
        const tray = document.querySelector('.tray')
        const overTray = tray && pointInRect(pointer, tray.getBoundingClientRect())
        const panel = lesson && panelFor(view, lesson)
        if (grid && panel && !overTray) {
          autoScrollNearEdges(grid, pointer.x, pointer.y, panel)
        }
        const trayBody = document.querySelector('.tray-body')
        if (trayBody) autoScrollNearEdges(trayBody, pointer.x, pointer.y)
      }
      rafId = window.requestAnimationFrame(frame)
    }

    document.addEventListener('dragover', onDragOver, true)
    rafId = window.requestAnimationFrame(frame)

    return () => {
      window.cancelAnimationFrame(rafId)
      document.removeEventListener('dragover', onDragOver, true)
    }
  }, [dragLessonId, view])

  function handleAutoSchedule() {
    const result = autoSchedule(UNSCHEDULED_LESSONS, { locked: placements })
    const kept = Object.keys(placements).length
    const keptNote = kept ? `, keeping the ${kept} already placed` : ''
    setDragLessonId(null)
    setPlacements(result.placements)
    setSelectedClassrooms([...CLASSROOMS])
    setSelectedTeachers([...TEACHERS])
    if (result.remaining === 0) {
      setPlacementError(null)
      setScheduleNote(
        `Scheduled all ${result.scheduled} lessons in ${result.ms}ms${keptNote}.`,
      )
    } else {
      setScheduleNote(null)
      setPlacementError(
        `Scheduled ${result.scheduled}/${UNSCHEDULED_LESSONS.length} in ${result.ms}ms${keptNote} — ${result.remaining} still need a slot.`,
      )
    }
  }

  const [exportingPdf, setExportingPdf] = useState(false)

  async function handleDownloadPdf(colour = true, onlyOwn = false) {
    setExportingPdf(true)
    try {
      const { downloadTimetablePdf } = await loadModule('pdf')
      const teacherMode = onlyOwn || view === 'teachers'
      downloadTimetablePdf({
        mode: teacherMode ? 'teacher' : 'classroom',
        groups: onlyOwn
          ? [ownTeacher]
          : teacherMode
            ? visibleTeachers
            : visibleClassrooms,
        lessons: UNSCHEDULED_LESSONS,
        placements,
        colour,
        abbreviate,
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

  function signOut() {
    if (canChat) loadModule('chatClient').then((m) => m.disconnectStaffChat(), () => {})
    onSignOut()
  }

  const editing = readOnly
    ? {}
    : {
        dragLessonId,
        onDragStartLesson: handleDragStartLesson,
        onDragEndLesson: handleDragEndLesson,
        onDropLesson: handleDropLesson,
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
        viewTabs={
          <ViewTabs
            view={view}
            showManage={!readOnly}
            showChat={canChat}
            chatUnread={staffChat.unread}
          />
        }
        user={user}
        onSignOut={signOut}
        manageMode={!GRID_VIEWS.has(view)}
        readOnly={readOnly}
      />
      {online ? null : (
        <div className="offline-banner" role="status">
          {user?.admin
            ? "You're offline. You can keep working; changes will save once you're back online."
            : "You're offline. The timetable may be out of date until you reconnect."}
        </div>
      )}
      {view === 'manage' ? (
        <ErrorBoundary
          key={manageAttempt}
          fallback={() => (
            <div className="manage-empty manage section-error" role="alert">
              <p>
                {online
                  ? "Manage couldn't be loaded."
                  : "Manage couldn't be loaded because you're offline."}
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={() => setManageAttempt((n) => n + 1)}
              >
                Try again
              </button>
            </div>
          )}
        >
          <Suspense fallback={<p className="manage-empty manage">Loading…</p>}>
            <ManagePanel user={user} tab={route.tab} onChanged={onCatalogChange} />
          </Suspense>
        </ErrorBoundary>
      ) : view === 'chat' ? (
        staffChat.status === 'ready' ? (
          <ErrorBoundary
            key={chatAttempt}
            fallback={() => (
              <div className="manage-empty manage section-error" role="alert">
                <p>The staff room couldn&apos;t be loaded.</p>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setChatAttempt((n) => n + 1)}
                >
                  Try again
                </button>
              </div>
            )}
          >
            <Suspense fallback={<p className="manage-empty manage">Loading…</p>}>
              <ChatPanel chat={staffChat} darkMode={darkMode} />
            </Suspense>
          </ErrorBoundary>
        ) : (
          <p className="manage-empty manage" role={staffChat.status === 'error' ? 'alert' : 'status'}>
            {staffChat.status === 'error' ? staffChat.error : 'Connecting to the staff room…'}
          </p>
        )
      ) : view === 'classes' ? (
        <ClassroomFilter
          selected={selectedClassrooms}
          onChange={setSelectedClassrooms}
          abbreviate={abbreviate}
          onAbbreviateChange={changeAbbreviate}
        />
      ) : (
        <TeacherFilter
          selected={selectedTeachers}
          onChange={setSelectedTeachers}
          abbreviate={abbreviate}
          onAbbreviateChange={changeAbbreviate}
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
      <AbbreviateContext.Provider value={abbreviate}>
        <div className="workspace" hidden={!GRID_VIEWS.has(view)}>
          {view !== 'teachers' ? (
            <TimetableGrid
              classrooms={visibleClassrooms}
              lessons={UNSCHEDULED_LESSONS}
              placements={placements}
              {...editing}
            />
          ) : (
            <TeacherTimetableGrid
              teachers={visibleTeachers}
              lessons={UNSCHEDULED_LESSONS}
              placements={placements}
              {...editing}
            />
          )}
          {readOnly ? null : (
            <UnscheduledTray
              groups={view !== 'teachers' ? visibleClassrooms : visibleTeachers}
              groupMode={view !== 'teachers' ? 'classroom' : 'teacher'}
              lessons={trayLessons}
              onDragStartLesson={handleDragStartLesson}
              onDragEndLesson={handleDragEndLesson}
              onDropUnschedule={handleUnschedule}
            />
          )}
        </div>
      </AbbreviateContext.Provider>
    </div>
  )
}

export default App

/** The class (or teacher) panel a dragged lesson can be dropped into. */
function panelFor(view, lesson) {
  return document
    .querySelector('.grid-scroll')
    ?.querySelector(
      view === 'classes'
        ? `[data-classroom="${cssEscape(lesson.classroom)}"]`
        : `[data-teacher="${cssEscape(lesson.teacher)}"]`,
    )
}

function scrollSchedulePanelIntoView(view, lesson) {
  const scrollRoot = document.querySelector('.grid-scroll')
  const panel = panelFor(view, lesson)
  if (!scrollRoot || !panel) return

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

function pointInRect({ x, y }, rect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

const DRAG_SCROLL_EDGE = 72
const DRAG_SCROLL_MAX = 32

/**
 * Scroll a container when the drag pointer is near its edges. With `target`,
 * only scroll towards a side where that element is cut off, and no further
 * than it takes to bring that side into view.
 */
function autoScrollNearEdges(el, clientX, clientY, target = null) {
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

  if (target) {
    const box = target.getBoundingClientRect()
    const hidden = {
      up: Math.max(0, rect.top - box.top),
      down: Math.max(0, box.bottom - rect.bottom),
      left: Math.max(0, rect.left - box.left),
      right: Math.max(0, box.right - rect.right),
    }
    dy = dy < 0 ? -Math.min(-dy, hidden.up) : Math.min(dy, hidden.down)
    dx = dx < 0 ? -Math.min(-dx, hidden.left) : Math.min(dx, hidden.right)
  }

  if (dy) el.scrollTop += dy
  if (dx) el.scrollLeft += dx
}

/**
 * Panels use content-visibility, so ones skipped over change height once laid
 * out: keep re-aligning until the target holds still (or the user scrolls).
 */
function alignPanel(selector) {
  let frame = 0
  let steady = 0
  let rafId = 0
  const stop = () => window.cancelAnimationFrame(rafId)
  const tick = () => {
    const root = document.querySelector('.grid-scroll')
    const panel = root?.querySelector(selector)
    if (panel) {
      const offset =
        panel.getBoundingClientRect().top - root.getBoundingClientRect().top
      if (Math.abs(offset) > 2) {
        steady = 0
        panel.scrollIntoView({ block: 'start', inline: 'nearest' })
      } else {
        steady += 1
      }
    }
    frame += 1
    if (steady < 5 && frame < 90) rafId = window.requestAnimationFrame(tick)
    else cleanup()
  }
  const cleanup = () => {
    stop()
    window.removeEventListener('wheel', cleanup, true)
    window.removeEventListener('touchstart', cleanup, true)
    window.removeEventListener('keydown', cleanup, true)
  }
  window.addEventListener('wheel', cleanup, true)
  window.addEventListener('touchstart', cleanup, true)
  window.addEventListener('keydown', cleanup, true)
  rafId = window.requestAnimationFrame(tick)
}

/** The class a teacher is class teacher of, else the one they teach most periods in. */
function homeClassroom(teacher, placements) {
  const own = CLASSROOMS.find((c) => CLASS_TEACHERS[c]?.includes(teacher))
  if (own) return own
  const load = new Map()
  for (const lesson of UNSCHEDULED_LESSONS) {
    if (lesson.teacher !== teacher) continue
    const weight = placements[lesson.id] ? lesson.span * 100 : lesson.span
    load.set(lesson.classroom, (load.get(lesson.classroom) ?? 0) + weight)
  }
  let best = null
  for (const classroom of CLASSROOMS) {
    if ((load.get(classroom) ?? 0) > (load.get(best) ?? 0)) best = classroom
  }
  return best
}

function cssEscape(value) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return String(value).replace(/["\\]/g, '\\$&')
}
