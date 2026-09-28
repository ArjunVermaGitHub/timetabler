import {
  DAYS,
  WEEKEND_DAYS,
  allowsConcurrentLessons,
  baseSlotsForDay,
  isBeforeLunch,
  isBlockedKind,
  LATE_SLOT_ID,
  isLateSlot,
  isWithinClassroomHours,
  lateOverflowClassrooms,
  nextPeriodId,
  slotsForClassroom,
  violatesLateSlot,
} from './schedule'

const ALL_DAYS = [...DAYS, ...WEEKEND_DAYS]

/** Clock columns that are lunch for one track. */
const JR_LUNCH_IDS = new Set(['wd_1230', 'sa_1230'])
const SR_LUNCH_IDS = new Set(['wd_1310', 'sa_1310'])

/**
 * Build a fast mutable scheduling board.
 * Avoids rebuilding occupancy maps on every candidate check.
 */
function createBoard(lessons, seedPlacements = {}, reservedFree = new Set()) {
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const placements = { ...seedPlacements }

  /** classroom|day|slotId -> Set(lessonId) */
  const classOcc = new Map()
  /** teacher|day|slotId -> lessonId */
  const teacherOcc = new Map()
  /** classroom|day|subject -> Set(lessonId) (co-teachers share a day) */
  const subjectDay = new Map()
  /** teacher|day -> occupied slot ids */
  const teacherDaySlots = new Map()
  /** classroom|day -> occupied slot ids (unique clocks; concurrent still 1) */
  const classDaySlots = new Map()

  /** Joint sessions (one sync group across classes) may share a teacher at the same clock. */
  function sameSession(lessonId, lesson) {
    const other = byId.get(lessonId)
    return Boolean(
      other && lesson.syncGroupId && other.syncGroupId === lesson.syncGroupId,
    )
  }

  function slotIndex(day) {
    return baseSlotsForDay(day).map((slot) => slot.id)
  }

  /** Last period the class actually teaches that day (before any reserved free tail). */
  function lastTeachingPeriod(classroom, day) {
    const ids = slotsForClassroom(classroom, day)
      .filter(
        (slot) =>
          slot.kind === 'period' &&
          isWithinClassroomHours(classroom, day, slot.id) &&
          !reservedFree.has(`${classroom}|${day}|${slot.id}`),
      )
      .map((slot) => slot.id)
    return ids[ids.length - 1] ?? null
  }

  /** 'pre-lunch' lessons stay before lunch; 'end-of-day' extras end the class's day. */
  function timingViolation(lesson, day, needed) {
    if (violatesLateSlot(lesson, needed, lessons)) return 'late'
    if (lesson.timing === 'pre-lunch') {
      if (needed.some((id) => !isBeforeLunch(lesson.classroom, day, id))) {
        return 'pre-lunch'
      }
    } else if (lesson.timing === 'end-of-day') {
      if (
        needed[needed.length - 1] !== lastTeachingPeriod(lesson.classroom, day)
      ) {
        return 'end-of-day'
      }
    }
    return null
  }

  function isUniversalBreak(day, slotId) {
    const raw = baseSlotsForDay(day).find((slot) => slot.id === slotId)
    if (!raw) return false
    return isBlockedKind(raw.junior.kind) && isBlockedKind(raw.senior.kind)
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
    const occupied = new Set(
      teacherDaySlots.get(teacherKey(teacher, day)) ?? [],
    )
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
    const occupied = new Set(
      teacherDaySlots.get(teacherKey(teacher, day)) ?? [],
    )
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
   * Soft score (lower is better). Kept intentionally light for speed.
   */
  function softScore(lesson, day, extraSlotIds, packTight = false) {
    const order = slotIndex(day)
    const indexOf = new Map(order.map((id, i) => [id, i]))
    const midIndex = (order.length - 1) / 2

    const classOccSet = new Set(
      classDaySlots.get(classKey(lesson.classroom, day)) ?? [],
    )
    for (const id of extraSlotIds) classOccSet.add(id)

    // Prefer emptier days for this class
    let classBalance = classOccSet.size * 2
    for (const d of ALL_DAYS) {
      if (d === day) continue
      classBalance -=
        (classDaySlots.get(classKey(lesson.classroom, d)) ?? []).length * 0.15
    }

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
      teacherCompact = Math.abs(teacherIndexes[0] - midIndex) * 1.2
    } else if (teacherIndexes.length >= 2) {
      const minI = Math.min(...teacherIndexes)
      const maxI = Math.max(...teacherIndexes)
      teacherCompact += (maxI - minI) * (packTight ? 3 : 5)
      for (let i = 1; i < teacherIndexes.length; i += 1) {
        const gap = teacherIndexes[i] - teacherIndexes[i - 1]
        if (gap === 2) teacherCompact -= 3
        else if (gap === 1) teacherCompact -= 1
        else teacherCompact += (gap - 2) * 2.5
      }
      const centroid =
        teacherIndexes.reduce((a, b) => a + b, 0) / teacherIndexes.length
      teacherCompact += Math.abs(centroid - midIndex) * 0.8
    }

    return classBalance + teacherCompact + teacherOccSet.size * 0.5
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
      if (!isWithinClassroomHours(lesson.classroom, day, id)) {
        return { ok: false, reason: 'hours' }
      }
      if (reservedFree.has(`${lesson.classroom}|${day}|${id}`)) {
        return { ok: false, reason: 'free' }
      }
    }

    const timing = timingViolation(lesson, day, needed)
    if (timing) return { ok: false, reason: timing }

    for (const id of needed) {
      const classKeyOcc = `${lesson.classroom}|${day}|${id}`
      const holders = classOcc.get(classKeyOcc)
      if (holders && holders.size > 0) {
        const others = [...holders].filter((hid) => hid !== lesson.id)
        for (const hid of others) {
          const other = byId.get(hid)
          if (!other) continue
          if (
            !allowsConcurrentLessons(
              lesson.classroom,
              other.subject,
              lesson.subject,
              other,
              lesson,
            )
          ) {
            return { ok: false, reason: 'occupied' }
          }
          if (
            other.subject === lesson.subject &&
            other.teacher === lesson.teacher
          ) {
            return { ok: false, reason: 'occupied' }
          }
        }
      }
      const tid = teacherOcc.get(`${lesson.teacher}|${day}|${id}`)
      if (tid && !sameSession(tid, lesson)) {
        return { ok: false, reason: 'teacher' }
      }
    }

    // A teacher takes a subject with a class at most once a day
    const subjectKey = `${lesson.classroom}|${day}|${lesson.subject}`
    const subjectHolders = subjectDay.get(subjectKey)
    if (subjectHolders && subjectHolders.size > 0) {
      for (const hid of subjectHolders) {
        if (hid === lesson.id) continue
        const other = byId.get(hid)
        if (other && other.teacher === lesson.teacher) {
          return { ok: false, reason: 'subject' }
        }
      }
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
      const classKeyOcc = `${lesson.classroom}|${day}|${id}`
      let holders = classOcc.get(classKeyOcc)
      if (!holders) {
        holders = new Set()
        classOcc.set(classKeyOcc, holders)
      }
      holders.add(lesson.id)
      teacherOcc.set(`${lesson.teacher}|${day}|${id}`, lesson.id)
      addTeacherSlot(lesson.teacher, day, id)
      addClassSlot(lesson.classroom, day, id)
    }
    subjectDayAdd(lesson.classroom, day, lesson.subject, lesson.id)
    return true
  }

  function subjectDayAdd(classroom, day, subject, lessonId) {
    const key = `${classroom}|${day}|${subject}`
    let set = subjectDay.get(key)
    if (!set) {
      set = new Set()
      subjectDay.set(key, set)
    }
    set.add(lessonId)
  }

  function subjectDayRemove(classroom, day, subject, lessonId) {
    const key = `${classroom}|${day}|${subject}`
    const set = subjectDay.get(key)
    if (!set) return
    set.delete(lessonId)
    if (set.size === 0) subjectDay.delete(key)
  }

  function unplace(lessonId) {
    const placement = placements[lessonId]
    const lesson = byId.get(lessonId)
    if (!placement || !lesson) return
    const needed = occupiedFor(lesson, placement.day, placement.slotId)
    if (!needed) return
    for (const id of needed) {
      const classKeyOcc = `${lesson.classroom}|${placement.day}|${id}`
      const holders = classOcc.get(classKeyOcc)
      if (holders) {
        holders.delete(lessonId)
        if (holders.size === 0) classOcc.delete(classKeyOcc)
      }
      teacherOcc.delete(`${lesson.teacher}|${placement.day}|${id}`)
      removeTeacherSlot(lesson.teacher, placement.day, id)
      removeClassSlot(lesson.classroom, placement.day, id)
    }
    subjectDayRemove(lesson.classroom, placement.day, lesson.subject, lessonId)
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
      const classKeyOcc = `${lesson.classroom}|${placement.day}|${id}`
      let holders = classOcc.get(classKeyOcc)
      if (!holders) {
        holders = new Set()
        classOcc.set(classKeyOcc, holders)
      }
      holders.add(lesson.id)
      teacherOcc.set(`${lesson.teacher}|${placement.day}|${id}`, lesson.id)
      addTeacherSlot(lesson.teacher, placement.day, id)
      addClassSlot(lesson.classroom, placement.day, id)
    }
    subjectDayAdd(lesson.classroom, placement.day, lesson.subject, lesson.id)
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

  /** Placed lesson ids that directly block `lesson` at day/slot (class, teacher, subject-day). */
  function directBlockers(lesson, day, slotId) {
    const needed = occupiedFor(lesson, day, slotId)
    if (!needed || needed.length !== lesson.span) return null
    for (const id of needed) {
      if (
        !isWithinClassroomHours(lesson.classroom, day, id) ||
        reservedFree.has(`${lesson.classroom}|${day}|${id}`)
      ) {
        return null
      }
    }
    if (timingViolation(lesson, day, needed)) return null
    const out = new Set()
    for (const id of needed) {
      for (const hid of classOcc.get(`${lesson.classroom}|${day}|${id}`) ??
        []) {
        const other = byId.get(hid)
        if (
          !other ||
          !allowsConcurrentLessons(
            lesson.classroom,
            other.subject,
            lesson.subject,
            other,
            lesson,
          ) ||
          (other.subject === lesson.subject && other.teacher === lesson.teacher)
        ) {
          out.add(hid)
        }
      }
      const tid = teacherOcc.get(`${lesson.teacher}|${day}|${id}`)
      if (tid && !sameSession(tid, lesson)) out.add(tid)
    }
    for (const hid of subjectDay.get(
      `${lesson.classroom}|${day}|${lesson.subject}`,
    ) ?? []) {
      if (byId.get(hid)?.teacher === lesson.teacher) out.add(hid)
    }
    out.delete(lesson.id)
    return out
  }

  /** Direct blockers plus the teacher's same-day neighbours / lunch holders (consecutive & lunch rules). */
  function wideBlockers(lesson, day, slotId) {
    const out = directBlockers(lesson, day, slotId)
    if (!out) return null
    const needed = occupiedFor(lesson, day, slotId)
    const order = slotIndex(day)
    const near = new Set()
    for (const id of needed) {
      const i = order.indexOf(id)
      for (let d = -2; d <= 2; d += 1) {
        if (order[i + d]) near.add(order[i + d])
      }
    }
    for (const id of order) {
      if (JR_LUNCH_IDS.has(id) || SR_LUNCH_IDS.has(id)) near.add(id)
    }
    for (const id of near) {
      const tid = teacherOcc.get(`${lesson.teacher}|${day}|${id}`)
      if (tid && tid !== lesson.id && !sameSession(tid, lesson)) out.add(tid)
    }
    return out
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
    directBlockers,
    wideBlockers,
  }
}

