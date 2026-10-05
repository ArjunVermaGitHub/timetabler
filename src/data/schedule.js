export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export const WEEKEND_DAYS = ['Sat']

/** Class names in display order; replaced by the server catalog on sign-in. */
export let CLASSROOMS = []

export function classroomGrade(classroom) {
  const match = String(classroom).match(/^(\d+)/)
  // Non-numeric early rooms (e.g. Kopal) sit on the junior track.
  return match ? Number.parseInt(match[1], 10) : 0
}

/** Below class 9 → junior track; 9+ → senior track (staggered lunch). */
export function isJuniorClassroom(classroom) {
  return classroomGrade(classroom) < 9
}

/**
 * Classes 11–12 run option streams in parallel.
 * Younger classes also co-schedule group splits (LRC / Remedial / arts).
 */
const FLEX_SUBJECTS = new Set([
  'LRC',
  'Remedial Maths',
  'Remedial English',
  'Remedial Hindi',
  'Art Education',
  'Performing Arts',
  'Visual Arts',
  'Life Skills',
  'Dance',
  'Music',
  'Vocal',
  'Tabla',
  'Painting',
  'Bharatnatyam',
  'Games',
  'Craft',
  'Free Play',
  'Physical Education',
])

export function isFlexSubject(subject) {
  return FLEX_SUBJECTS.has(subject)
}

/**
 * May two lessons share a class clock slot?
 * - Sync-group mates (co-teach / HS elective bundle): yes
 * - HS different streams: no (Math block ≠ Chem block)
 * - Lower-grade flex pairs (LRC + Remedial): yes
 */
export function allowsConcurrentLessons(
  classroom,
  existingSubject,
  incomingSubject,
  existingLesson = null,
  incomingLesson = null,
) {
  if (existingLesson && incomingLesson) {
    // Parallel groups are explicit in the catalog; only mates share a cell
    const a = existingLesson.syncGroupId
    const b = incomingLesson.syncGroupId
    return Boolean(a && b && a === b)
  }

  if (existingSubject === incomingSubject) {
    return (
      isFlexSubject(existingSubject) ||
      existingSubject === 'Hindi' ||
      existingSubject === 'English'
    )
  }
  if (classroomGrade(classroom) >= 11) return false
  if (isFlexSubject(existingSubject) && isFlexSubject(incomingSubject)) {
    return true
  }
  return false
}

export function trackForClassroom(classroom) {
  return isJuniorClassroom(classroom) ? 'junior' : 'senior'
}

/**
 * Shared Mon–Fri timeline from RBS_Timetable.
 * Junior & senior share clock times but period names / lunch differ.
 * 08:00–08:40 is Jr P-1 for juniors; seniors are at Breakfast (not taught).
 */
export const WEEKDAY_SLOTS = [
  {
    id: 'wd_0800',
    start: '08:00',
    end: '08:40',
    minutes: 40,
    // Juniors teach here as Jr P-1; seniors are at Breakfast (no lessons in PDF).
    junior: { kind: 'period', label: 'Jr P-1' },
    senior: { kind: 'break', label: 'Breakfast' },
  },
  {
    id: 'wd_assembly',
    start: '08:40',
    end: '09:00',
    minutes: 20,
    junior: { kind: 'break', label: 'Assembly' },
    senior: { kind: 'break', label: 'Assembly' },
  },
  {
    id: 'wd_0900',
    start: '09:00',
    end: '09:50',
    minutes: 50,
    junior: { kind: 'period', label: 'Jr P-2' },
    senior: { kind: 'period', label: 'Sr P-1' },
  },
  {
    id: 'wd_0950',
    start: '09:50',
    end: '10:40',
    minutes: 50,
    junior: { kind: 'period', label: 'Jr P-3' },
    senior: { kind: 'period', label: 'Sr P-2' },
  },
  {
    id: 'wd_recess',
    start: '10:40',
    end: '11:00',
    minutes: 20,
    junior: { kind: 'break', label: 'Recess' },
    senior: { kind: 'break', label: 'Recess' },
  },
  {
    id: 'wd_1100',
    start: '11:00',
    end: '11:50',
    minutes: 50,
    junior: { kind: 'period', label: 'Jr P-4' },
    senior: { kind: 'period', label: 'Sr P-3' },
  },
  {
    id: 'wd_1150',
    start: '11:50',
    end: '12:30',
    minutes: 40,
    junior: { kind: 'period', label: 'Jr P-5' },
    senior: { kind: 'period', label: 'Sr P-4' },
  },
  {
    id: 'wd_1230',
    start: '12:30',
    end: '13:10',
    minutes: 40,
    junior: { kind: 'break', label: 'Jr Lunch' },
    senior: { kind: 'period', label: 'Sr P-5' },
  },
  {
    id: 'wd_1310',
    start: '13:10',
    end: '13:50',
    minutes: 40,
    junior: { kind: 'period', label: 'Jr P-6' },
    senior: { kind: 'break', label: 'Sr Lunch' },
  },
  {
    id: 'wd_1350',
    start: '13:50',
    end: '14:30',
    minutes: 40,
    junior: { kind: 'period', label: 'Jr P-7' },
    senior: { kind: 'period', label: 'Sr P-6' },
  },
  {
    id: 'wd_1430',
    start: '14:30',
    end: '15:10',
    minutes: 40,
    // PDF class grids still schedule juniors here (remedial / LRC / etc.)
    junior: { kind: 'period', label: 'Jr P-8' },
    senior: { kind: 'period', label: 'Sr P-7' },
  },
]

