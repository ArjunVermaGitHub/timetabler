import { useEffect, useMemo, useState } from 'react'
import { DAYS, WEEKEND_DAYS, slotsForClassroom } from '../data/schedule'
import {
  evaluatePlacement,
  lessonsAt,
  occupiedSlots,
} from '../data/placement'
import { LessonCard, LESSON_MIME, CoteachCard } from './LessonCard'
import { SlotHead } from './SlotHead'

export function TimetableGrid({
  classrooms,
  lessons,
  placements,
  dragLessonId,
  onDragStartLesson,
  onDragEndLesson,
  onDropLesson,
}) {
  const [hoverTarget, setHoverTarget] = useState(null)

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

    const needed = occupiedSlots(dragLesson, {
      day: hoverTarget.day,
      slotId: hoverTarget.slotId,
    })
    if (needed.length !== dragLesson.span) return null

    const result = evaluatePlacement(
      dragLesson,
      hoverTarget.classroom,
      hoverTarget.day,
      hoverTarget.slotId,
      lessons,
      placements,
    )

    if (result.ok) {
      return {
        classroom: hoverTarget.classroom,
        day: hoverTarget.day,
        slotIds: new Set(needed),
        tone: 'ok',
      }
    }

    // Red for teacher / subject / PE-after-lunch clashes
    if (
      result.reason === 'teacher' ||
      result.reason === 'subject' ||
      result.reason === 'pe'
    ) {
      return {
        classroom: hoverTarget.classroom,
        day: hoverTarget.day,
        slotIds: new Set(needed),
        tone: 'conflict',
        conflictClassroom: result.conflict?.classroom,
      }
    }

    return null
  }, [dragLesson, hoverTarget, lessons, placements])

  if (classrooms.length === 0) {
    return (
      <div className="grid-empty">
        <p>Select at least one class to show its week grid.</p>
      </div>
    )
  }

  return (
    <div className="grid-scroll">
      <div className="grid-stage">
        {classrooms.map((classroom) => {
          const weekdaySlots = slotsForClassroom(classroom, 'Mon')
          const saturdaySlots = slotsForClassroom(classroom, 'Sat')
          const dimmed =
            Boolean(dragLesson) && dragLesson.classroom !== classroom

          return (
            <section
              key={classroom}
              className={
                dimmed ? 'class-panel is-drag-dimmed' : 'class-panel'
              }
              data-classroom={classroom}
              aria-hidden={dimmed ? true : undefined}
              style={{ '--panel-accent': panelAccent() }}
            >
              <aside className="class-panel-side" aria-label={classroom}>
                <span className="class-panel-badge">{classroom}</span>
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
                        key={`${classroom}-${day}`}
                        classroom={classroom}
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
                        key={`${classroom}-${day}`}
                        classroom={classroom}
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
          )
        })}
      </div>
    </div>
  )
}

function DayRow({
  classroom,
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
    return { classroom, day, slotId }
  }

  function handleDragOver(event) {
    event.preventDefault()
    if (!dragLesson) return
    const target = resolveTarget(event.currentTarget, event.clientX)
    if (!target) return

    const result = evaluatePlacement(
      dragLesson,
      target.classroom,
      target.day,
      target.slotId,
      lessons,
      placements,
    )
    event.dataTransfer.dropEffect = result.ok ? 'move' : 'none'

    onHoverTarget((prev) => {
      if (
        prev &&
        prev.classroom === target.classroom &&
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
      if (prev && prev.classroom === classroom && prev.day === day) return null
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
    onDropLesson(lessonId, target.classroom, target.day, target.slotId)
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
        classroom,
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
  classroom,
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
          key={`${classroom}-${day}-${slot.id}`}
          className={
            slot.kind === 'fixed' ? 'slot is-fixed' : 'slot is-break'
          }
          title={`${slot.label} · ${slot.start}–${slot.end}${
            slot.kind === 'fixed' ? '' : ' · doubles cannot cross'
          }`}
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

    const atList = lessonsAt(classroom, day, slot.id, lessons, placements)
    const starters = atList.filter((item) => !item.covered)
    if (starters.length === 0 && atList.some((item) => item.covered)) {
      index += 1
      continue
    }

    if (starters.length > 0) {
      const colSpan = Math.max(...starters.map((item) => item.lesson.span))
      const stream =
        starters.find((item) => item.lesson.stream)?.lesson.stream ?? null
      const syncId = starters[0]?.lesson.syncGroupId
      const isBundle =
        starters.length > 1 &&
        (Boolean(stream) ||
          starters.every(
            (item) =>
              item.lesson.syncGroupId && item.lesson.syncGroupId === syncId,
          ))
      const sameSubject =
        isBundle &&
        starters.every(
          (item) => item.lesson.subject === starters[0].lesson.subject,
        )

      cells.push(
        <td
          key={`${classroom}-${day}-${slot.id}`}
          className={
            starters.length > 1
              ? `slot has-lesson is-stack${isBundle ? ' is-elective-bundle' : ''}${sameSubject ? ' is-coteach' : ''}`
              : 'slot has-lesson'
          }
          colSpan={colSpan}
          data-slot-id={slot.id}
        >
          {sameSubject ? (
            <CoteachCard
              lessons={starters.map((item) => item.lesson)}
              onDragStartLesson={onDragStartLesson}
              onDragEndLesson={onDragEndLesson}
            />
          ) : (
            <div
              className={
                starters.length > 1
                  ? isBundle
                    ? 'lesson-stack is-elective'
                    : 'lesson-stack'
                  : undefined
              }
            >
              {isBundle && stream ? (
                <div className="elective-bundle-label" title={stream}>
                  {stream}
                </div>
              ) : null}
              {starters.map(({ lesson }) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  variant="grid"
                  compact={isBundle}
                  onDragStartLesson={onDragStartLesson}
                  onDragEndLesson={onDragEndLesson}
                />
              ))}
            </div>
          )}
        </td>,
      )
      index += colSpan
      continue
    }

    const isHoverSlot =
      hoverPreview &&
      hoverPreview.classroom === classroom &&
      hoverPreview.day === day &&
      hoverPreview.slotIds.has(slot.id)

    const blockReason = takenSlotReason(
      dragLesson,
      classroom,
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
        ? ' · already has a class here'
        : blockReason === 'subject'
          ? ` · ${dragLesson.subject} already on ${day}`
          : blockReason === 'teacher'
            ? ` · ${dragLesson.teacher} already teaching then`
            : blockReason === 'break'
              ? ' · break for this class'
              : blockReason === 'span'
                ? ' · double can’t fit here'
                : blockReason === 'pe'
                  ? ' · PE only before lunch'
                  : ' · can’t place here'
      : ''

    cells.push(
      <td
        key={`${classroom}-${day}-${slot.id}`}
        className={['slot', stateClass].filter(Boolean).join(' ')}
        title={`${classroom} · ${day} · ${slot.label} (${slot.start}–${slot.end})${titleExtra}`}
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

/** Empty slots that can’t take this drag (teacher clash, subject-once, span, …). */
function takenSlotReason(
  dragLesson,
  classroom,
  day,
  slotId,
  lessons,
  placements,
) {
  if (!dragLesson || dragLesson.classroom !== classroom) return null
  const result = evaluatePlacement(
    dragLesson,
    classroom,
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
    result.reason === 'pe'
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
  return '#1a8a82'
}
