import {
  allowsConcurrentLessons,
  isBeforeLunch,
  isWithinClassroomHours,
  nextPeriodId,
  slotsForClassroom,
  violatesLateSlot,
} from './schedule'

export function occupiedSlots(lesson, placement) {
  if (!placement) return []
  const slots = [placement.slotId]
  if (lesson.span === 2) {
    const next = nextPeriodId(placement.slotId, lesson.classroom, placement.day)
    if (next) slots.push(next)
  }
  return slots
}

function isPeriodSlot(classroom, day, slotId) {
  const slot = slotsForClassroom(classroom, day).find(
    (item) => item.id === slotId,
  )
  return Boolean(slot && slot.kind === 'period')
}

/**
 * Grids query every cell against the same (lessons, placements) pair, so
 * derived indexes are cached per pair. Placements are replaced, never mutated.
 */
const indexCache = new WeakMap()

function cached(kind, lessons, placements, build) {
  let perLessons = indexCache.get(placements)
  if (!perLessons) {
    perLessons = new WeakMap()
    indexCache.set(placements, perLessons)
  }
  let entry = perLessons.get(lessons)
  if (!entry) {
    entry = {}
    perLessons.set(lessons, entry)
  }
  if (!(kind in entry)) entry[kind] = build()
  return entry[kind]
}

const byIdCache = new WeakMap()

function lessonById(lessons, id) {
  let map = byIdCache.get(lessons)
  if (!map) {
    map = new Map(lessons.map((lesson) => [lesson.id, lesson]))
    byIdCache.set(lessons, map)
  }
  return map.get(id)
}

/** classroom|day|slotId → lessonId[] */
export function buildOccupancy(lessons, placements) {
  return cached('class', lessons, placements, () =>
    buildOccupancyUncached(lessons, placements),
  )
}

function buildOccupancyUncached(lessons, placements) {
  const map = new Map()
  for (const lesson of lessons) {
    const placement = placements[lesson.id]
    if (!placement) continue
    for (const slotId of occupiedSlots(lesson, placement)) {
      const key = `${lesson.classroom}|${placement.day}|${slotId}`
      let list = map.get(key)
      if (!list) {
        list = []
        map.set(key, list)
      }
      if (!list.includes(lesson.id)) list.push(lesson.id)
    }
  }
  return map
}

export function buildTeacherOccupancy(lessons, placements) {
  return cached('teacher', lessons, placements, () =>
    buildTeacherOccupancyUncached(lessons, placements),
  )
}

function buildTeacherOccupancyUncached(lessons, placements) {
  const map = new Map()
  for (const lesson of lessons) {
    const placement = placements[lesson.id]
    if (!placement) continue
    for (const slotId of occupiedSlots(lesson, placement)) {
      map.set(`${lesson.teacher}|${placement.day}|${slotId}`, {
        lessonId: lesson.id,
        classroom: lesson.classroom,
      })
    }
  }
  return map
}

