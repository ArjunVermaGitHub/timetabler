// Stand-in for charismap's useActivityLog: same API, but no analytics calls
// (charismap posts these to its own backend, which timetabler doesn't have).
const noop = () => {}

export function useActivityLog() {
  return { logNav: noop, logTab: noop, logAction: noop, logPage: noop, logClick: noop }
}

export default useActivityLog
