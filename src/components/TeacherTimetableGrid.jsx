import { memo, useEffect, useMemo, useState } from 'react'
import {
  DAYS,
  WEEKEND_DAYS,
  buildTimeGrid,
  classroomDayEnd,
  fixedDutyFor,
  isBreakfast,
  slotsForTeacherDay,
} from '../data/schedule'
import {
  evaluatePlacement,
  lessonAtTeacher,
  occupiedSlots,
} from '../data/placement'
import { LessonCard, LESSON_MIME } from './LessonCard'
import { SlotHead, TimeColumns } from './SlotHead'

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
  const timeGrid = useMemo(
    () => buildTimeGrid(weekdaySlots, saturdaySlots),
    [weekdaySlots, saturdaySlots],
  )

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

    if (
      result.reason === 'teacher' ||
      result.reason === 'subject' ||
      result.reason === 'pre-lunch' ||
      result.reason === 'end-of-day' ||
      result.reason === 'late' ||
      result.reason === 'hours'
    ) {
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
        {teachers.map((teacher) => {
          // Only the dragged lesson's teacher panel reacts to drag/hover state
          const mine = dragLesson?.teacher === teacher
          return (
            <TeacherPanel
              key={teacher}
              teacher={teacher}
              weekdaySlots={weekdaySlots}
              saturdaySlots={saturdaySlots}
              timeGrid={timeGrid}
              lessons={lessons}
              placements={placements}
              dragLesson={mine ? dragLesson : null}
              hoverPreview={mine ? hoverPreview : null}
              onHoverTarget={setHoverTarget}
              onDragStartLesson={onDragStartLesson}
              onDragEndLesson={onDragEndLesson}
              onDropLesson={onDropLesson}
            />
          )
        })}
      </div>
    </div>
  )
}

const TeacherPanel = memo(function TeacherPanel({
  teacher,
  weekdaySlots,
  saturdaySlots,
  timeGrid,
  lessons,
  placements,
  dragLesson,
  hoverPreview,
  onHoverTarget: setHoverTarget,
  onDragStartLesson,
  onDragEndLesson,
  onDropLesson,
}) {
  return (
    <section
      className="class-panel"
      data-teacher={teacher}
      style={{ '--panel-accent': panelAccent() }}
    >
      <aside className="class-panel-side" aria-label={teacher}>
        <span className="class-panel-badge is-teacher">{teacher}</span>
      </aside>
      <div className="class-panel-body">
        <table className="timetable">
          <TimeColumns columns={weekdaySlots} cells={timeGrid.cells} />
          <thead>
            <tr>
              <th className="day-col">
                <span className="day-head">
                  <span className="day-head-time">Time</span>
                  <span className="day-head-day">Day</span>
                </span>
              </th>
              {weekdaySlots.map((slot, i) => (
                <SlotHead
                  key={slot.id}
                  slot={slot}
                  colSpan={timeGrid.columnSpans[i]}
                />
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
                colSpans={timeGrid.columnSpans}
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
          <tbody className="is-saturday">
            <tr className="saturday-gap" aria-hidden="true">
              <td className="day-col" />
              <td colSpan={timeGrid.cells.length} />
            </tr>
            {WEEKEND_DAYS.map((day) => (
              <DayRow
                key={`${teacher}-${day}`}
                teacher={teacher}
                day={day}
                slots={saturdaySlots}
                colSpans={timeGrid.slotSpans}
                timed={timeGrid.slotOffGrid}
                lead={timeGrid.lead}
                trailing={timeGrid.trailing}
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
  )
})

function DayRow({
  teacher,
  day,
  slots,
  colSpans,
  timed,
  lead = 0,
  trailing = 0,
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
      {lead > 0 ? (
        <td className="slot is-void" colSpan={lead} aria-hidden="true" />
      ) : null}
      {renderDaySlots({
        teacher,
        day,
        slots,
        colSpans,
        timed,
        lessons,
        placements,
        dragLesson,
        hoverPreview,
        onDragStartLesson,
        onDragEndLesson,
      })}
      {trailing > 0 ? (
        <td className="slot is-void" colSpan={trailing} aria-hidden="true" />
      ) : null}
    </tr>
  )
}

function renderDaySlots({
  teacher,
  day,
  slots,
  colSpans,
  timed,
  lessons,
  placements,
  dragLesson,
  hoverPreview,
  onDragStartLesson,
  onDragEndLesson,
}) {
  const cells = []
  let index = 0
  // Saturday has no header row; slots off the weekday times carry their own
  const timeOf = (slot, i) =>
    timed?.[i] ? (
      <span className="cell-time">
        {slot.start}–{slot.end}
      </span>
    ) : null
  // Grid columns covered by `count` slots from `from` (Saturday slots may span several)
  const columnsFor = (from, count = 1) => {
    if (!colSpans) return count
    let total = 0
    for (let i = from; i < from + count && i < colSpans.length; i += 1)
      total += colSpans[i]
    return total
  }

  while (index < slots.length) {
    const slot = slots[index]

    const duty =
      slot.kind === 'fixed' ? fixedDutyFor(teacher, day, slot.id) : null
    if (duty) {
      cells.push(
        <td
          key={`${teacher}-${day}-${slot.id}`}
          className="slot is-fixed"
          colSpan={columnsFor(index)}
          title={`${duty.label} · ${duty.classroom} · ${slot.start}–${slot.end}`}
        >
          <div className="fixed-cell is-duty">
            {timeOf(slot, index)}
            <span className="fixed-label">
              {duty.label} · {duty.classroom}
            </span>
          </div>
        </td>,
      )
      index += 1
      continue
    }

    if (slot.kind === 'break' || slot.kind === 'fixed') {
      cells.push(
        <td
          key={`${teacher}-${day}-${slot.id}`}
          className={
            slot.kind === 'fixed'
              ? 'slot is-fixed'
              : `slot is-break${isBreakfast(slot) ? ' is-breakfast' : ''}`
          }
          colSpan={columnsFor(index)}
          title={`${slot.label} · ${slot.start}–${slot.end}`}
        >
          <div className={slot.kind === 'fixed' ? 'fixed-cell' : 'break-cell'}>
            {timeOf(slot, index)}
            <span
              className={slot.kind === 'fixed' ? 'fixed-label' : 'break-label'}
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
          colSpan={columnsFor(index, colSpan)}
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
              : blockReason === 'pre-lunch'
                ? ' · only before lunch'
                : blockReason === 'end-of-day'
                  ? ' · extra classes end the day'
                  : blockReason === 'late'
                    ? ' · juniors end at 2:30 (extras only)'
                    : blockReason === 'hours'
                      ? ` · ${dragLesson.classroom} has no classes after ${classroomDayEnd(dragLesson.classroom)}`
                      : ` · can’t place here`
      : ''

    cells.push(
      <td
        key={`${teacher}-${day}-${slot.id}`}
        className={['slot', stateClass].filter(Boolean).join(' ')}
        colSpan={columnsFor(index)}
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
    result.reason === 'span' ||
    result.reason === 'pre-lunch' ||
    result.reason === 'end-of-day' ||
    result.reason === 'late' ||
    result.reason === 'hours'
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
