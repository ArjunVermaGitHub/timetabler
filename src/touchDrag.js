/**
 * Android's WebView (and mobile browsers) can't drag lessons by touch. On touch
 * screens, pulling a lesson drags it straight away; swiping anywhere else
 * scrolls. The polyfill emits the same drag events the desktop grid handles.
 */
export async function setupTouchDrag() {
  if (!navigator.maxTouchPoints) return
  const [{ polyfill }, { scrollBehaviourDragImageTranslateOverride }] = await Promise.all([
    import('mobile-drag-drop'),
    import('mobile-drag-drop/scroll-behaviour'),
    import('mobile-drag-drop/default.css'),
  ])
  const applied = polyfill({
    dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
    // The drop target is only re-checked on this tick; at the default 150ms a
    // quick pull released over the tray misses it
    iterationInterval: 16,
  })
  if (!applied) return
  // A non-passive listener lets the polyfill stop the page scrolling mid-drag
  window.addEventListener('touchmove', () => {}, { passive: false })
  // Unlike browsers, the polyfill only treats an element as a drop zone when
  // dragenter is cancelled; dragover handlers still decide what accepts a drop
  document.addEventListener('dragenter', (event) => event.preventDefault())
  // Android starts its own drag on a long press, which steals the touch from the
  // polyfill and never drops; polyfill events are the untrusted ones
  let pointerType = 'mouse'
  window.addEventListener('pointerdown', (event) => (pointerType = event.pointerType), true)
  window.addEventListener(
    'dragstart',
    (event) => {
      if (!event.isTrusted || pointerType !== 'touch') return
      event.preventDefault()
      event.stopImmediatePropagation()
    },
    true,
  )
  window.addEventListener(
    'contextmenu',
    (event) => {
      if (pointerType === 'touch' && event.target.closest?.('[draggable="true"]')) {
        event.preventDefault()
      }
    },
    true,
  )
  // A refused drop re-fires dragend on every tick of the snap-back animation
  let dragging = false
  window.addEventListener('dragstart', () => (dragging = true), true)
  window.addEventListener(
    'dragend',
    (event) => {
      if (!dragging) event.stopImmediatePropagation()
      dragging = false
    },
    true,
  )
}
