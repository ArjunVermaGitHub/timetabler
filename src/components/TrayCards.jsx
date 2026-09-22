import { useLayoutEffect, useRef } from 'react'
import { LessonCard } from './LessonCard'

/**
 * Tray card strip with FLIP reflow so siblings ease into gaps
 * when a card is scheduled away (instead of snapping).
 */
export function TrayCards({ lessons, onDragStartLesson, onDragEndLesson }) {
  const rowRef = useRef(null)
  const prevRects = useRef(new Map())

  useLayoutEffect(() => {
    const root = rowRef.current
    if (!root) return

    const nodes = [...root.querySelectorAll('[data-flip-id]')]
    const nextRects = new Map()

    for (const node of nodes) {
      nextRects.set(node.dataset.flipId, node.getBoundingClientRect())
    }

    for (const node of nodes) {
      const id = node.dataset.flipId
      const first = prevRects.current.get(id)
      const last = nextRects.get(id)
      if (!first || !last) continue

      const dx = first.left - last.left
      const dy = first.top - last.top
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue

      node.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: 'translate(0, 0)' },
        ],
        {
          duration: 320,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'both',
        },
      )
    }

    prevRects.current = nextRects
  }, [lessons])

  return (
    <div className="tray-cards" ref={rowRef}>
      {lessons.map((lesson) => (
        <div key={lesson.id} className="tray-card-wrap" data-flip-id={lesson.id}>
          <LessonCard
            lesson={lesson}
            onDragStartLesson={onDragStartLesson}
            onDragEndLesson={onDragEndLesson}
          />
        </div>
      ))}
    </div>
  )
}
