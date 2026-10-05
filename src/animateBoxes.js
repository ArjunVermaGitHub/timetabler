const BOXES = '.timetable .lesson-card, .timetable .lesson-stack'
const DURATION = 1000
const RESET = ['width', 'height', 'overflow', 'transition']

let running = []
let timer = null

function settle() {
  window.clearTimeout(timer)
  for (const el of running) for (const prop of RESET) el.style[prop] = ''
  running = []
}

/** Sizes of the lesson boxes currently on screen, taken before a re-render. */
export function measureBoxes() {
  const snapshot = new Map()
  for (const el of document.querySelectorAll(BOXES)) {
    const rect = el.getBoundingClientRect()
    const onScreen =
      rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth
    if (onScreen) snapshot.set(el, rect)
  }
  return snapshot
}

/** Eases each measured box from its old size to the size it has after the re-render. */
export function playBoxes(snapshot) {
  settle()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const moving = []
  for (const [el, from] of snapshot) {
    if (!el.isConnected) continue
    const to = el.getBoundingClientRect()
    if (Math.abs(to.width - from.width) < 0.5 && Math.abs(to.height - from.height) < 0.5) continue
    moving.push([el, from, to])
  }
  if (!moving.length) return

  for (const [el, from] of moving) {
    Object.assign(el.style, {
      transition: 'none',
      overflow: 'hidden',
      width: `${from.width}px`,
      height: `${from.height}px`,
    })
  }
  void document.body.offsetHeight
  for (const [el, , to] of moving) {
    Object.assign(el.style, {
      transition: `width ${DURATION}ms ease, height ${DURATION}ms ease`,
      width: `${to.width}px`,
      height: `${to.height}px`,
    })
  }
  running = moving.map(([el]) => el)
  timer = window.setTimeout(settle, DURATION + 50)
}