function teacherLoadMap(lessons) {
  const loads = new Map()
  for (const lesson of lessons) {
    loads.set(lesson.teacher, (loads.get(lesson.teacher) ?? 0) + lesson.span)
  }
  return loads
}

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Ejection-chain local search for units the greedy pass couldn't fit.
 * Places a stuck unit at the slot with the cheapest set of direct blockers,
 * evicts those blockers back into the queue, and repeats. A short tabu
 * window stops a unit from immediately evicting whoever just evicted it.
 */
function repairWithEjections(board, units, listUnitSlots, placeUnit, options) {
  const { timeBudgetMs = 5000, seed = 7 } = options
  const rand = mulberry32(seed)
  const started = performance.now()
  const unitOf = new Map()
  for (const unit of units) {
    for (const m of unit.members) unitOf.set(m.id, unit)
  }
  const isPlaced = (unit) => unit.members.every((m) => board.placements[m.id])
  const clear = (unit) => {
    for (const m of unit.members) {
      if (board.placements[m.id]) board.unplace(m.id)
    }
  }

  const queue = units.filter((unit) => !isPlaced(unit))
  const lastPlacedAt = new Map()
  const TABU = 12
  let step = 0

  while (queue.length && performance.now() - started < timeBudgetMs) {
    step += 1
    const pick = Math.floor(rand() * Math.min(queue.length, 4))
    const unit = queue.splice(pick, 1)[0]
    if (isPlaced(unit)) continue
    clear(unit)

    const free = listUnitSlots(unit)
    if (free[0] && placeUnit(unit, free[0].day, free[0].slotId)) {
      lastPlacedAt.set(unit.id, step)
      continue
    }

    const blockerUnits = (finder, day, slotId) => {
      const blockers = new Set()
      for (const m of unit.members) {
        const hit = finder(m, day, slotId)
        if (!hit) return null
        for (const id of hit) {
          const owner = unitOf.get(id)
          if (owner && owner !== unit) blockers.add(owner)
        }
      }
      return blockers
    }
    const costOf = (blockers) => {
      let cost = 0
      for (const b of blockers) {
        cost += b.members.length * b.span
        const since = step - (lastPlacedAt.get(b.id) ?? -Infinity)
        if (since < TABU) cost += 50
      }
      return cost + rand() * 2
    }

    const choices = []
    for (const day of ALL_DAYS) {
      for (const slotId of board.periodCandidates(unit.classroom, day)) {
        const blockers = blockerUnits(board.directBlockers, day, slotId)
        if (!blockers) continue
        choices.push({ day, slotId, blockers, cost: costOf(blockers) })
      }
    }
    choices.sort((a, b) => a.cost - b.cost)

    const tryEvict = (day, slotId, blockers) => {
      const saved = []
      for (const b of blockers) {
        saved.push([b, b.members.map((m) => board.placements[m.id])])
        clear(b)
      }
      if (placeUnit(unit, day, slotId)) {
        lastPlacedAt.set(unit.id, step)
        for (const [b] of saved) queue.push(b)
        return true
      }
      for (const [b, spots] of saved) {
        b.members.forEach((m, i) => {
          if (spots[i]) board.place(m, spots[i].day, spots[i].slotId, true)
        })
      }
      return false
    }

    let placed = false
    for (const option of choices.slice(0, 10)) {
      if (tryEvict(option.day, option.slotId, option.blockers)) {
        placed = true
        break
      }
    }
    if (!placed) {
      const wide = []
      for (const { day, slotId } of choices.slice(0, 16)) {
        const blockers = blockerUnits(board.wideBlockers, day, slotId)
        if (blockers)
          wide.push({ day, slotId, blockers, cost: costOf(blockers) })
      }
      wide.sort((a, b) => a.cost - b.cost)
      for (const option of wide.slice(0, 6)) {
        if (tryEvict(option.day, option.slotId, option.blockers)) {
          placed = true
          break
        }
      }
    }
    if (!placed) queue.push(unit)
  }
}

