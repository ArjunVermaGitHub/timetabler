import { Component, useEffect, useSyncExternalStore } from 'react'

function subscribeOnline(listener) {
  window.addEventListener('online', listener)
  window.addEventListener('offline', listener)
  return () => {
    window.removeEventListener('online', listener)
    window.removeEventListener('offline', listener)
  }
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine)
}

/**
 * Full-page error. While offline it says so, and retries by itself once the
 * connection comes back.
 */
export function ErrorScreen({
  title = 'Something went wrong',
  message,
  onRetry = () => window.location.reload(),
  retryLabel = 'Try again',
}) {
  const online = useOnline()

  useEffect(() => {
    window.addEventListener('online', onRetry)
    return () => window.removeEventListener('online', onRetry)
  }, [onRetry])

  return (
    <div className="boot-screen">
      <div className="error-card" role="alert">
        <h1>{online ? title : "You're offline"}</h1>
        <p>
          {online
            ? message
            : 'Check your internet connection. The timetable will load again as soon as you are back online.'}
        </p>
        <button type="button" className="primary-button" onClick={onRetry}>
          {retryLabel}
        </button>
      </div>
    </div>
  )
}

/** Catches render crashes so a bug shows a way back instead of a blank page. */
export class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error(error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback({ error, reset: this.reset })
    return (
      <ErrorScreen
        message="The page hit an unexpected problem. Reloading usually fixes it."
        retryLabel="Reload"
      />
    )
  }
}
