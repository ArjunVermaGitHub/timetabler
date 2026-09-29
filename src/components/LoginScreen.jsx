import { SignIn, useClerk } from '@clerk/react'

const APPEARANCE = {
  variables: {
    colorPrimary: '#1f8378',
    fontFamily: "'Nunito Sans', system-ui, sans-serif",
    borderRadius: '10px',
  },
  // Email + password only; the Clerk instance's social providers stay hidden
  elements: {
    socialButtonsRoot: { display: 'none' },
    dividerRow: { display: 'none' },
  },
}

export const CLERK_LOCALIZATION = {
  signIn: {
    start: {
      title: 'Sign in to the RBS timetable',
      titleCombined: 'Sign in to the RBS timetable',
      subtitle: 'Use your school email',
      subtitleCombined: 'Use your school email',
    },
  },
  signUp: {
    start: {
      title: 'Create your timetable account',
      titleCombined: 'Create your timetable account',
      subtitle: 'Use your school email',
      subtitleCombined: 'Use your school email',
    },
  },
}

/** Clerk handles sign-in, sign-up, email codes and password resets. */
export function LoginScreen() {
  return (
    <div className="login-page">
      <SignIn routing="hash" withSignUp appearance={APPEARANCE} />
    </div>
  )
}

/** Signed in to Clerk, but with an address the school doesn't allow. */
export function BlockedScreen({ email, domain }) {
  const { signOut } = useClerk()
  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Timetable</h1>
        <p className="login-hint">
          {email ? (
            <>
              <strong>{email}</strong> can&apos;t open the timetable.
            </>
          ) : (
            'Your account has no confirmed email address.'
          )}{' '}
          Sign in with your {domain} email instead.
        </p>
        <button type="button" className="primary-button" onClick={() => signOut()}>
          Use a different account
        </button>
      </div>
    </div>
  )
}
