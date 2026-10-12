/** Bridge to the Android app shell, which loads this site in a WebView. */

const shell = () => (typeof window === 'undefined' ? undefined : window.TimetablerApp)

export function inNativeApp() {
  return Boolean(shell() && window.ReactNativeWebView)
}

export function postToApp(message) {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message))
}

/** The chat user the app already polls mentions for, if any. */
export function appChatUser() {
  return shell()?.chatUser ?? null
}