/** Saturday column set from the RBS export (shorter day). */
export const SATURDAY_SLOTS = [
  {
    id: 'sa_0830',
    start: '08:30',
    end: '09:00',
    minutes: 30,
    // Locked self-study — not a teachable / droppable period
    junior: { kind: 'fixed', label: 'Self Study' },
    senior: { kind: 'fixed', label: 'Self Study' },
  },
  {
    id: 'sa_0900',
    start: '09:00',
    end: '09:50',
    minutes: 50,
    junior: { kind: 'period', label: 'P-1' },
    senior: { kind: 'period', label: 'P-1' },
  },
  {
    id: 'sa_0950',
    start: '09:50',
    end: '10:40',
    minutes: 50,
    junior: { kind: 'period', label: 'P-2' },
    senior: { kind: 'period', label: 'P-2' },
  },
  {
    id: 'sa_recess',
    start: '10:40',
    end: '11:00',
    minutes: 20,
    junior: { kind: 'break', label: 'Recess' },
    senior: { kind: 'break', label: 'Recess' },
  },
  {
    id: 'sa_1100',
    start: '11:00',
    end: '11:50',
    minutes: 50,
    junior: { kind: 'period', label: 'P-3' },
    senior: { kind: 'period', label: 'P-3' },
  },
  {
    id: 'sa_1150',
    start: '11:50',
    end: '12:30',
    minutes: 40,
    junior: { kind: 'period', label: 'P-4' },
    senior: { kind: 'period', label: 'P-4' },
  },
  {
    id: 'sa_1230',
    start: '12:30',
    end: '13:10',
    minutes: 40,
    junior: { kind: 'break', label: 'Jr Lunch' },
    senior: { kind: 'period', label: 'Sr P-5' },
  },
  {
    id: 'sa_1310',
    start: '13:10',
    end: '13:55',
    minutes: 45,
    junior: { kind: 'break', label: 'End' },
    senior: { kind: 'break', label: 'Sr Lunch' },
  },
]

/** Junior P-8: only end-of-day extras (LRC / remedial) run here. */
export const LATE_SLOT_ID = 'wd_1430'

export function isLateSlot(classroom, slotId) {
  return slotId === LATE_SLOT_ID && isJuniorClassroom(classroom)
}

const lateOverflowCache = new WeakMap()

/**
 * Junior classes whose regular (non-extra) periods exceed their capacity
 * before P-8 — only those may spill a regular lesson into P-8.
 */
