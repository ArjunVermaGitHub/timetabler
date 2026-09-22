import {
  DAYS,
  WEEKEND_DAYS,
  baseSlotsForDay,
  isBlockedKind,
  nextPeriodId,
  slotsForClassroom,
} from './schedule'

const ALL_DAYS = [...DAYS, ...WEEKEND_DAYS]

/** Clock columns that are lunch for one track. */
const JR_LUNCH_IDS = new Set(['wd_1230', 'sa_1230'])
const SR_LUNCH_IDS = new Set(['wd_1310', 'sa_1310'])

/**
 * Build a fast mutable scheduling board.
 * Avoids rebuilding occupancy maps on every candidate check.
 */
function createBoard(lessons, seedPlacements = {}) {
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const placements = { ...seedPlacements }

  /** classroom|day|slotId -> lessonId */
  const classOcc = new Map()
  /** teacher|day|slotId -> lessonId */
  const teacherOcc = new Map()
  /** classroom|day|subject -> lessonId */
  const subjectDay = new Map()
  /** teacher|day -> occupied slot ids */
  const teacherDaySlots = new Map()
  /** classroom|day -> occupied slot ids */
  const classDaySlots = new Map()

  function slotIndex(day) {
    return baseSlotsForDay(day).map((slot) => slot.id)
  }

  function isUniversalBreak(day, slotId) {
    const raw = baseSlotsForDay(day).find((slot) => slot.id === slotId)
    if (!raw) return false
    return (
      isBlockedKind(raw.junior.kind) && isBlockedKind(raw.senior.kind)
    )
  }

  function occupiedFor(lesson, day, slotId) {
    const ids = [slotId]
    if (lesson.span === 2) {
      const next = nextPeriodId(slotId, lesson.classroom, day)
      if (!next) return null
      ids.push(next)
    }
    return ids
  }

  function teacherKey(teacher, day) {
    return `${teacher}|${day}`
  }

  function classKey(classroom, day) {
    return `${classroom}|${day}`
  }

  function addToDayList(map, key, slotId) {
    let list = map.get(key)
    if (!list) {
      list = []
      map.set(key, list)
    }
    if (!list.includes(slotId)) list.push(slotId)
  }

  function removeFromDayList(map, key, slotId) {
    const list = map.get(key)
    if (!list) return
    const next = list.filter((id) => id !== slotId)
    if (next.length === 0) map.delete(key)
    else map.set(key, next)
  }

  function addTeacherSlot(teacher, day, slotId) {
    addToDayList(teacherDaySlots, teacherKey(teacher, day), slotId)
  }

  function removeTeacherSlot(teacher, day, slotId) {
    removeFromDayList(teacherDaySlots, teacherKey(teacher, day), slotId)
  }

  function addClassSlot(classroom, day, slotId) {
    addToDayList(classDaySlots, classKey(classroom, day), slotId)
  }

  function removeClassSlot(classroom, day, slotId) {
    removeFromDayList(classDaySlots, classKey(classroom, day), slotId)
  }

  function maxConsecutiveRun(teacher, day, extraSlotIds = []) {
    const order = slotIndex(day)
    const occupied = new Set(teacherDaySlots.get(teacherKey(teacher, day)) ?? [])
    for (const id of extraSlotIds) occupied.add(id)

    let run = 0
    let max = 0
    for (const id of order) {
      if (isUniversalBreak(day, id)) {
        run = 0
        continue
      }
      if (occupied.has(id)) {
        run += 1
        if (run > max) max = run
      } else {
        run = 0
      }
    }
    return max
  }

  function lunchOk(teacher, day, extraSlotIds = []) {
    const occupied = new Set(teacherDaySlots.get(teacherKey(teacher, day)) ?? [])
    for (const id of extraSlotIds) occupied.add(id)
    if (occupied.size === 0) return true

    const order = slotIndex(day)
    const jrLunch = order.find((id) => JR_LUNCH_IDS.has(id))
    const srLunch = order.find((id) => SR_LUNCH_IDS.has(id))
    // Day with no lunch columns (shouldn't happen) → ok
    if (!jrLunch && !srLunch) return true

    const freeJr = !jrLunch || !occupied.has(jrLunch)
    const freeSr = !srLunch || !occupied.has(srLunch)
    return freeJr || freeSr
  }

  /**
   * Soft score (lower is better).
   * Students: even day fills + light packing (not forced to period 1).
   * Teachers: compact mid-day block with preferably one free slot between
   * lessons — never start+end of day when a tighter cluster exists.
   */
  function softScore(lesson, day, extraSlotIds, packTight = false) {
    const order = slotIndex(day)
    const indexOf = new Map(order.map((id, i) => [id, i]))
    const midIndex = (order.length - 1) / 2
    const periodIds = slotsForClassroom(lesson.classroom, day)
      .filter((slot) => slot.kind === 'period')
      .map((slot) => slot.id)

    const classOccSet = new Set(
      classDaySlots.get(classKey(lesson.classroom, day)) ?? [],
    )
    for (const id of extraSlotIds) classOccSet.add(id)

    const filledPeriodIndexes = periodIds
      .filter((id) => classOccSet.has(id))
      .map((id) => indexOf.get(id))

    // Balance period-slots across days for this class
    const classWeekLoads = ALL_DAYS.map((d) => {
      if (d === day) return classOccSet.size
      return (classDaySlots.get(classKey(lesson.classroom, d)) ?? []).length
    })
    const classDayLoad = classOccSet.size
    const classMean =
      classWeekLoads.reduce((a, b) => a + b, 0) / classWeekLoads.length
    const classBalance = (classDayLoad - classMean) * 8 + classDayLoad * 0.3

    // Prefer contiguous student days, but don't yank everything to slot 0
    let holePenalty = 0
    let adjacencyBonus = 0
    if (filledPeriodIndexes.length > 0) {
      const minI = Math.min(...filledPeriodIndexes)
      const maxI = Math.max(...filledPeriodIndexes)
      let filledInSpan = 0
      let periodSpan = 0
      for (const id of periodIds) {
        const i = indexOf.get(id)
        if (i < minI || i > maxI) continue
        periodSpan += 1
        if (classOccSet.has(id)) filledInSpan += 1
      }
      holePenalty = (periodSpan - filledInSpan) * 5

      const classCentroid =
        filledPeriodIndexes.reduce((a, b) => a + b, 0) /
        filledPeriodIndexes.length
      for (const id of extraSlotIds) {
        const pIdx = periodIds.indexOf(id)
        if (pIdx < 0) continue
        const left = pIdx > 0 ? periodIds[pIdx - 1] : null
        const right =
          pIdx < periodIds.length - 1 ? periodIds[pIdx + 1] : null
        if (left && classOccSet.has(left) && !extraSlotIds.includes(left)) {
          adjacencyBonus -= 4
        }
        if (right && classOccSet.has(right) && !extraSlotIds.includes(right)) {
          adjacencyBonus -= 4
        }
        // Pack toward the day's existing cluster centre (not the earliest slot)
        adjacencyBonus += Math.abs(indexOf.get(id) - classCentroid) * 0.35
      }
    }

    // Teacher compactness — this is the strong soft preference
    const teacherOccSet = new Set(
      teacherDaySlots.get(teacherKey(lesson.teacher, day)) ?? [],
    )
    for (const id of extraSlotIds) teacherOccSet.add(id)
    const teacherIndexes = []
    for (const id of order) {
      if (isUniversalBreak(day, id)) continue
      if (teacherOccSet.has(id)) teacherIndexes.push(indexOf.get(id))
    }

    let teacherCompact = 0
    if (teacherIndexes.length === 1) {
      // First lesson of their day → prefer mid-day, not period 1
      teacherCompact = Math.abs(teacherIndexes[0] - midIndex) * 1.4
    } else if (teacherIndexes.length >= 2) {
      const minI = Math.min(...teacherIndexes)
      const maxI = Math.max(...teacherIndexes)
      // Span dominates: start+end of day is expensive vs a mid cluster
      teacherCompact += (maxI - minI) * (packTight ? 3.5 : 5.5)

      for (let i = 1; i < teacherIndexes.length; i += 1) {
        const gap = teacherIndexes[i] - teacherIndexes[i - 1]
        if (gap === 2) {
          // Ideal: one free slot (break / other class) between their lessons
          teacherCompact -= packTight ? 2 : 4
        } else if (gap === 1) {
          // Back-to-back is allowed (hard cap still ≤2) but less preferred
          teacherCompact -= packTight ? 3 : 1
        } else if (gap === 3) {
          teacherCompact += 1.5
        } else {
          teacherCompact += (gap - 2) * (packTight ? 2 : 3.5)
        }
      }

      const centroid =
        teacherIndexes.reduce((a, b) => a + b, 0) / teacherIndexes.length
      teacherCompact += Math.abs(centroid - midIndex) * 1.2
    }

    let teacherWeek = 0
    for (const d of ALL_DAYS) {
      teacherWeek += (teacherDaySlots.get(teacherKey(lesson.teacher, d)) ?? [])
        .length
    }
    // Prefer spreading a teacher's load across days (not stacking one day)
    const teacherBias = teacherOccSet.size * 1.1 + teacherWeek * 0.03

    return (
      classBalance + holePenalty + adjacencyBonus + teacherCompact + teacherBias
    )
  }

  function canPlace(lesson, day, slotId, packTight = false) {
    if (placements[lesson.id]) return { ok: false, reason: 'placed' }

    const periods = slotsForClassroom(lesson.classroom, day).filter(
      (slot) => slot.kind === 'period',
    )
    if (!periods.some((slot) => slot.id === slotId)) {
      return { ok: false, reason: 'break' }
    }

    const needed = occupiedFor(lesson, day, slotId)
    if (!needed || needed.length !== lesson.span) {
      return { ok: false, reason: 'span' }
    }

    for (const id of needed) {
      if (classOcc.has(`${lesson.classroom}|${day}|${id}`)) {
        return { ok: false, reason: 'occupied' }
      }
      if (teacherOcc.has(`${lesson.teacher}|${day}|${id}`)) {
        return { ok: false, reason: 'teacher' }
      }
    }

    const subjectKey = `${lesson.classroom}|${day}|${lesson.subject}`
    const existingSubject = subjectDay.get(subjectKey)
    if (existingSubject && existingSubject !== lesson.id) {
      return { ok: false, reason: 'subject' }
    }

    if (maxConsecutiveRun(lesson.teacher, day, needed) > 2) {
      return { ok: false, reason: 'consecutive' }
    }

    if (!lunchOk(lesson.teacher, day, needed)) {
      return { ok: false, reason: 'lunch' }
    }

    return {
      ok: true,
      needed,
      score: softScore(lesson, day, needed, packTight),
    }
  }

  function place(lesson, day, slotId, packTight = false) {
    const check = canPlace(lesson, day, slotId, packTight)
    if (!check.ok) return false
    const { needed } = check
    placements[lesson.id] = { day, slotId }
    for (const id of needed) {
      classOcc.set(`${lesson.classroom}|${day}|${id}`, lesson.id)
      teacherOcc.set(`${lesson.teacher}|${day}|${id}`, lesson.id)
      addTeacherSlot(lesson.teacher, day, id)
      addClassSlot(lesson.classroom, day, id)
    }
    subjectDay.set(
      `${lesson.classroom}|${day}|${lesson.subject}`,
      lesson.id,
    )
    return true
  }

  function unplace(lessonId) {
    const placement = placements[lessonId]
    const lesson = byId.get(lessonId)
    if (!placement || !lesson) return
    const needed = occupiedFor(lesson, placement.day, placement.slotId)
    if (!needed) return
    for (const id of needed) {
      classOcc.delete(`${lesson.classroom}|${placement.day}|${id}`)
      teacherOcc.delete(`${lesson.teacher}|${placement.day}|${id}`)
      removeTeacherSlot(lesson.teacher, placement.day, id)
      removeClassSlot(lesson.classroom, placement.day, id)
    }
    const subjectKey = `${lesson.classroom}|${placement.day}|${lesson.subject}`
    if (subjectDay.get(subjectKey) === lessonId) subjectDay.delete(subjectKey)
    delete placements[lessonId]
  }

  // Seed existing placements into maps
  for (const lesson of lessons) {
    const placement = placements[lesson.id]
    if (!placement) continue
    const needed = occupiedFor(lesson, placement.day, placement.slotId)
    if (!needed) {
      delete placements[lesson.id]
      continue
    }
    for (const id of needed) {
      classOcc.set(`${lesson.classroom}|${placement.day}|${id}`, lesson.id)
      teacherOcc.set(`${lesson.teacher}|${placement.day}|${id}`, lesson.id)
      addTeacherSlot(lesson.teacher, placement.day, id)
      addClassSlot(lesson.classroom, placement.day, id)
    }
    subjectDay.set(
      `${lesson.classroom}|${placement.day}|${lesson.subject}`,
      lesson.id,
    )
  }

  function periodCandidates(classroom, day) {
    return slotsForClassroom(classroom, day)
      .filter((slot) => slot.kind === 'period')
      .map((slot) => slot.id)
  }

  function countOptions(lesson) {
    let count = 0
    for (const day of ALL_DAYS) {
      for (const slotId of periodCandidates(lesson.classroom, day)) {
        if (canPlace(lesson, day, slotId).ok) count += 1
      }
    }
    return count
  }

  return {
    placements,
    byId,
    canPlace,
    place,
    unplace,
    periodCandidates,
    countOptions,
    maxConsecutiveRun,
    lunchOk,
  }
}