export function evaluatePlacement(
  lesson,
  classroom,
  day,
  slotId,
  lessons,
  placements,
) {
  if (lesson.classroom !== classroom) {
    return { ok: false, reason: 'classroom' }
  }

  if (!isPeriodSlot(classroom, day, slotId)) {
    return { ok: false, reason: 'break' }
  }

  if (lesson.span === 2) {
    const next = nextPeriodId(slotId, classroom, day)
    if (!next) return { ok: false, reason: 'span' }
  }

  const needed = occupiedSlots(lesson, { day, slotId })
  if (needed.length !== lesson.span) {
    return { ok: false, reason: 'span' }
  }

  for (const id of needed) {
    if (!isWithinClassroomHours(classroom, day, id)) {
      return { ok: false, reason: 'hours' }
    }
  }

  if (violatesLateSlot(lesson, needed, lessons)) {
    return { ok: false, reason: 'late' }
  }

  if (
    lesson.timing === 'pre-lunch' &&
    needed.some((id) => !isBeforeLunch(classroom, day, id))
  ) {
    return { ok: false, reason: 'pre-lunch' }
  }

  // End-of-day extras: nothing regular may follow them in the class's day
  const periodIds = slotsForClassroom(classroom, day)
    .filter((slot) => slot.kind === 'period')
    .map((slot) => slot.id)
  const firstIdx = periodIds.indexOf(needed[0])
  const lastIdx = periodIds.indexOf(needed[needed.length - 1])
  for (const other of lessons) {
    if (other.classroom !== classroom || other.id === lesson.id) continue
    if (other.syncGroupId && other.syncGroupId === lesson.syncGroupId) continue
    const placement = placements[other.id]
    if (!placement || placement.day !== day) continue
    const otherIds = occupiedSlots(other, placement).map((id) =>
      periodIds.indexOf(id),
    )
    const regularAfterExtra =
      lesson.timing === 'end-of-day' &&
      other.timing !== 'end-of-day' &&
      Math.max(...otherIds) > lastIdx
    const extraBeforeRegular =
      other.timing === 'end-of-day' &&
      lesson.timing !== 'end-of-day' &&
      Math.min(...otherIds) < firstIdx
    if (regularAfterExtra || extraBeforeRegular) {
      return {
        ok: false,
        reason: 'end-of-day',
        conflict: { classroom, lessonId: other.id },
      }
    }
  }

  const occupancy = buildOccupancy(lessons, placements)
  for (const id of needed) {
    const key = `${classroom}|${day}|${id}`
    const holders = occupancy.get(key) ?? []
    const others = holders.filter((holderId) => holderId !== lesson.id)
    if (others.length === 0) continue
    for (const holderId of others) {
      const other = lessonById(lessons, holderId)
      if (!other) continue
      if (
        !allowsConcurrentLessons(
          classroom,
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

  const teachers = buildTeacherOccupancy(lessons, placements)
  for (const id of needed) {
    const hit = teachers.get(`${lesson.teacher}|${day}|${id}`)
    const hitLesson = hit && lessonById(lessons, hit.lessonId)
    const jointSession =
      lesson.syncGroupId && hitLesson?.syncGroupId === lesson.syncGroupId
    if (hit && hit.lessonId !== lesson.id && !jointSession) {
      return {
        ok: false,
        reason: 'teacher',
        conflict: { classroom: hit.classroom, lessonId: hit.lessonId },
      }
    }
  }

  // A teacher takes a subject with a class at most once a day
  for (const other of lessons) {
    if (other.id === lesson.id) continue
    if (other.classroom !== classroom) continue
    if (other.subject !== lesson.subject) continue
    if (other.teacher !== lesson.teacher) continue
    const placement = placements[other.id]
    if (!placement || placement.day !== day) continue
    return {
      ok: false,
      reason: 'subject',
      conflict: { classroom, lessonId: other.id },
    }
  }

  return { ok: true }
}

export function canPlaceLesson(
  lesson,
  classroom,
  day,
  slotId,
  lessons,
  placements,
) {
  return evaluatePlacement(lesson, classroom, day, slotId, lessons, placements)
    .ok
}

/** All lessons starting or covering this slot (for concurrent stream cells). */
export function lessonsAt(classroom, day, slotId, lessons, placements) {
  const occupancy = buildOccupancy(lessons, placements)
  const ids = occupancy.get(`${classroom}|${day}|${slotId}`) ?? []
  const result = []
  for (const lessonId of ids) {
    const lesson = lessonById(lessons, lessonId)
    const placement = placements[lessonId]
    if (!lesson || !placement) continue
    result.push({
      lesson,
      placement,
      covered: placement.slotId !== slotId,
    })
  }
  return result
}

/** First lesson at slot (compat). Prefer lessonsAt for stream classes. */
export function lessonAt(classroom, day, slotId, lessons, placements) {
  const all = lessonsAt(classroom, day, slotId, lessons, placements)
  return all[0] ?? null
}

export function lessonAtTeacher(teacher, day, slotId, lessons, placements) {
  const teachers = buildTeacherOccupancy(lessons, placements)
  const hit = teachers.get(`${teacher}|${day}|${slotId}`)
  if (!hit) return null
  const lesson = lessonById(lessons, hit.lessonId)
  const placement = placements[hit.lessonId]
  if (!lesson || !placement) return null
  if (placement.slotId !== slotId) return { lesson, placement, covered: true }
  return { lesson, placement, covered: false }
}
