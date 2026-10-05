const loaders = {
  pdf: () => import('./data/timetablePdf'),
  manage: () => import('./components/ManagePanel'),
}

const cache = {}

function isStaleChunk(error) {
  return /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(
    error?.message ?? '',
  )
}

const RELOAD_KEY = 'timetabler-stale-reload'

/** Reload onto the new deploy once; a second failure soon after means it didn't help. */
function reloadForNewVersion() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (Date.now() - last < 60_000) return false
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    return false
  }
  window.location.reload()
  return true
}

/**
 * Lazy chunks are renamed on every deploy, so a tab opened before a deploy
 * can't fetch them any more. Loading them early (see preloadLazyModules)
 * keeps an open tab working; if one is gone anyway, the page reloads onto
 * the new version (the timetable itself is saved server-side).
 */
export function loadModule(name) {
  cache[name] ??= loaders[name]().catch((error) => {
    delete cache[name]
    // Offline looks just like a stale chunk, but reloading would only lose the page
    if (!navigator.onLine) throw new Error("you're offline. Reconnect and try again")
    if (!isStaleChunk(error)) throw error
    if (reloadForNewVersion()) return new Promise(() => {})
    throw new Error('the app was updated since this page opened. Reload the page and try again')
  })
  return cache[name]
}

export function preloadLazyModules() {
  const run = () => Object.keys(loaders).forEach((name) => loadModule(name).catch(() => {}))
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 })
  else setTimeout(run, 1500)
}
