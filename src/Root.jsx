import { useCallback, useEffect, useRef, useState } from 'react'
import App from './App.jsx'
import { api } from './api'
import { LoginScreen } from './components/LoginScreen'
import { applyCatalog } from './data/mockLessons'

/** One-time token from an emailed link (?verify=… or ?reset=…), removed from the URL. */
function takeLinkToken() {
  const params = new URLSearchParams(window.location.search)
  for (const purpose of ['verify', 'reset']) {
    const token = params.get(purpose)
    if (token) {
      window.history.replaceState(null, '', window.location.pathname)
      return { purpose, token }
    }
  }
  return null
}

export function Root() {
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)
  const [catalogVersion, setCatalogVersion] = useState(0)
  const [error, setError] = useState(null)
  const [link] = useState(takeLinkToken)
  const [loginNotice, setLoginNotice] = useState(null)
  const booted = useRef(false)

  const loadCatalog = useCallback(async () => {
    try {
      applyCatalog(await api('/api/catalog'))
      setCatalogVersion((v) => v + 1)
      setStatus('ready')
    } catch (err) {
      if (err.status === 401) {
        setUser(null)
        setStatus('signed-out')
      } else {
        setError(err.message)
        setStatus('error')
      }
    }
  }, [])

  const signedIn = useCallback(
    (me) => {
      setUser(me)
      setStatus('loading')
      loadCatalog()
    },
    [loadCatalog],
  )

  useEffect(() => {
    // Link tokens are single-use: never replay this under StrictMode
    if (booted.current) return
    booted.current = true
    if (link?.purpose === 'verify') {
      api('/api/auth/verify-email', {
        method: 'POST',
        body: { token: link.token },
      })
        .then(({ user: me }) => signedIn(me))
        .catch((err) => {
          setLoginNotice({ kind: 'error', text: err.message })
          setStatus('signed-out')
        })
      return
    }
    if (link?.purpose === 'reset') {
      setStatus('signed-out')
      return
    }
    api('/api/auth/me')
      .then(({ user: me }) => {
        if (!me) return setStatus('signed-out')
        signedIn(me)
      })
      .catch((err) => {
        setError(err.message)
        setStatus('error')
      })
  }, [link, signedIn])

  const signOut = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {})
    setUser(null)
    setStatus('signed-out')
  }, [])

  if (status === 'loading') {
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
  if (status === 'signed-out' || !user) {
    return (
      <LoginScreen
        resetToken={link?.purpose === 'reset' ? link.token : null}
        notice={loginNotice}
        onSignedIn={signedIn}
      />
    )
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
