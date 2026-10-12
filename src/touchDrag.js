/**
 * Android's WebView (and mobile browsers) can't drag lessons by touch. On touch
 * screens, press and hold a lesson to drag it; a quick swipe still scrolls.
 * The polyfill emits the same drag events the desktop grid already handles.
 */
export async function setupTouchDrag() {
  if (!navigator.maxTouchPoints) return
  const [{ polyfill }, { scrollBehaviourDragImageTranslateOverride }] = await Promise.all([
    import('mobile-drag-drop'),
    import('mobile-drag-drop/scroll-behaviour'),
    import('mobile-drag-drop/default.css'),
  ])
  const applied = polyfill({
    holdToDrag: 300,
    dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
  })
  // A non-passive listener lets the polyfill stop the page scrolling mid-drag
  if (applied) window.addEventListener('touchmove', () => {}, { passive: false })
}