function teacherLoadMap(lessons) {
  const loads = new Map()
  for (const lesson of lessons) {
    loads.set(
      lesson.teacher,
      (loads.get(lesson.teacher) ?? 0) + lesson.span,
    )
  }
  return loads
}

/**
 * Deterministic auto-scheduler.
 * Hard: class/teacher clash, subject-once/day, doubles, ≤2 consecutive,
 *        at least one of Jr/Sr lunch free each day the teacher teaches.
 * Soft: teacher lessons clustered mid-day (prefer one free slot between);
 *        student days balanced + lightly packed; load spread across days.
 * Busy teachers pack a bit tighter so everything still fits.
 */
export function autoSchedule(lessons, options = {}) {
  const { clearExisting = true } = options
  const started = performance.now()

  const seed = clearExisting
    ? {}
    : Object.fromEntries(
        Object.entries(options.existingPlacements ?? {}).filter(([id]) =>
          lessons.some((lesson) => lesson.id === id),
        ),
      )

  const board = createBoard(lessons, seed)
  const loads = teacherLoadMap(lessons)
  const PACK_LOAD = 28

  const open = lessons.filter((lesson) => !board.placements[lesson.id])

  function packTightFor(lesson) {
    return (loads.get(lesson.teacher) ?? 0) >= PACK_LOAD
  }

  /** Prefer mid-day over earliest slot when soft scores tie. */
  function slotPreference(classroom, day, slotId) {
    const periods = board.periodCandidates(classroom, day)
    const idx = periods.indexOf(slotId)
    if (idx < 0) return 0
    const mid = (periods.length - 1) / 2
    return Math.abs(idx - mid)
  }

  function betterCandidate(a, b, lesson) {
    if (a.score < b.score) return true
    if (a.score > b.score) return false
    const prefA = slotPreference(lesson.classroom, a.day, a.slotId)
    const prefB = slotPreference(lesson.classroom, b.day, b.slotId)
    if (prefA !== prefB) return prefA < prefB
    return `${a.day}|${a.slotId}` < `${b.day}|${b.slotId}`
  }

  function bestPlacement(lesson) {
    const packTight = packTightFor(lesson)
    let best = null
    for (const day of ALL_DAYS) {
      for (const slotId of board.periodCandidates(lesson.classroom, day)) {
        const check = board.canPlace(lesson, day, slotId, packTight)
        if (!check.ok) continue
        const candidate = { day, slotId, score: check.score }
        if (!best || betterCandidate(candidate, best, lesson)) {
          best = candidate
        }
      }
    }
    return best
  }

  function optionCount(lesson) {
    const packTight = packTightFor(lesson)
    let count = 0
    for (const day of ALL_DAYS) {
      for (const slotId of board.periodCandidates(lesson.classroom, day)) {
        if (board.canPlace(lesson, day, slotId, packTight).ok) count += 1
      }
    }
    return count
  }

  // MRV loop: always place the currently most-constrained unplaced lesson
  const queue = [...open]
  const failed = []
  while (queue.length > 0) {
    queue.sort((a, b) => {
      if (b.span !== a.span) return b.span - a.span
      const loadDiff = (loads.get(b.teacher) ?? 0) - (loads.get(a.teacher) ?? 0)
      if (loadDiff !== 0) return loadDiff
      return a.id.localeCompare(b.id)
    })

    // Among the first batch, pick fewest options (sample top 12 by span/load)
    const batch = queue.slice(0, Math.min(12, queue.length))
    let pickIndex = 0
    let pickOptions = Infinity
    for (let i = 0; i < batch.length; i += 1) {
      const n = optionCount(batch[i])
      if (
        n < pickOptions ||
        (n === pickOptions && batch[i].id < batch[pickIndex].id)
      ) {
        pickOptions = n
        pickIndex = i
      }
    }

    const lesson = batch[pickIndex]
    const qi = queue.findIndex((item) => item.id === lesson.id)
    queue.splice(qi, 1)

    const best = bestPlacement(lesson)
    if (!best || !board.place(lesson, best.day, best.slotId, packTightFor(lesson))) {
      failed.push(lesson)
    }
  }

  // Repair failures by bumping a related placed lesson
  if (failed.length > 0) {
    const stillFailed = []
    for (const lesson of failed) {
      if (tryRepairPlace(board, lesson, lessons, loads, packTightFor)) continue
      const best = bestPlacement(lesson)
      if (
        best &&
        board.place(lesson, best.day, best.slotId, packTightFor(lesson))
      ) {
        continue
      }
      stillFailed.push(lesson)
    }
    failed.length = 0
    failed.push(...stillFailed)
  }

  improveSpreads(board, lessons, loads, packTightFor)

  const reopen = lessons.filter((lesson) => !board.placements[lesson.id])
  for (const lesson of reopen) {
    const best = bestPlacement(lesson)
    if (best) board.place(lesson, best.day, best.slotId, packTightFor(lesson))
  }

  const remaining = lessons.filter((lesson) => !board.placements[lesson.id])
  const scheduled = lessons.length - remaining.length

  return {
    placements: board.placements,
    scheduled,
    remaining: remaining.length,
    remainingLessons: remaining,
    ms: Math.round(performance.now() - started),
  }
}

