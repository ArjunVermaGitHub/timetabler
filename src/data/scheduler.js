import {
  DAYS,
  WEEKEND_DAYS,
  allowsConcurrentLessons,
  baseSlotsForDay,
  isBeforeLunch,
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
      classBalance -= (
        classDaySlots.get(classKey(lesson.classroom, d)) ?? []
      ).length * 0.15
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

    if (lesson.subject === 'Physical Education') {
      for (const id of needed) {
        if (!isBeforeLunch(lesson.classroom, day, id)) {
          return { ok: false, reason: 'pe' }
        }
      }
    }

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
      if (teacherOcc.has(`${lesson.teacher}|${day}|${id}`)) {
        return { ok: false, reason: 'teacher' }
      }
    }

    // Subject-once/day for a single teacher; co-teachers must share the same slots
    const subjectKey = `${lesson.classroom}|${day}|${lesson.subject}`
    const subjectHolders = subjectDay.get(subjectKey)
    if (subjectHolders && subjectHolders.size > 0) {
      for (const hid of subjectHolders) {
        if (hid === lesson.id) continue
        const other = byId.get(hid)
        if (!other) continue
        if (other.teacher === lesson.teacher) {
          return { ok: false, reason: 'subject' }
        }
        const otherPlace = placements[hid]
        if (!otherPlace) continue
        const otherSlots = occupiedFor(other, otherPlace.day, otherPlace.slotId)
        if (
          !otherSlots ||
          otherSlots.length !== needed.length ||
          otherSlots.some((sid, idx) => sid !== needed[idx])
        ) {
          return { ok: false, reason: 'subject' }
        }
        if (
          !allowsConcurrentLessons(
            lesson.classroom,
            other.subject,
            lesson.subject,
            other,
            lesson,
          )
        ) {
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
    subjectDayRemove(
      lesson.classroom,
      placement.day,
      lesson.subject,
      lessonId,
    )
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
    subjectDayAdd(
      lesson.classroom,
      placement.day,
      lesson.subject,
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
 * Fast bundle-aware scheduler.
 * Places sync groups atomically (HS electives / co-teach), then singles.
 * One greedy MRV pass + a cheap bump-repair — no heavy DFS.
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

  // Place largest bundles first, then by teacher load — no per-step MRV recount
  units.sort((a, b) => {
    if (b.members.length !== a.members.length) {
      return b.members.length - a.members.length
    }
    if (b.span !== a.span) return b.span - a.span
    if (b.teacherLoad !== a.teacherLoad) return b.teacherLoad - a.teacherLoad
    return a.id.localeCompare(b.id)
  })

  for (const unit of units) {
    const slots = listUnitSlots(unit)
    if (slots[0]) placeUnit(unit, slots[0].day, slots[0].slotId)
  }

  // Cheap repair: bump one blocker for each leftover unit
  const leftoverUnits = units.filter((unit) =>
    unit.members.some((m) => !board.placements[m.id]),
  )
  for (const unit of leftoverUnits) {
    if (unit.members.every((m) => board.placements[m.id])) continue

    // Unplace incomplete group members first
    for (const m of unit.members) {
      if (board.placements[m.id]) board.unplace(m.id)
    }

    let slots = listUnitSlots(unit)
    if (slots[0] && placeUnit(unit, slots[0].day, slots[0].slotId)) continue

    // Bump same-class singles that aren't in a sync group
    const blockers = lessons.filter((other) => {
      if (!board.placements[other.id]) return false
      if (other.classroom !== unit.classroom) return false
      if (other.syncGroupId) return false
      return true
    })
    blockers.sort(
      (a, b) => (loads.get(a.teacher) ?? 0) - (loads.get(b.teacher) ?? 0),
    )

    let placed = false
    for (const blocker of blockers.slice(0, 25)) {
      const saved = { ...board.placements[blocker.id] }
      board.unplace(blocker.id)
      slots = listUnitSlots(unit)
      if (slots[0] && placeUnit(unit, slots[0].day, slots[0].slotId)) {
        const blockerSlots = []
        for (const day of ALL_DAYS) {
          for (const slotId of board.periodCandidates(blocker.classroom, day)) {
            const check = board.canPlace(blocker, day, slotId, true)
            if (check.ok) blockerSlots.push({ day, slotId, score: check.score })
          }
        }
        blockerSlots.sort((a, b) => a.score - b.score)
        if (
          blockerSlots[0] &&
          board.place(
            blocker,
            blockerSlots[0].day,
            blockerSlots[0].slotId,
            true,
          )
        ) {
          placed = true
          break
        }
        for (const m of unit.members) {
          if (board.placements[m.id]) board.unplace(m.id)
        }
        board.place(blocker, saved.day, saved.slotId, true)
        continue
      }
      board.place(blocker, saved.day, saved.slotId, true)
    }
    if (!placed) {
      // leave unplaced
    }
  }

  const remaining = lessons.filter((lesson) => !board.placements[lesson.id])
  return {
    placements: board.placements,
    scheduled: lessons.length - remaining.length,
    remaining: remaining.length,
    remainingLessons: remaining,
    ms: Math.round(performance.now() - started),
  }
}