function teachingPeriods(classroom, day) {
  return slotsForClassroom(classroom, day)
    .filter(
      (slot) =>
        slot.kind === 'period' &&
        isWithinClassroomHours(classroom, day, slot.id),
    )
    .map((slot) => slot.id)
}

/**
 * Free periods may only fall at the end of a class's day: reserve each
 * class's spare capacity as the last periods of its days. `rotation`
 * shifts which days give up their tail first, so retries try other layouts.
 */
function reserveTrailingFree(lessons, rotation = 0) {
  const overflow = lateOverflowClassrooms(lessons)
  /** Juniors without overflow keep P-8 for extras: size free time on regular load only. */
  const lateKept = (classroom) =>
    !overflow.has(classroom) && isLateSlot(classroom, LATE_SLOT_ID)
  const load = new Map()
  const seen = new Set()
  for (const lesson of lessons) {
    load.set(lesson.classroom, load.get(lesson.classroom) ?? 0)
    if (lesson.timing === 'end-of-day' && lateKept(lesson.classroom)) continue
    const unitId = lesson.syncGroupId
      ? `${lesson.classroom}|${lesson.syncGroupId}`
      : lesson.id
    if (seen.has(unitId)) continue
    seen.add(unitId)
    load.set(lesson.classroom, load.get(lesson.classroom) + lesson.span)
  }

  const reserved = new Set()
  for (const [classroom, periods] of load) {
    const keepLate = lateKept(classroom)
    const remaining = ALL_DAYS.map((day) => ({
      day,
      ids: teachingPeriods(classroom, day).filter(
        (id) => !(keepLate && isLateSlot(classroom, id)),
      ),
    }))
    let spare = remaining.reduce((sum, d) => sum + d.ids.length, 0) - periods
    // Saturday goes first (a free Saturday is the tail of the week)
    for (const d of remaining) {
      if (!WEEKEND_DAYS.includes(d.day)) continue
      while (spare > 0 && d.ids.length > 0) {
        reserved.add(`${classroom}|${d.day}|${d.ids.pop()}`)
        spare -= 1
      }
    }
    let turn = rotation
    while (spare > 0) {
      // Longest remaining day gives up its last period; ties rotate
      const order = remaining
        .map((d, i) => ({ d, i }))
        .filter(({ d }) => d.ids.length > 0)
        .sort(
          (a, b) =>
            b.d.ids.length - a.d.ids.length ||
            ((a.i + turn) % remaining.length) -
              ((b.i + turn) % remaining.length),
        )
      if (order.length === 0) break
      const { d } = order[0]
      reserved.add(`${classroom}|${d.day}|${d.ids.pop()}`)
      spare -= 1
      turn += 1
    }
    if (keepLate) {
      // A day that ends early drops P-8 too, so an extra never trails a gap
      for (const day of ALL_DAYS) {
        const cut = teachingPeriods(classroom, day).some((id) =>
          reserved.has(`${classroom}|${day}|${id}`),
        )
        if (cut && teachingPeriods(classroom, day).includes(LATE_SLOT_ID)) {
          reserved.add(`${classroom}|${day}|${LATE_SLOT_ID}`)
        }
      }
    }
  }
  return reserved
}

