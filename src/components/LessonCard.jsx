import { useNames } from '../abbreviate'

export function LessonCard({
  lesson,
  variant = 'tray',
  compact = false,
  showRoom = true,
  onDragStartLesson,
  onDragEndLesson,
}) {
  const names = useNames()

  function handleDragStart(event) {
    event.dataTransfer.setData('application/x-timetabler-lesson', lesson.id)
    event.dataTransfer.setData('text/plain', lesson.id)
    event.dataTransfer.effectAllowed = 'move'
    setCardDragImage(event)
    onDragStartLesson?.(lesson.id)
  }

  function handleDragEnd() {
    onDragEndLesson?.()
  }

  const className = [
    'lesson-card',
    lesson.span === 2 ? 'is-double' : '',
    variant === 'grid' ? 'is-grid' : 'is-tray',
    compact ? 'is-compact' : '',
    names.abbreviate ? 'is-abbr' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      className={className}
      style={{ background: lesson.color }}
      title={`${lesson.classroom} · ${lesson.subject} · ${lesson.teacher}${
        lesson.span === 2 ? ' · double period' : ''
      }${lesson.stream ? ` · ${lesson.stream}` : ''}`}
      draggable={Boolean(onDragStartLesson)}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {!compact && showRoom ? (
        <div className="lesson-card-top">
          <span className="lesson-card-room">{lesson.classroom}</span>
        </div>
      ) : null}
      <strong className="lesson-card-subject">{names.subject(lesson.subject)}</strong>
      <span className="lesson-card-teacher">{names.teacher(lesson.teacher)}</span>
    </article>
  )
}

/** Abbreviations are short enough to list every teacher; full names cap at three. */
function teacherSummary(teachers, names) {
  if (names.abbreviate) return teachers.map(names.teacher).join(', ')
  return teachers.length <= 3
    ? teachers.join(', ')
    : `${teachers.slice(0, 2).join(', ')} +${teachers.length - 2} more`
}

/**
 * One cell for co-taught sessions (Life Skills, Art Education, …):
 * same subject, many facilitators — avoid repeating the subject 11×.
 */
export function CoteachCard({
  lessons,
  showRoom = true,
  onDragStartLesson,
  onDragEndLesson,
}) {
  const names = useNames()
  const lead = lessons[0]
  if (!lead) return null
  const teachers = lessons.map((lesson) => lesson.teacher)
  const teacherLine = teacherSummary(teachers, names)

  function handleDragStart(event) {
    event.dataTransfer.setData('application/x-timetabler-lesson', lead.id)
    event.dataTransfer.setData('text/plain', lead.id)
    event.dataTransfer.effectAllowed = 'move'
    setCardDragImage(event)
    onDragStartLesson?.(lead.id)
  }

  return (
    <article
      className={`lesson-card is-grid is-coteach${names.abbreviate ? ' is-abbr' : ''}`}
      style={{ background: lead.color }}
      title={`${lead.classroom} · ${lead.subject} · ${teachers.join(', ')}`}
      draggable={Boolean(onDragStartLesson)}
      onDragStart={handleDragStart}
      onDragEnd={() => onDragEndLesson?.()}
    >
      <div className="lesson-card-top">
        {showRoom ? (
          <span className="lesson-card-room">{lead.classroom}</span>
        ) : null}
        <span className="lesson-card-coteach-count">
          {teachers.length} staff
        </span>
      </div>
      <strong className="lesson-card-subject">{names.subject(lead.subject)}</strong>
      <span className="lesson-card-teacher">{teacherLine}</span>
    </article>
  )
}

/**
 * Tray card for one schedulable unit: a single lesson, or every member of a
 * sync group (elective stream, co-taught or cross-class joint session).
 */
export function TrayUnitCard({ lessons, onDragStartLesson, onDragEndLesson }) {
  const names = useNames()
  const lead = lessons[0]
  if (!lead) return null
  const isDouble = lead.span === 2
  const classes = lead.jointClasses ?? [
    ...new Set(lessons.map((lesson) => lesson.classroom)),
  ]
  const isJoint = classes.length > 1
  const subjects = [...new Set(lessons.map((lesson) => lesson.subject))]
  const teachers = [...new Set(lessons.map((lesson) => lesson.teacher))]
  const rows =
    subjects.length > 1
      ? subjects.map((subject) => ({
          subject,
          teachers: [
            ...new Set(
              lessons
                .filter((lesson) => lesson.subject === subject)
                .map((lesson) => lesson.teacher),
            ),
          ],
        }))
      : null
  const teacherLine = teacherSummary(teachers, names)

  function handleDragStart(event) {
    event.dataTransfer.setData(LESSON_MIME, lead.id)
    event.dataTransfer.setData('text/plain', lead.id)
    event.dataTransfer.effectAllowed = 'move'
    setCardDragImage(event)
    onDragStartLesson?.(lead.id)
  }

  const className = [
    'lesson-card',
    'is-tray',
    isDouble ? 'is-double' : '',
    lessons.length > 1 ? 'is-tray-bundle' : '',
    names.abbreviate ? 'is-abbr' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      className={className}
      style={{ background: lead.color }}
      title={[
        classes.join(' + '),
        lead.stream,
        ...lessons.map((lesson) => `${lesson.subject} · ${lesson.teacher}`),
        isDouble ? 'double period' : null,
        lead.timing === 'end-of-day' ? 'end-of-day extra class' : null,
        lead.timing === 'pre-lunch' ? 'before lunch only' : null,
      ]
        .filter(Boolean)
        .join('\n')}
      draggable={Boolean(onDragStartLesson)}
      onDragStart={handleDragStart}
      onDragEnd={() => onDragEndLesson?.()}
    >
      <div className="lesson-card-top">
        <span className="lesson-card-room">{classes.join(' · ')}</span>
        <span className="lesson-card-badges">
          {isJoint ? <span className="lesson-card-badge">Joint</span> : null}
          {isDouble ? <span className="lesson-card-badge">Double</span> : null}
        </span>
      </div>
      {lead.stream ? (
        <span className="lesson-card-stream">{lead.stream}</span>
      ) : null}
      {rows ? (
        <ul className="lesson-card-lines">
          {rows.map((row) => (
            <li key={row.subject}>
              <strong>{names.subject(row.subject)}</strong>{' '}
              {row.teachers.map(names.teacher).join(', ')}
            </li>
          ))}
        </ul>
      ) : (
        <>
          <strong className="lesson-card-subject">{names.subject(lead.subject)}</strong>
          <span className="lesson-card-teacher">{teacherLine}</span>
        </>
      )}
    </article>
  )
}

export const LESSON_MIME = 'application/x-timetabler-lesson'

/**
 * Chrome snapshots the dragged card together with whatever sits behind its
 * rounded corners. Drag a detached clone instead so the corners stay clear.
 */
function setCardDragImage(event) {
  const card = event.currentTarget
  if (!event.dataTransfer?.setDragImage) return
  const rect = card.getBoundingClientRect()
  const style = getComputedStyle(card)
  const ghost = card.cloneNode(true)
  Object.assign(ghost.style, {
    position: 'fixed',
    top: '-10000px',
    left: '-10000px',
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    borderRadius: style.borderRadius,
    boxShadow: 'none',
    pointerEvents: 'none',
  })
  document.body.appendChild(ghost)
  event.dataTransfer.setDragImage(
    ghost,
    event.clientX - rect.left,
    event.clientY - rect.top,
  )
  requestAnimationFrame(() => ghost.remove())
}
