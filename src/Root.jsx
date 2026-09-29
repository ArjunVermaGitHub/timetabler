import { useCallback, useEffect, useState } from 'react'
import { useAuth, useClerk } from '@clerk/react'
import App from './App.jsx'
import { api } from './api'
import { BlockedScreen, LoginScreen } from './components/LoginScreen'
import { applyCatalog } from './data/mockLessons'

export function Root() {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const { signOut: clerkSignOut } = useClerk()
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [blocked, setBlocked] = useState(null)
  const [catalogVersion, setCatalogVersion] = useState(0)
  const [error, setError] = useState(null)

  const loadCatalog = useCallback(async () => {
    try {
      applyCatalog(await api('/api/catalog'))
      setCatalogVersion((v) => v + 1)
      setStatus('ready')
    } catch (err) {
      setError(err.message)
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
        loadCatalog()
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, userId, loadCatalog])

  const signOut = useCallback(() => clerkSignOut(), [clerkSignOut])

  if (!isLoaded || status === 'loading') {
    return <div className="boot-screen">Loading timetable…</div>
  }
  if (status === 'error') {
    return (
      <div className="boot-screen">
        <p>Couldn&apos;t reach the server: {error}</p>
        <button
          type="button"
          className="primary-button"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
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
      onCatalogChange={loadCatalog}
      onSignOut={signOut}
    />
  )
}