/**
 * Fast bundle-aware scheduler.
 * Places sync groups atomically (HS electives / co-teach), then singles.
 * Greedy pass + ejection repair; retries other end-of-day free layouts.
 */
export function autoSchedule(lessons, options = {}) {
  const started = performance.now()
  const attempts = options.clearExisting === false ? 1 : (options.attempts ?? 3)
  const first = options.firstRotation ?? 0
  let best = null
  for (let rotation = first; rotation < first + attempts; rotation += 1) {
    const result = scheduleOnce(
      lessons,
      { ...options, seed: (options.seed ?? 7) + rotation * 4 },
      reserveTrailingFree(lessons, rotation),
    )
    if (!best || result.remaining < best.remaining) best = result
    if (best.remaining === 0) break
  }
  return { ...best, ms: Math.round(performance.now() - started) }
}

function scheduleOnce(lessons, options, reservedFree) {
  const { clearExisting = true } = options
  const started = performance.now()

  const seed = clearExisting
    ? {}
    : Object.fromEntries(
        Object.entries(options.existingPlacements ?? {}).filter(([id]) =>
          lessons.some((lesson) => lesson.id === id),
        ),
      )

  const board = createBoard(
    lessons,
    seed,
    clearExisting ? reservedFree : new Set(),
  )
  const loads = teacherLoadMap(lessons)

  /** @type {Map<string, typeof lessons>} */
  const groups = new Map()
  const singles = []
  for (const lesson of lessons) {
    if (board.placements[lesson.id]) continue
    const gid = lesson.syncGroupId
    if (gid) {
      let list = groups.get(gid)
      if (!list) {
        list = []
        groups.set(gid, list)
      }
      list.push(lesson)
    } else {
      singles.push(lesson)
    }
  }

  /** Scheduling units: one sync group or one singleton lesson. */
  const units = [
    ...[...groups.entries()].map(([id, members]) => ({
      id,
      members,
      classroom: members[0].classroom,
      span: Math.max(...members.map((m) => m.span)),
      teacherLoad: members.reduce(
        (sum, m) => sum + (loads.get(m.teacher) ?? 0),
        0,
      ),
    })),
    ...singles.map((lesson) => ({
      id: lesson.id,
      members: [lesson],
      classroom: lesson.classroom,
      span: lesson.span,
      teacherLoad: loads.get(lesson.teacher) ?? 0,
    })),
  ]

  function unitScore(members, day, slotId) {
    let score = 0
    for (const lesson of members) {
      const check = board.canPlace(lesson, day, slotId, true)
      if (!check.ok) return null
      score += check.score
    }
    return score / members.length
  }

  function listUnitSlots(unit) {
    const out = []
    for (const day of ALL_DAYS) {
      for (const slotId of board.periodCandidates(unit.classroom, day)) {
        const score = unitScore(unit.members, day, slotId)
        if (score == null) continue
        out.push({ day, slotId, score })
      }
    }
    out.sort((a, b) => a.score - b.score || a.day.localeCompare(b.day))
    return out
  }

  function placeUnit(unit, day, slotId) {
    // Place all members; roll back on any failure
    const placed = []
    for (const lesson of unit.members) {
      if (board.place(lesson, day, slotId, true)) {
        placed.push(lesson.id)
      } else {
        for (const id of placed) board.unplace(id)
        return false
      }
    }
    return true
  }

  function optionCount(unit) {
    let n = 0
    for (const day of ALL_DAYS) {
      for (const slotId of board.periodCandidates(unit.classroom, day)) {
        if (unitScore(unit.members, day, slotId) != null) n += 1
      }
    }
    return n
  }

  // Largest bundles first, then the most slot-starved (short-day classes,
  // reserved free tails), then by teacher load — one MRV count up front
  const initialOptions = new Map(
    units.map((unit) => [unit.id, optionCount(unit)]),
  )
  units.sort((a, b) => {
    if (b.members.length !== a.members.length) {
      return b.members.length - a.members.length
    }
    const oa = initialOptions.get(a.id)
    const ob = initialOptions.get(b.id)
    if (oa !== ob) return oa - ob
    if (b.span !== a.span) return b.span - a.span
    if (b.teacherLoad !== a.teacherLoad) return b.teacherLoad - a.teacherLoad
    return a.id.localeCompare(b.id)
  })

  for (const unit of units) {
    const slots = listUnitSlots(unit)
    if (slots[0]) placeUnit(unit, slots[0].day, slots[0].slotId)
  }

  repairWithEjections(board, units, listUnitSlots, placeUnit, options)

  const remaining = lessons.filter((lesson) => !board.placements[lesson.id])
  return {
    placements: board.placements,
    scheduled: lessons.length - remaining.length,
    remaining: remaining.length,
    remainingLessons: remaining,
    ms: Math.round(performance.now() - started),
  }
}
