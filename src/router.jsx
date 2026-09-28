import { useSyncExternalStore } from 'react'

/** Minimal History-API routing: the URL path is the source of truth. */

const listeners = new Set()

function subscribe(listener) {
  listeners.add(listener)
  window.addEventListener('popstate', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
  }
}

export function navigate(to, { replace = false } = {}) {
  if (to === window.location.pathname) return
  window.history[replace ? 'replaceState' : 'pushState'](null, '', to)
  listeners.forEach((listener) => listener())
}

export function usePath() {
  return useSyncExternalStore(subscribe, () => window.location.pathname)
}

/** An <a> that navigates in-app on plain left clicks; modified clicks open normally. */
export function Link({ to, onClick, ...props }) {
  return (
    <a
      href={to}
      onClick={(event) => {
        onClick?.(event)
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return
        }
        event.preventDefault()
        navigate(to)
      }}
      {...props}
    />
  )
}
