import { useEffect, useMemo, useState } from 'react'
import {
  DAYS,
  WEEKEND_DAYS,
  buildTimeGrid,
  classroomDayEnd,
  fixedSessionAt,
  isBreakfast,
  slotsForClassroom,
} from '../data/schedule'
import { evaluatePlacement, lessonsAt, occupiedSlots } from '../data/placement'
import { LessonCard, LESSON_MIME, CoteachCard } from './LessonCard'
import { SlotHead, TimeColumns } from './SlotHead'
import { CLASS_TEACHERS } from '../data/mockLessons'

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
      result.reason === 'pre-lunch' ||
      result.reason === 'end-of-day' ||
      result.reason === 'late' ||
      result.reason === 'hours'
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

  const batchShades = useMemo(
    () => buildBatchShades(lessons, placements),
    [lessons, placements],
  )

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
          const timeGrid = buildTimeGrid(weekdaySlots, saturdaySlots)
          const dimmed =
            Boolean(dragLesson) && dragLesson.classroom !== classroom

          return (
            <section
              key={classroom}
              className={dimmed ? 'class-panel is-drag-dimmed' : 'class-panel'}
              data-classroom={classroom}
              aria-hidden={dimmed ? true : undefined}
              style={{ '--panel-accent': panelAccent() }}
            >
              <header className="class-panel-head" aria-label={classroom}>
                <span className="class-panel-title">
                  <span className="class-panel-badge">{classroom}</span>
                  {CLASS_TEACHERS[classroom] ? (
                    <span
                      className="class-panel-teacher"
                      title={`Class teacher: ${CLASS_TEACHERS[classroom].join(' & ')}`}
                    >
                      {CLASS_TEACHERS[classroom].join(' & ')}
                    </span>
                  ) : null}
                </span>
              </header>
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
                        key={`${classroom}-${day}`}
                        classroom={classroom}
                        day={day}
                        slots={weekdaySlots}
                        colSpans={timeGrid.columnSpans}
                        lessons={lessons}
                        placements={placements}
                        dragLesson={dragLesson}
                        hoverPreview={hoverPreview}
                        batchShades={batchShades}
                        onHoverTarget={setHoverTarget}
                        onDragStartLesson={onDragStartLesson}
                        onDragEndLesson={onDragEndLesson}
                        onDropLesson={onDropLesson}
                      />
                    ))}
                  </tbody>
                  <tbody className="is-saturday">
                    {WEEKEND_DAYS.map((day) => (
                      <DayRow
                        key={`${classroom}-${day}`}
                        classroom={classroom}
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
                        batchShades={batchShades}
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
  colSpans,
  timed,
  lead = 0,
  trailing = 0,
  lessons,
  placements,
  dragLesson,
  hoverPreview,
  batchShades,
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
      {lead > 0 ? (
        <td className="slot is-void" colSpan={lead} aria-hidden="true" />
      ) : null}
      {renderDaySlots({
        classroom,
        day,
        slots,
        colSpans,
        timed,
        lessons,
        placements,
        dragLesson,
        hoverPreview,
        batchShades,
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
  classroom,
  day,
  slots,
  colSpans,
  timed,
  lessons,
  placements,
  dragLesson,
  hoverPreview,
  batchShades,
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

    const session =
      slot.kind === 'fixed' ? fixedSessionAt(classroom, day, slot.id) : null
    if (session) {
      cells.push(
        <td
          key={`${classroom}-${day}-${slot.id}`}
          className="slot is-fixed"
          colSpan={columnsFor(index)}
          title={`${session.parts
            .map((p) => (p.teacher ? `${p.label} · ${p.teacher}` : p.label))
            .join(' + ')} · ${slot.start}–${slot.end}`}
        >
          <div className="fixed-cell">
            {timeOf(slot, index)}
            <span className="fixed-label">
              {session.parts.map((p) => p.label).join(' + ')}
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
          key={`${classroom}-${day}-${slot.id}`}
          className={
            slot.kind === 'fixed'
              ? 'slot is-fixed'
              : `slot is-break${isBreakfast(slot) ? ' is-breakfast' : ''}`
          }
          colSpan={columnsFor(index)}
          title={`${slot.label} · ${slot.start}–${slot.end}${
            slot.kind === 'fixed' ? '' : ' · doubles cannot cross'
          }`}
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
          colSpan={columnsFor(index, colSpan)}
          data-slot-id={slot.id}
        >
          {sameSubject ? (
            <CoteachCard
              lessons={starters.map((item) => item.lesson)}
              showRoom={false}
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
              data-shade={
                isBundle
                  ? (batchShades.get(
                      batchKind(starters.map((item) => item.lesson)),
                    ) ?? 0)
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
                  showRoom={false}
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
                : blockReason === 'pre-lunch'
                  ? ' · only before lunch'
                  : blockReason === 'end-of-day'
                    ? ' · extra classes end the day'
                    : blockReason === 'late'
                      ? ' · juniors end at 2:30 (extras only)'
                      : blockReason === 'hours'
                        ? ` · no classes after ${classroomDayEnd(classroom)}`
                        : ' · can’t place here'
      : ''

    cells.push(
      <td
        key={`${classroom}-${day}-${slot.id}`}
        className={['slot', stateClass].filter(Boolean).join(' ')}
        colSpan={columnsFor(index)}
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
  return '#1a8a82'
}

const BATCH_SHADE_COUNT = 8

/** What a batch is called in its cell: its stream label, else the subjects its group teaches. */
function batchKind(cellLessons) {
  const stream = cellLessons.find((lesson) => lesson.stream)?.stream
  if (stream) return stream
  return [...new Set(cellLessons.map((lesson) => lesson.subject))]
    .sort()
    .join('/')
}

/**
 * Each kind of batch keeps one tint all week; kinds that meet in the same
 * class never share a tint.
 */
function buildBatchShades(lessons, placements) {
  const cells = new Map()
  for (const lesson of lessons) {
    const placement = placements[lesson.id]
    if (!placement || !(lesson.syncGroupId || lesson.stream)) continue
    const key = `${lesson.classroom}|${placement.day}|${placement.slotId}`
    if (!cells.has(key)) cells.set(key, [])
    cells.get(key).push(lesson)
  }

  const classesOf = new Map()
  for (const cellLessons of cells.values()) {
    // Same-subject groups render as one co-taught card, not a batch
    if (new Set(cellLessons.map((lesson) => lesson.subject)).size < 2) continue
    const kind = batchKind(cellLessons)
    if (!classesOf.has(kind)) classesOf.set(kind, new Set())
    classesOf.get(kind).add(cellLessons[0].classroom)
  }

  const kinds = [...classesOf.keys()]
  const neighbours = new Map(kinds.map((k) => [k, new Set()]))
  for (const a of kinds) {
    for (const b of kinds) {
      if (a === b) continue
      for (const c of classesOf.get(a)) {
        if (classesOf.get(b).has(c)) {
          neighbours.get(a).add(b)
          break
        }
      }
    }
  }

  // DSatur: always colour the kind whose neighbours already use the most tints
  const shadeOf = new Map()
  const saturation = (kind) => {
    const used = new Set()
    for (const n of neighbours.get(kind))
      if (shadeOf.has(n)) used.add(shadeOf.get(n))
    return used.size
  }
  const pending = new Set(kinds)
  while (pending.size > 0) {
    let next = null
    for (const kind of pending) {
      if (
        next === null ||
        saturation(kind) > saturation(next) ||
        (saturation(kind) === saturation(next) &&
          (neighbours.get(kind).size > neighbours.get(next).size ||
            (neighbours.get(kind).size === neighbours.get(next).size &&
              kind.localeCompare(next) < 0)))
      ) {
        next = kind
      }
    }
    pending.delete(next)
    const taken = new Map()
    for (const n of neighbours.get(next)) {
      if (!shadeOf.has(n)) continue
      const shade = shadeOf.get(n)
      taken.set(shade, (taken.get(shade) ?? 0) + 1)
    }
    let best = 0
    for (let shade = 0; shade < BATCH_SHADE_COUNT; shade += 1) {
      if (!taken.has(shade)) {
        best = shade
        break
      }
      if (taken.get(shade) < (taken.get(best) ?? 0)) best = shade
    }
    shadeOf.set(next, best)
  }
  return shadeOf
}