/**
 * If a lesson won't fit, temporarily unplace a same-teacher or same-class
 * lesson that is blocking a viable slot, place the hard one, then re-place
 * the bumped lesson elsewhere.
 */
function tryRepairPlace(board, lesson, lessons, loads, packTightFor) {
  for (const day of ALL_DAYS) {
    for (const slotId of board.periodCandidates(lesson.classroom, day)) {
      const check = board.canPlace(lesson, day, slotId, packTightFor(lesson))
      if (check.ok) {
        return board.place(lesson, day, slotId, packTightFor(lesson))
      }
    }
  }

  const blockers = []
  for (const other of lessons) {
    if (other.id === lesson.id) continue
    if (!board.placements[other.id]) continue
    if (
      other.teacher !== lesson.teacher &&
      other.classroom !== lesson.classroom
    ) {
      continue
    }
    blockers.push(other)
  }

  blockers.sort((a, b) => {
    if (a.span !== b.span) return a.span - b.span
    return (loads.get(a.teacher) ?? 0) - (loads.get(b.teacher) ?? 0)
  })

  for (const blocker of blockers.slice(0, 40)) {
    const saved = board.placements[blocker.id]
    board.unplace(blocker.id)
    const best = findBest(board, lesson, packTightFor)
    if (best && board.place(lesson, best.day, best.slotId, packTightFor(lesson))) {
      const blockerBest = findBest(board, blocker, packTightFor)
      if (
        blockerBest &&
        board.place(
          blocker,
          blockerBest.day,
          blockerBest.slotId,
          packTightFor(blocker),
        )
      ) {
        return true
      }
      board.unplace(lesson.id)
      board.place(blocker, saved.day, saved.slotId, packTightFor(blocker))
      continue
    }
    board.place(blocker, saved.day, saved.slotId, packTightFor(blocker))
  }

  return false
}

