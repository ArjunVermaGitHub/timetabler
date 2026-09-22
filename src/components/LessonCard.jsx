export function LessonCard({
  lesson,
  variant = 'tray',
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
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article
      className={className}
      style={{ background: lesson.color }}
      title={`${lesson.classroom} · ${lesson.subject} · ${lesson.teacher}${
        lesson.span === 2 ? ' · double period' : ''
      }`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="lesson-card-top">
        <span className="lesson-card-room">{lesson.classroom}</span>
      </div>
      <strong className="lesson-card-subject">{lesson.subject}</strong>
      <span className="lesson-card-teacher">{lesson.teacher}</span>
    </article>
  )
}

export const LESSON_MIME = 'application/x-timetabler-lesson'
