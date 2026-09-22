import { useEffect, useMemo, useState } from 'react'
import { DAYS, WEEKEND_DAYS, slotsForTeacherDay } from '../data/schedule'
import {
  evaluatePlacement,
  lessonAtTeacher,
  occupiedSlots,
} from '../data/placement'
import { LessonCard, LESSON_MIME } from './LessonCard'
import { SlotHead } from './SlotHead'

/**
 * Same days/slots as the class view, but each panel is a teacher.
 * Placements are shared — drop still schedules that lesson into its classroom.
 */
export function TeacherTimetableGrid({
  teachers,
  lessons,
  placements,
  dragLessonId,
  onDragStartLesson,
  onDragEndLesson,
  onDropLesson,
}) {
  const [hoverTarget, setHoverTarget] = useState(null)

  const weekdaySlots = useMemo(() => slotsForTeacherDay('Mon'), [])
  const saturdaySlots = useMemo(() => slotsForTeacherDay('Sat'), [])

  const dragLesson = useMemo(
    () =>
      dragLessonId
        ? (lessons.find((lesson) => lesson.id === dragLessonId) ?? null)
        : null,
    [dragLessonId, lessons],
  )

  useEffect(() => {
    if (!dragLessonId) setHoverTarget(null)
  }, [dragLessonId])

  const hoverPreview = useMemo(() => {
    if (!dragLesson || !hoverTarget) return null
    if (dragLesson.teacher !== hoverTarget.teacher) return null

    const needed = occupiedSlots(dragLesson, {
      day: hoverTarget.day,
      slotId: hoverTarget.slotId,
    })
    if (needed.length !== dragLesson.span) return null

    const result = evaluatePlacement(
      dragLesson,
      dragLesson.classroom,
      hoverTarget.day,
      hoverTarget.slotId,
      lessons,
      placements,
    )

    if (result.ok) {
      return {
        teacher: hoverTarget.teacher,
        day: hoverTarget.day,
        slotIds: new Set(needed),
        tone: 'ok',
      }
    }

    if (result.reason === 'teacher' || result.reason === 'subject') {
      return {
        teacher: hoverTarget.teacher,
        day: hoverTarget.day,
        slotIds: new Set(needed),
        tone: 'conflict',
      }
    }

    return null
  }, [dragLesson, hoverTarget, lessons, placements])

  if (teachers.length === 0) {
    return (
      <div className="grid-empty">
        <p>Select at least one teacher to show their week grid.</p>
      </div>
    )
  }

  return (
    <div className="grid-scroll">
      <div className="grid-stage">
        {teachers.map((teacher) => (
          <section
            key={teacher}
            className="class-panel"
            data-teacher={teacher}
            style={{ '--panel-accent': panelAccent() }}
          >
            <aside className="class-panel-side" aria-label={teacher}>
              <span className="class-panel-badge is-teacher">{teacher}</span>
            </aside>
            <div className="class-panel-body">
              <table className="timetable">
                <thead>
                  <tr>
                    <th className="day-col">
                      <span className="day-head">Day</span>
                    </th>
                      {weekdaySlots.map((slot) => (
                        <SlotHead key={slot.id} slot={slot} />
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day) => (
                    <DayRow
                      key={`${teacher}-${day}`}
                      teacher={teacher}
                      day={day}
                      slots={weekdaySlots}
                      lessons={lessons}
                      placements={placements}
                      dragLesson={dragLesson}
                      hoverPreview={hoverPreview}
                      onHoverTarget={setHoverTarget}
                      onDragStartLesson={onDragStartLesson}
                      onDragEndLesson={onDragEndLesson}
                      onDropLesson={onDropLesson}
                    />
                  ))}
                </tbody>
              </table>
              <table className="timetable is-saturday">
                <thead>
                  <tr>
                    <th className="day-col">
                      <span className="day-head">Day</span>
                    </th>
                      {saturdaySlots.map((slot) => (
                        <SlotHead key={slot.id} slot={slot} />
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {WEEKEND_DAYS.map((day) => (
                    <DayRow
                      key={`${teacher}-${day}`}
                      teacher={teacher}
                      day={day}
                      slots={saturdaySlots}
                      lessons={lessons}
                      placements={placements}
                      dragLesson={dragLesson}
                      hoverPreview={hoverPreview}
                      onHoverTarget={setHoverTarget}
                      onDragStartLesson={onDragStartLesson}
                      onDragEndLesson={onDragEndLesson}
                      onDropLesson={onDropLesson}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function DayRow({
  teacher,
  day,
  slots,
  lessons,
  placements,
  dragLesson,
  hoverPreview,
  onHoverTarget,
  onDragStartLesson,
  onDragEndLesson,
  onDropLesson,
}) {
  function resolveTarget(rowEl, clientX) {
    const slotId = nearestPeriodSlotId(rowEl, clientX, slots)
    if (!slotId) return null
    return { teacher, day, slotId }
  }

  function handleDragOver(event) {
    event.preventDefault()
    if (!dragLesson) return
    const target = resolveTarget(event.currentTarget, event.clientX)
    if (!target) return

    const matchesTeacher = dragLesson.teacher === teacher
    const result = matchesTeacher
      ? evaluatePlacement(
          dragLesson,
          dragLesson.classroom,
          target.day,
          target.slotId,
          lessons,
          placements,
        )
      : { ok: false }

    event.dataTransfer.dropEffect = result.ok ? 'move' : 'none'

    onHoverTarget((prev) => {
      if (
        prev &&
        prev.teacher === target.teacher &&
        prev.day === target.day &&
        prev.slotId === target.slotId
      ) {
        return prev
      }
      return target
    })
  }

  function handleDragLeave(event) {
    const next = event.relatedTarget
    if (next && event.currentTarget.contains(next)) return
    onHoverTarget((prev) => {
      if (prev && prev.teacher === teacher && prev.day === day) return null
      return prev
    })
  }

  function handleDrop(event) {
    event.preventDefault()
    onHoverTarget(null)
    const target = resolveTarget(event.currentTarget, event.clientX)
    const lessonId =
      event.dataTransfer.getData(LESSON_MIME) ||
      event.dataTransfer.getData('text/plain')
    if (!lessonId || !target) return
    const lesson = lessons.find((item) => item.id === lessonId)
    if (!lesson || lesson.teacher !== teacher) return
    // Schedule into the lesson's own classroom at this day/slot.
    onDropLesson(lessonId, lesson.classroom, target.day, target.slotId)
  }

  return (
    <tr
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <th className="day-col">
        <span className="day-pill">{day}</span>
      </th>
      {renderDaySlots({
        teacher,
        day,
        slots,
        lessons,
        placements,
        dragLesson,
        hoverPreview,
        onDragStartLesson,
        onDragEndLesson,
      })}
    </tr>
  )
}

function renderDaySlots({
  teacher,
  day,
  slots,
  lessons,
  placements,
  dragLesson,
  hoverPreview,
  onDragStartLesson,
  onDragEndLesson,
}) {
  const cells = []
  let index = 0

  while (index < slots.length) {
    const slot = slots[index]

    if (slot.kind === 'break' || slot.kind === 'fixed') {
      cells.push(
        <td
          key={`${teacher}-${day}-${slot.id}`}
          className={
            slot.kind === 'fixed' ? 'slot is-fixed' : 'slot is-break'
          }
          title={`${slot.label} · ${slot.start}–${slot.end}`}
        >
          <div
            className={
              slot.kind === 'fixed' ? 'fixed-cell' : 'break-cell'
            }
          >
            <span
              className={
                slot.kind === 'fixed' ? 'fixed-label' : 'break-label'
              }
            >
              {slot.label}
            </span>
          </div>
        </td>,
      )
      index += 1
      continue
    }

    const at = lessonAtTeacher(teacher, day, slot.id, lessons, placements)
    if (at?.covered) {
      index += 1
      continue
    }

    if (at && !at.covered) {
      const colSpan = at.lesson.span === 2 ? 2 : 1
      cells.push(
        <td
          key={`${teacher}-${day}-${slot.id}`}
          className="slot has-lesson"
          colSpan={colSpan}
          data-slot-id={slot.id}
        >
          <LessonCard
            lesson={at.lesson}
            variant="grid"
            onDragStartLesson={onDragStartLesson}
            onDragEndLesson={onDragEndLesson}
          />
        </td>,
      )
      index += colSpan
      continue
    }

    const isHoverSlot =
      hoverPreview &&
      hoverPreview.teacher === teacher &&
      hoverPreview.day === day &&
      hoverPreview.slotIds.has(slot.id)

    const blockReason = takenSlotReason(
      dragLesson,
      teacher,
      day,
      slot.id,
      lessons,
      placements,
    )

    const stateClass = isHoverSlot
      ? hoverPreview.tone === 'conflict'
        ? 'is-drop-conflict'
        : 'is-drop-hover'
      : blockReason
        ? 'is-slot-taken'
        : ''

    const titleExtra = blockReason
      ? blockReason === 'occupied'
        ? ` · ${dragLesson.classroom} already has a class here`
        : blockReason === 'subject'
          ? ` · ${dragLesson.subject} already on ${day}`
          : blockReason === 'teacher'
            ? ` · ${dragLesson.teacher} already teaching then`
            : blockReason === 'break'
              ? ` · break for ${dragLesson.classroom}`
              : ` · can’t place here`
      : ''

    cells.push(
      <td
        key={`${teacher}-${day}-${slot.id}`}
        className={['slot', stateClass].filter(Boolean).join(' ')}
        title={`${teacher} · ${day} · ${slot.label} (${slot.start}–${slot.end})${titleExtra}`}
        data-slot-id={slot.id}
        data-empty="true"
      >
        <div className="slot-placeholder" />
      </td>,
    )
    index += 1
  }

  return cells
}

/** Empty-looking teacher slots that can’t take this drag (usually class already filled). */
function takenSlotReason(
  dragLesson,
  teacher,
  day,
  slotId,
  lessons,
  placements,
) {
  if (!dragLesson || dragLesson.teacher !== teacher) return null
  const result = evaluatePlacement(
    dragLesson,
    dragLesson.classroom,
    day,
    slotId,
    lessons,
    placements,
  )
  if (result.ok) return null
  if (
    result.reason === 'occupied' ||
    result.reason === 'subject' ||
    result.reason === 'teacher' ||
    result.reason === 'break' ||
    result.reason === 'span'
  ) {
    return result.reason
  }
  return null
}

function nearestPeriodSlotId(rowEl, clientX, slots) {
  const cells = rowEl.querySelectorAll(
    'td.slot[data-slot-id][data-empty="true"]',
  )
  if (cells.length === 0) return null

  let bestId = null
  let bestDist = Infinity

  for (const cell of cells) {
    const rect = cell.getBoundingClientRect()
    if (rect.width <= 0) continue
    const centerX = rect.left + rect.width / 2
    const dist = Math.abs(clientX - centerX)
    if (dist < bestDist) {
      bestDist = dist
      bestId = cell.dataset.slotId
    } else if (dist === bestDist && bestId) {
      const order = slots.findIndex((slot) => slot.id === cell.dataset.slotId)
      const bestOrder = slots.findIndex((slot) => slot.id === bestId)
      if (order >= 0 && order < bestOrder) bestId = cell.dataset.slotId
    }
  }

  return bestId
}

function panelAccent() {
  return '#c45c3a'
}
