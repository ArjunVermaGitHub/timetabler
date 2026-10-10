/**
 * Inside the Capacitor Android app, the system back button walks the in-app
 * history and only leaves the app from the first screen.
 */
export async function setupAndroidShell() {
  if (!window.Capacitor?.isNativePlatform?.()) return
  const { App } = await import('@capacitor/app')
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
    else App.exitApp()
  })
}
