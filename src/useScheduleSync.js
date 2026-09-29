import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import { UNSCHEDULED_LESSONS } from './data/mockLessons'

const SAVE_DELAY_MS = 800
const RETRY_MS = 5000

/** Drop placements for lessons that no longer exist (links edited since the save). */
export function knownPlacements(placements) {
  const ids = new Set(UNSCHEDULED_LESSONS.map((lesson) => lesson.id))
  return Object.fromEntries(
    Object.entries(placements ?? {}).filter(([id]) => ids.has(id)),
  )
}

/**
 * The timetable is arranged entirely in the browser; this only records the
 * result. Saves are debounced, sent one at a time, and never block the UI.
 */
export function useScheduleSync({ placements, setPlacements, saved, enabled, onConflict }) {
  const version = useRef(saved?.version ?? 0)
  const lastSaved = useRef(JSON.stringify(saved?.placements ?? {}))
  const latest = useRef(placements)
  const queue = useRef(Promise.resolve())
  const [status, setStatus] = useState('saved')
  const [retry, setRetry] = useState(0)

  latest.current = placements

  useEffect(() => {
    if (!enabled || JSON.stringify(placements) === lastSaved.current) return
    setStatus('pending')
    const timer = setTimeout(() => {
      queue.current = queue.current.then(async () => {
        const snapshot = latest.current
        const json = JSON.stringify(snapshot)
        if (json === lastSaved.current) return
        setStatus('saving')
        try {
          const result = await api('/api/schedule', {
            method: 'PUT',
            body: { placements: snapshot, version: version.current },
          })
          version.current = result.version
          lastSaved.current = json
          if (JSON.stringify(latest.current) === json) setStatus('saved')
        } catch (err) {
          const theirs = err.data?.latest
          if (err.status === 409 && theirs) {
            version.current = theirs.version
            lastSaved.current = JSON.stringify(theirs.placements)
            setPlacements(knownPlacements(theirs.placements))
            setStatus('saved')
            onConflict?.(`${err.message} — showing their version now.`)
          } else {
            setStatus('error')
            setTimeout(() => setRetry((n) => n + 1), RETRY_MS)
          }
        }
      })
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [placements, enabled, retry, setPlacements, onConflict])

  // Warn before closing the tab while a save is still on its way
  useEffect(() => {
    if (status === 'saved') return
    const warn = (event) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [status])

  return status
}
