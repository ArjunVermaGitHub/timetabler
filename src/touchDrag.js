/**
 * Android's WebView (and mobile browsers) can't drag lessons by touch. On touch
 * screens, pulling a lesson drags it straight away; swiping anywhere else
 * scrolls. This emits the same drag events the desktop grid handles, under the
 * finger, and always ends with a dragend: a second finger, a fresh touch, the
 * app going to the background or the page changing all cancel the drag.
 */
export function setupTouchDrag() {
  if (!navigator.maxTouchPoints) return

  let pending = null
  let drag = null

  const touchById = (list, id) => [...list].find((touch) => touch.identifier === id)

  function fire(type, target, extra = {}) {
    if (!target) return false
    const event = new DragEvent(type, {
      bubbles: true,
      cancelable: type !== 'dragleave' && type !== 'dragend',
      composed: true,
      clientX: drag?.x ?? 0,
      clientY: drag?.y ?? 0,
      ...extra,
    })
    // A constructed DataTransfer ignores dropEffect, which decides whether a drop is allowed
    Object.defineProperty(event, 'dataTransfer', { value: drag?.data ?? pending?.data })
    target.dispatchEvent(event)
    return event.defaultPrevented
  }

  function dataTransfer() {
    const store = new Map()
    return {
      dropEffect: 'none',
      effectAllowed: 'uninitialized',
      files: [],
      items: [],
      get types() {
        return [...store.keys()]
      },
      setData: (type, value) => store.set(type.toLowerCase(), String(value)),
      getData: (type) => store.get(type.toLowerCase()) ?? '',
      clearData: (type) => (type ? store.delete(type.toLowerCase()) : store.clear()),
      setDragImage: () => {},
    }
  }

  function ghostOf(source, x, y) {
    const rect = source.getBoundingClientRect()
    const ghost = source.cloneNode(true)
    ghost.removeAttribute('id')
    ghost.classList.add('touch-drag-ghost')
    Object.assign(ghost.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: '0',
    })
    document.body.appendChild(ghost)
    return { ghost, dx: x - rect.left, dy: y - rect.top }
  }

  function start(touch) {
    const { source } = pending
    pending.data = dataTransfer()
    drag = { ...pending, x: touch.clientX, y: touch.clientY, target: null, accepted: false }
    pending = null
    if (fire('dragstart', source)) {
      drag = null
      return
    }
    Object.assign(drag, ghostOf(source, drag.x, drag.y))
    drag.frame = requestAnimationFrame(tick)
  }

  /** Re-checks what's under the finger every frame, since the page can scroll beneath it. */
  function tick() {
    if (!drag) return
    const { ghost, dx, dy, x, y } = drag
    ghost.style.transform = `translate(${x - dx - parseFloat(ghost.style.left)}px, ${
      y - dy - parseFloat(ghost.style.top)
    }px)`
    const under = document.elementFromPoint(x, y)
    if (under !== drag.target) {
      fire('dragleave', drag.target, { relatedTarget: under })
      fire('dragenter', under, { relatedTarget: drag.target })
      drag.target = under
    }
    drag.data.dropEffect = 'move'
    drag.accepted = fire('dragover', under) && drag.data.dropEffect !== 'none'
    ghost.classList.toggle('is-refused', !drag.accepted)
    fire('drag', drag.source)
    drag.frame = requestAnimationFrame(tick)
  }

  function end(drop) {
    if (!drag) return
    const current = drag
    cancelAnimationFrame(current.frame)
    if (drop) {
      tick()
      cancelAnimationFrame(drag.frame)
    }
    const dropped = drop && current.accepted && fire('drop', current.target)
    if (!dropped) fire('dragleave', current.target)
    current.data.dropEffect = dropped ? current.data.dropEffect : 'none'
    current.ghost.remove()
    // A drop into the grid can unmount the card that was dragged
    fire('dragend', current.source.isConnected ? current.source : document)
    drag = null
  }

  const cancel = () => end(false)

  window.addEventListener(
    'touchstart',
    (event) => {
      if (drag) {
        cancel()
        return
      }
      const touch = event.changedTouches[0]
      const source =
        event.touches.length === 1 && event.target.closest?.('[draggable="true"]')
      pending = source ? { id: touch.identifier, source } : null
    },
    { capture: true, passive: true },
  )
  window.addEventListener(
    'touchmove',
    (event) => {
      if (pending) {
        const touch = touchById(event.changedTouches, pending.id)
        if (!touch) return
        if (event.touches.length > 1) {
          pending = null
          return
        }
        start(touch)
      }
      if (!drag) return
      // Stops the page scrolling under the drag
      event.preventDefault()
      const touch = touchById(event.changedTouches, drag.id)
      if (touch) Object.assign(drag, { x: touch.clientX, y: touch.clientY })
    },
    { capture: true, passive: false },
  )
  const release = (event) => {
    if (pending && touchById(event.changedTouches, pending.id)) pending = null
    if (drag && touchById(event.changedTouches, drag.id)) end(event.type === 'touchend')
  }
  window.addEventListener('touchend', release, true)
  window.addEventListener('touchcancel', release, true)
  window.addEventListener('blur', cancel)
  window.addEventListener('pagehide', cancel)
  window.addEventListener('popstate', cancel)
  document.addEventListener('visibilitychange', () => document.hidden && cancel())

  // Android starts its own drag on a long press, which steals the touch and never
  // drops; ours are the untrusted ones
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
}
