import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import './charismap-theme.css'
import { Root } from './Root.jsx'
import { CLERK_LOCALIZATION } from './components/LoginScreen'

// Theme before first paint, so the sign-in screen matches the saved choice
try {
  document.documentElement.dataset.theme =
    localStorage.getItem('timetabler-theme') === 'dark' ? 'dark' : 'light'
} catch {
  // Ignore storage failures (private mode, etc).
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      localization={CLERK_LOCALIZATION}
    >
      <Root />
    </ClerkProvider>
  </StrictMode>,
)
