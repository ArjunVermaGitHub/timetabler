import { nextPeriodId, slotsForClassroom } from './schedule'

export function occupiedSlots(lesson, placement) {
  if (!placement) return []
  const slots = [placement.slotId]
  if (lesson.span === 2) {
    const next = nextPeriodId(
      placement.slotId,
      lesson.classroom,
      placement.day,
    )
    if (next) slots.push(next)
  }
  return slots
}

function isPeriodSlot(classroom, day, slotId) {
  const slot = slotsForClassroom(classroom, day).find((item) => item.id === slotId)
  return Boolean(slot && slot.kind === 'period')
}

export function buildOccupancy(lessons, placements) {
  const map = new Map()
  for (const lesson of lessons) {
    const placement = placements[lesson.id]
    if (!placement) continue
    for (const slotId of occupiedSlots(lesson, placement)) {
      map.set(`${lesson.classroom}|${placement.day}|${slotId}`, lesson.id)
    }
  }
  return map
}

export function buildTeacherOccupancy(lessons, placements) {
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

  const occupancy = buildOccupancy(lessons, placements)
  for (const id of needed) {
    const key = `${classroom}|${day}|${id}`
    const holder = occupancy.get(key)
    if (holder && holder !== lesson.id) {
      return { ok: false, reason: 'occupied' }
    }
  }

  const teachers = buildTeacherOccupancy(lessons, placements)
  for (const id of needed) {
    const hit = teachers.get(`${lesson.teacher}|${day}|${id}`)
    if (hit && hit.lessonId !== lesson.id) {
      return {
        ok: false,
        reason: 'teacher',
        conflict: { classroom: hit.classroom, lessonId: hit.lessonId },
      }
    }
  }

  for (const other of lessons) {
    if (other.id === lesson.id) continue
    if (other.classroom !== classroom) continue
    if (other.subject !== lesson.subject) continue
    const placement = placements[other.id]
    if (placement && placement.day === day) {
      return {
        ok: false,
        reason: 'subject',
        conflict: { classroom, lessonId: other.id },
      }
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
  return evaluatePlacement(
    lesson,
    classroom,
    day,
    slotId,
    lessons,
    placements,
  ).ok
}

export function lessonAt(classroom, day, slotId, lessons, placements) {
  const occupancy = buildOccupancy(lessons, placements)
  const lessonId = occupancy.get(`${classroom}|${day}|${slotId}`)
  if (!lessonId) return null
  const lesson = lessons.find((item) => item.id === lessonId)
  const placement = placements[lessonId]
  if (!lesson || !placement) return null
  if (placement.slotId !== slotId) return { lesson, placement, covered: true }
  return { lesson, placement, covered: false }
}

export function lessonAtTeacher(teacher, day, slotId, lessons, placements) {
  const teachers = buildTeacherOccupancy(lessons, placements)
  const hit = teachers.get(`${teacher}|${day}|${slotId}`)
  if (!hit) return null
  const lesson = lessons.find((item) => item.id === hit.lessonId)
  const placement = placements[hit.lessonId]
  if (!lesson || !placement) return null
  if (placement.slotId !== slotId) return { lesson, placement, covered: true }
  return { lesson, placement, covered: false }
}