function findBest(board, lesson, packTightFor) {
  const packTight = packTightFor(lesson)
  let best = null
  for (const day of ALL_DAYS) {
    for (const slotId of board.periodCandidates(lesson.classroom, day)) {
      const check = board.canPlace(lesson, day, slotId, packTight)
      if (!check.ok) continue
      const candidate = { day, slotId, score: check.score }
      if (!best || candidate.score < best.score) {
        best = candidate
      } else if (candidate.score === best.score) {
        const periods = board.periodCandidates(lesson.classroom, day)
        const bestPeriods = board.periodCandidates(lesson.classroom, best.day)
        const mid = (periods.length - 1) / 2
        const bestMid = (bestPeriods.length - 1) / 2
        const pref =
          Math.abs(periods.indexOf(slotId) - mid) -
          Math.abs(bestPeriods.indexOf(best.slotId) - bestMid)
        if (pref < 0) best = candidate
      }
    }
  }
  return best
}

/**
 * Re-seat each placed lesson once if a better soft score exists.
 * Pulls teacher days into mid-day clusters after the greedy MRV pass.
 */
function improveSpreads(board, lessons, _loads, packTightFor) {
  const placed = lessons.filter((lesson) => board.placements[lesson.id])
  placed.sort(
    (a, b) => a.teacher.localeCompare(b.teacher) || a.id.localeCompare(b.id),
  )

  for (const lesson of placed) {
    const current = board.placements[lesson.id]
    if (!current) continue
    board.unplace(lesson.id)
    const best = findBest(board, lesson, packTightFor)
    if (best) {
      board.place(lesson, best.day, best.slotId, packTightFor(lesson))
    } else {
      board.place(lesson, current.day, current.slotId, packTightFor(lesson))
    }
  }
}
