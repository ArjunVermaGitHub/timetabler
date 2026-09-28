import { useState } from 'react'
import { api } from '../api'

const TITLES = {
  signin: 'Sign in with your school email.',
  register: 'Create an account with your school email.',
  forgot: "Enter your email and we'll send you a link to reset your password.",
  reset: 'Choose a new password.',
}

export function LoginScreen({ onSignedIn, resetToken = null, notice = null }) {
  const [mode, setMode] = useState(resetToken ? 'reset' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(notice?.kind === 'error' ? notice.text : null)
  const [sent, setSent] = useState(null)

  function switchTo(next) {
    setMode(next)
    setError(null)
    setSent(null)
    setPassword('')
    setConfirm('')
  }

  async function submit(event) {
    event.preventDefault()
    if ((mode === 'register' || mode === 'reset') && password !== confirm) {
      setError("Passwords don't match")
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (mode === 'signin') {
        const { user } = await api('/api/auth/login', {
          method: 'POST',
          body: { email, password },
        })
        return onSignedIn(user)
      }
      if (mode === 'reset') {
        const { user } = await api('/api/auth/reset-password', {
          method: 'POST',
          body: { token: resetToken, password },
        })
        return onSignedIn(user)
      }
      const result = await api(
        mode === 'register' ? '/api/auth/register' : '/api/auth/forgot-password',
        { method: 'POST', body: mode === 'register' ? { email, password } : { email } },
      )
      setSent({ kind: mode, devLink: result.devLink ?? null })
    } catch (err) {
      setError(err.message)
      // Unconfirmed accounts get a fresh confirmation link on sign-in
      if (err.data?.unverified) {
        setSent({ kind: 'register', devLink: err.data.devLink ?? null })
      }
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Check your email</h1>
          <p className="login-hint">
            {sent.kind === 'register'
              ? 'We sent a confirmation link to '
              : 'If that email has an account, a reset link is on its way to '}
            <strong>{email}</strong>.
          </p>
          {sent.devLink ? (
            <p className="login-dev">
              Email isn&apos;t set up locally —{' '}
              <a href={sent.devLink}>
                {sent.kind === 'register' ? 'confirm your email' : 'reset your password'}
              </a>
            </p>
          ) : null}
          <div className="login-links">
            <button type="button" className="link-button" onClick={() => switchTo('signin')}>
              Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  const needsPassword = mode !== 'forgot'
  const newPassword = mode === 'register' || mode === 'reset'

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <h1>Timetable</h1>
        <p className="login-hint">{TITLES[mode]}</p>
        {mode !== 'reset' ? (
          <label className="field">
            <span>School email</span>
            <input
              type="email"
              autoComplete="email"
              autoFocus
              required
              placeholder="name@rajghatbesantschool.org"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
        ) : null}
        {needsPassword ? (
          <label className="field">
            <span>{newPassword ? 'New password' : 'Password'}</span>
            <input
              type="password"
              autoComplete={newPassword ? 'new-password' : 'current-password'}
              autoFocus={mode === 'reset'}
              required
              minLength={newPassword ? 8 : undefined}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        ) : null}
        {newPassword ? (
          <label className="field">
            <span>Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </label>
        ) : null}
        <button type="submit" className="primary-button" disabled={busy}>
          {busy
            ? 'Please wait…'
            : {
                signin: 'Sign in',
                register: 'Create account',
                forgot: 'Send reset link',
                reset: 'Save password',
              }[mode]}
        </button>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="login-links">
          {mode === 'signin' ? (
            <>
              <button type="button" className="link-button" onClick={() => switchTo('register')}>
                Create an account
              </button>
              <button type="button" className="link-button" onClick={() => switchTo('forgot')}>
                Forgot password?
              </button>
            </>
          ) : (
            <button type="button" className="link-button" onClick={() => switchTo('signin')}>
              Back to sign in
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
