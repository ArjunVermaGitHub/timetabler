import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LESSON_MIME } from './LessonCard'
import { TrayCards } from './TrayCards'

const MIN_TRAY_PX = 118
/** Grip + slim drop strip when nothing is waiting. */
const EMPTY_TRAY_PX = 36
const MAX_TRAY_RATIO = 0.55
/** Approx. group row height (label + cards + gaps). */
const ROW_PX = 96
const CHROME_PX = 52

export function UnscheduledTray({
  groups,
  groupMode = 'classroom',
  lessons,
  onDragStartLesson,
  onDragEndLesson,
  onDropUnschedule,
}) {
  const trayRef = useRef(null)
  const dragRef = useRef(null)
  const [heightPx, setHeightPx] = useState(null)
  const [dragging, setDragging] = useState(false)
  const wasEmptyRef = useRef(lessons.length === 0)

  const isEmpty = lessons.length === 0

  const visibleGroups = useMemo(() => {
    return groups
      .map((group) => ({
        group,
        lessons: lessons.filter((lesson) =>
          groupMode === 'teacher'
            ? lesson.teacher === group
            : lesson.classroom === group,
        ),
      }))
      .filter((item) => item.lessons.length > 0)
  }, [groups, groupMode, lessons])

  const maxHeight = useCallback(() => {
    return Math.round(window.innerHeight * MAX_TRAY_RATIO)
  }, [])

  const heightForRows = useCallback(
    (rows) => {
      const n = Math.max(1, rows)
      return Math.min(
        maxHeight(),
        Math.max(MIN_TRAY_PX, CHROME_PX + n * ROW_PX),
      )
    },
    [maxHeight],
  )

  // Collapse flat when empty; expand when the first lesson returns
  useEffect(() => {
    if (isEmpty) {
      setHeightPx(EMPTY_TRAY_PX)
      wasEmptyRef.current = true
      return
    }
    if (wasEmptyRef.current || heightPx == null || heightPx <= EMPTY_TRAY_PX) {
      const rows = Math.min(3, Math.max(1, visibleGroups.length))
      setHeightPx(heightForRows(rows))
      wasEmptyRef.current = false
    }
  }, [isEmpty, visibleGroups.length, heightPx, heightForRows])

  // When group count changes after a manual resize, keep height but clamp
  useEffect(() => {
    if (isEmpty || heightPx == null) return
    setHeightPx((h) => Math.min(maxHeight(), Math.max(MIN_TRAY_PX, h)))
  }, [visibleGroups.length, isEmpty, heightPx, maxHeight])

  useEffect(() => {
    function onResize() {
      setHeightPx((h) => {
        if (h == null) return h
        if (isEmpty) return EMPTY_TRAY_PX
        return Math.min(maxHeight(), Math.max(MIN_TRAY_PX, h))
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [maxHeight, isEmpty])

  function handleDragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(event) {
    event.preventDefault()
    const lessonId =
      event.dataTransfer.getData(LESSON_MIME) ||
      event.dataTransfer.getData('text/plain')
    if (lessonId) onDropUnschedule(lessonId)
  }

  function handleGripPointerDown(event) {
    if (isEmpty || event.button !== 0) return
    event.preventDefault()
    const startY = event.clientY
    const startH =
      trayRef.current?.getBoundingClientRect().height ??
      heightPx ??
      MIN_TRAY_PX
    dragRef.current = { startY, startH }
    setDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleGripPointerMove(event) {
    if (!dragRef.current) return
    const { startY, startH } = dragRef.current
    // Dragging the grip upward (smaller clientY) grows the tray
    const next = Math.round(startH + (startY - event.clientY))
    setHeightPx(Math.min(maxHeight(), Math.max(MIN_TRAY_PX, next)))
  }

  function handleGripPointerUp(event) {
    if (!dragRef.current) return
    dragRef.current = null
    setDragging(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
  }

  function handleGripDoubleClick() {
    if (isEmpty) return
    const rows = Math.max(1, visibleGroups.length)
    setHeightPx(heightForRows(rows))
  }

  const style =
    heightPx != null
      ? {
          height: `${heightPx}px`,
          ['--tray-rows']: String(visibleGroups.length),
        }
      : undefined

  const trayClass = [
    'tray',
    dragging ? 'is-resizing' : '',
    isEmpty ? 'is-empty' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <aside
      ref={trayRef}
      className={trayClass}
      style={style}
      aria-label="Unscheduled classes"
    >
      <div
        className="tray-rail"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div
          className="tray-grip"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize unscheduled tray"
          aria-valuenow={heightPx ?? (isEmpty ? EMPTY_TRAY_PX : MIN_TRAY_PX)}
          aria-valuemin={isEmpty ? EMPTY_TRAY_PX : MIN_TRAY_PX}
          aria-valuemax={maxHeight()}
          aria-disabled={isEmpty}
          tabIndex={isEmpty ? -1 : 0}
          onPointerDown={handleGripPointerDown}
          onPointerMove={handleGripPointerMove}
          onPointerUp={handleGripPointerUp}
          onPointerCancel={handleGripPointerUp}
          onDoubleClick={handleGripDoubleClick}
          title={
            isEmpty
              ? 'Drop a lesson here'
              : 'Drag up to show more class rows · double-click to fit all'
          }
        />
        {isEmpty ? (
          <p className="tray-empty-hint">Drop here</p>
        ) : (
          <>
            <div className="tray-head">
              <div>
                <h2>Unscheduled tray</h2>
                <p>
                  {lessons.length} waiting · one row per{' '}
                  {groupMode === 'teacher' ? 'teacher' : 'class'} · drag grip up
                  for more rows
                </p>
              </div>
            </div>
            <div className="tray-body">
              {visibleGroups.map(({ group, lessons: groupLessons }) => (
                <section key={group} className="tray-group">
                  <h3>{group}</h3>
                  <TrayCards
                    lessons={groupLessons}
                    onDragStartLesson={onDragStartLesson}
                    onDragEndLesson={onDragEndLesson}
                  />
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