export function lateOverflowClassrooms(lessons) {
  const hit = lateOverflowCache.get(lessons)
  if (hit) return hit
  const load = new Map()
  const seen = new Set()
  for (const lesson of lessons) {
    if (
      lesson.timing === 'end-of-day' ||
      !isJuniorClassroom(lesson.classroom)
    ) {
      continue
    }
    const unitId = lesson.syncGroupId
      ? `${lesson.classroom}|${lesson.syncGroupId}`
      : lesson.id
    if (seen.has(unitId)) continue
    seen.add(unitId)
    load.set(lesson.classroom, (load.get(lesson.classroom) ?? 0) + lesson.span)
  }
  const out = new Set()
  for (const [classroom, periods] of load) {
    let capacity = 0
    for (const day of [...DAYS, ...WEEKEND_DAYS]) {
      for (const slot of slotsForClassroom(classroom, day)) {
        if (
          slot.kind === 'period' &&
          slot.id !== LATE_SLOT_ID &&
          isWithinClassroomHours(classroom, day, slot.id)
        ) {
          capacity += 1
        }
      }
    }
    if (periods > capacity) out.add(classroom)
  }
  lateOverflowCache.set(lessons, out)
  return out
}

/**
 * Junior extras sit in P-8; regular lessons stay out of it unless the
 * class overflows.
 */
export function violatesLateSlot(lesson, slotIds, lessons) {
  if (lesson.timing === 'end-of-day') {
    return (
      isJuniorClassroom(lesson.classroom) &&
      isWithinClassroomHours(lesson.classroom, 'Mon', LATE_SLOT_ID) &&
      slotIds[slotIds.length - 1] !== LATE_SLOT_ID
    )
  }
  if (!slotIds.some((id) => isLateSlot(lesson.classroom, id))) return false
  return !lateOverflowClassrooms(lessons).has(lesson.classroom)
}

/** Taught sessions inside locked (fixed) columns, split beside the fixed label. */
export const FIXED_SESSIONS = [
  {
    classroom: '12',
    day: 'Sat',
    slotId: 'sa_0830',
    parts: [
      { label: 'Self Study' },
      { label: 'Yoga', teacher: 'Anurag Tiwari' },
    ],
  },
]

export function fixedSessionAt(classroom, day, slotId) {
  return (
    FIXED_SESSIONS.find(
      (s) => s.classroom === classroom && s.day === day && s.slotId === slotId,
    ) ?? null
  )
}

/** The part a teacher leads in a fixed column, with its classroom. */
export function fixedDutyFor(teacher, day, slotId) {
  for (const s of FIXED_SESSIONS) {
    if (s.day !== day || s.slotId !== slotId) continue
    const part = s.parts.find((p) => p.teacher === teacher)
    if (part) return { classroom: s.classroom, label: part.label }
  }
  return null
}

export function baseSlotsForDay(day) {
  return day === 'Sat' ? SATURDAY_SLOTS : WEEKDAY_SLOTS
}

function toMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Lays a shorter day (Saturday) out under the weekday columns in proportion to
 * time. Every start/end from either day becomes a cut, so each weekday column
 * splits into pieces (`cells`, each a share of one column) and both days span
 * whole pieces: weekday slots their own column's pieces, Saturday slots the
 * pieces their times cover. `lead`/`trailing` are pieces outside Saturday.
 */
export function buildTimeGrid(columns, slots) {
  const dayStart = toMinutes(columns[0].start)
  const dayEnd = toMinutes(columns[columns.length - 1].end)
  const clip = (t) => Math.min(dayEnd, Math.max(dayStart, toMinutes(t)))
  const cuts = [
    ...new Set([
      ...columns.flatMap((c) => [toMinutes(c.start), toMinutes(c.end)]),
      ...slots.flatMap((s) => [clip(s.start), clip(s.end)]),
    ]),
  ].sort((a, b) => a - b)

  const cells = []
  for (let i = 0; i < cuts.length - 1; i += 1) {
    const [from, to] = [cuts[i], cuts[i + 1]]
    const column = columns.findIndex(
      (c) => toMinutes(c.start) <= from && to <= toMinutes(c.end),
    )
    const own = toMinutes(columns[column].end) - toMinutes(columns[column].start)
    cells.push({ from, to, column, share: (to - from) / own })
  }

  const piecesIn = (from, to) =>
    cells.filter((cell) => cell.from >= from && cell.to <= to).length
  const columnSpans = columns.map((c) => piecesIn(toMinutes(c.start), toMinutes(c.end)))
  const slotSpans = slots.map((s) => piecesIn(clip(s.start), clip(s.end)))
  const lead = piecesIn(dayStart, clip(slots[0].start))
  const trailing = piecesIn(clip(slots[slots.length - 1].end), dayEnd)
  // Slots whose times differ from the weekday column above can't borrow its header
  const slotOffGrid = slots.map(
    (s) => !columns.some((c) => c.start === s.start && c.end === s.end),
  )
  return { cells, columnSpans, slotSpans, slotOffGrid, lead, trailing }
}

