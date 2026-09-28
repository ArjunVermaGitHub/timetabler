import { useLayoutEffect, useMemo, useRef } from 'react'
import { TrayUnitCard } from './LessonCard'

/**
 * Tray card strip with FLIP reflow so siblings ease into gaps
 * when a card is scheduled away (instead of snapping).
 */
export function TrayCards({ lessons, onDragStartLesson, onDragEndLesson }) {
  const rowRef = useRef(null)
  const prevRects = useRef(new Map())

  const units = useMemo(() => {
    const byKey = new Map()
    for (const lesson of lessons) {
      const key = lesson.syncGroupId || lesson.id
      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key).push(lesson)
    }
    return [...byKey.entries()].map(([key, members]) => ({ key, members }))
  }, [lessons])

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
  }, [units])

  return (
    <div className="tray-cards" ref={rowRef}>
      {units.map(({ key, members }) => (
        <div key={key} className="tray-card-wrap" data-flip-id={key}>
          <TrayUnitCard
            lessons={members}
            onDragStartLesson={onDragStartLesson}
            onDragEndLesson={onDragEndLesson}
          />
        </div>
      ))}
    </div>
  )
}
