export function LessonCard({
  lesson,
  variant = 'tray',
  compact = false,
  onDragStartLesson,
  onDragEndLesson,
}) {
  function handleDragStart(event) {
    event.dataTransfer.setData('application/x-timetabler-lesson', lesson.id)
    event.dataTransfer.setData('text/plain', lesson.id)
    event.dataTransfer.effectAllowed = 'move'
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
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {!compact ? (
        <div className="lesson-card-top">
          <span className="lesson-card-room">{lesson.classroom}</span>
        </div>
      ) : null}
      <strong className="lesson-card-subject">{lesson.subject}</strong>
      <span className="lesson-card-teacher">{lesson.teacher}</span>
    </article>
  )
}

/**
 * One cell for co-taught sessions (Life Skills, Art Education, …):
 * same subject, many facilitators — avoid repeating the subject 11×.
 */
export function CoteachCard({
  lessons,
  onDragStartLesson,
  onDragEndLesson,
}) {
  const lead = lessons[0]
  if (!lead) return null
  const teachers = lessons.map((lesson) => lesson.teacher)
  const teacherLine =
    teachers.length <= 3
      ? teachers.join(', ')
      : `${teachers.slice(0, 2).join(', ')} +${teachers.length - 2} more`

  function handleDragStart(event) {
    event.dataTransfer.setData('application/x-timetabler-lesson', lead.id)
    event.dataTransfer.setData('text/plain', lead.id)
    event.dataTransfer.effectAllowed = 'move'
    onDragStartLesson?.(lead.id)
  }

  return (
    <article
      className="lesson-card is-grid is-coteach"
      style={{ background: lead.color }}
      title={`${lead.classroom} · ${lead.subject} · ${teachers.join(', ')}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => onDragEndLesson?.()}
    >
      <div className="lesson-card-top">
        <span className="lesson-card-room">{lead.classroom}</span>
        <span className="lesson-card-coteach-count">
          {teachers.length} staff
        </span>
      </div>
      <strong className="lesson-card-subject">{lead.subject}</strong>
      <span className="lesson-card-teacher">{teacherLine}</span>
    </article>
  )
}

export const LESSON_MIME = 'application/x-timetabler-lesson'