export function dualLabel(slot) {
  if (slot.junior.label === slot.senior.label) return slot.junior.label
  return `${slot.senior.label} / ${slot.junior.label}`
}

export function resolveSlot(slot, track) {
  const view = track === 'junior' ? slot.junior : slot.senior
  return {
    id: slot.id,
    start: slot.start,
    end: slot.end,
    minutes: slot.minutes,
    kind: view.kind,
    label: view.label,
    dualLabel: dualLabel(slot),
    track,
  }
}

export function slotsForClassroom(classroom, day = 'Mon') {
  return baseSlotsForDay(day).map((slot) =>
    resolveSlot(slot, trackForClassroom(classroom)),
  )
}

/** Teacher headers show both tracks, like the PDF. */
export function slotsForTeacherDay(day = 'Mon') {
  return baseSlotsForDay(day).map((slot) => {
    const juniorBlocked = isBlockedKind(slot.junior.kind)
    const seniorBlocked = isBlockedKind(slot.senior.kind)
    const bothBlocked = juniorBlocked && seniorBlocked
    const bothFixed =
      slot.junior.kind === 'fixed' && slot.senior.kind === 'fixed'
    return {
      id: slot.id,
      start: slot.start,
      end: slot.end,
      minutes: slot.minutes,
      kind: bothFixed ? 'fixed' : bothBlocked ? 'break' : 'period',
      label: dualLabel(slot),
      dualLabel: dualLabel(slot),
      juniorKind: slot.junior.kind,
      seniorKind: slot.senior.kind,
    }
  })
}

export function isBlockedKind(kind) {
  return kind === 'break' || kind === 'fixed'
}

/** @deprecated use slotsForClassroom — kept for any leftover imports */
export const SLOTS = WEEKDAY_SLOTS.map((slot) => resolveSlot(slot, 'senior'))

export function nextPeriodId(slotId, classroom, day = 'Mon') {
  const slots = slotsForClassroom(classroom, day)
  const periods = slots.filter((slot) => slot.kind === 'period')
  const index = periods.findIndex((slot) => slot.id === slotId)
  if (index < 0 || index === periods.length - 1) return null
  const current = periods[index]
  const next = periods[index + 1]
  const currentIndex = slots.findIndex((slot) => slot.id === current.id)
  const nextIndex = slots.findIndex((slot) => slot.id === next.id)
  if (nextIndex !== currentIndex + 1) return null
  return next.id
}

export function canPlaceDouble(startSlotId, classroom, day = 'Mon') {
  return nextPeriodId(startSlotId, classroom, day) !== null
}

/** Latest end time (HH:MM) a class may be taught until; absent = full day. */
let CLASSROOM_DAY_END = {}

/** Install the class list from the server catalog ({ name, dayEnd }[]). */
export function setClassrooms(classrooms) {
  CLASSROOMS = classrooms.map((c) => c.name)
  CLASSROOM_DAY_END = Object.fromEntries(
    classrooms.filter((c) => c.dayEnd).map((c) => [c.name, c.dayEnd]),
  )
}

export function isWithinClassroomHours(classroom, day, slotId) {
  const cutoff = CLASSROOM_DAY_END[classroom]
  if (!cutoff) return true
  const slot = baseSlotsForDay(day).find((item) => item.id === slotId)
  return Boolean(slot && slot.end <= cutoff)
}

export function classroomDayEnd(classroom) {
  return CLASSROOM_DAY_END[classroom] ?? null
}

/** True if this period sits before the class's lunch break that day. */
export function isBeforeLunch(classroom, day, slotId) {
  const slots = slotsForClassroom(classroom, day)
  const lunchIndex = slots.findIndex(
    (slot) => slot.kind === 'break' && /lunch/i.test(slot.label),
  )
  // No lunch column (or already past end) → treat as before lunch.
  if (lunchIndex < 0) return true
  const slotIndex = slots.findIndex((slot) => slot.id === slotId)
  if (slotIndex < 0) return false
  return slotIndex < lunchIndex
}
