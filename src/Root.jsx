import { useCallback, useEffect, useState } from 'react'
import { useAuth, useClerk } from '@clerk/react'
import App from './App.jsx'
import { api, isNetworkError } from './api'
import { ErrorBoundary, ErrorScreen } from './components/ErrorScreen'
import { BlockedScreen, LoginScreen } from './components/LoginScreen'
import { applyCatalog } from './data/mockLessons'

const SIGN_IN_TIMEOUT_MS = 15_000

function describe(err) {
  if (isNetworkError(err)) return `${err.message}. Check your connection and try again.`
  return err.message
}

export function Root() {
  return (
    <ErrorBoundary>
      <Boot />
    </ErrorBoundary>
  )
}

function Boot() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const { signOut: clerkSignOut, status: clerkStatus } = useClerk()
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [blocked, setBlocked] = useState(null)
  const [catalogVersion, setCatalogVersion] = useState(0)
  const [savedSchedule, setSavedSchedule] = useState(null)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [authSlow, setAuthSlow] = useState(false)

  useEffect(() => {
    if (isLoaded) return undefined
    const timer = setTimeout(() => setAuthSlow(true), SIGN_IN_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [isLoaded])

  const loadCatalog = useCallback(async ({ withSchedule = false } = {}) => {
    try {
      const [catalog, schedule] = await Promise.all([
        api('/api/catalog'),
        withSchedule ? api('/api/schedule') : null,
      ])
      applyCatalog(catalog)
      if (schedule) setSavedSchedule(schedule)
      setCatalogVersion((v) => v + 1)
      setStatus('ready')
    } catch (err) {
      setError(describe(err))
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      setUser(null)
      setBlocked(null)
      setStatus('signed-out')
      return
    }
    let cancelled = false
    setStatus('loading')
    api('/api/auth/me')
      .then(({ user: me, blocked: denied }) => {
        if (cancelled) return
        if (!me) {
          setBlocked(denied ?? { email: null, domain: 'school' })
          setStatus('blocked')
          return
        }
        setUser(me)
        loadCatalog({ withSchedule: true })
      })
      .catch((err) => {
        if (cancelled) return
        setError(describe(err))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, userId, loadCatalog, attempt])

  const signOut = useCallback(() => clerkSignOut(), [clerkSignOut])
  const reloadCatalog = useCallback(() => loadCatalog(), [loadCatalog])
  const retry = useCallback(() => {
    setStatus('loading')
    setAttempt((n) => n + 1)
  }, [])

  if (!isLoaded) {
    if (authSlow || clerkStatus === 'error') {
      return (
        <ErrorScreen
          title="Couldn't load sign-in"
          message="The sign-in service is taking too long. Check your connection and try again."
        />
      )
    }
    return <div className="boot-screen">Loading timetable…</div>
  }
  if (status === 'loading') {
    return <div className="boot-screen">Loading timetable…</div>
  }
  if (status === 'error') {
    return (
      <ErrorScreen
        title="Couldn't load the timetable"
        message={error}
        onRetry={retry}
      />
    )
  }
  if (status === 'blocked') {
    return <BlockedScreen email={blocked.email} domain={blocked.domain} />
  }
  if (status === 'signed-out' || !user) {
    return <LoginScreen />
  }
  return (
    <App
      user={user}
      catalogVersion={catalogVersion}
      savedSchedule={savedSchedule}
      onCatalogChange={reloadCatalog}
      onSignOut={signOut}
    />
  )
}
