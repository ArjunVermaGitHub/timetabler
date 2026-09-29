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

/**
 * Lazy chunks are renamed on every deploy, so a tab opened before a deploy
 * can't fetch them any more. Loading them early (see preloadLazyModules)
 * keeps an open tab working; otherwise the error explains what to do.
 */
export function loadModule(name) {
  cache[name] ??= loaders[name]().catch((error) => {
    delete cache[name]
    throw isStaleChunk(error)
      ? new Error('the app was updated since this page opened. Reload the page and try again')
      : error
  })
  return cache[name]
}

export function preloadLazyModules() {
  const run = () => Object.keys(loaders).forEach((name) => loadModule(name).catch(() => {}))
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 })
  else setTimeout(run, 1500)
}
