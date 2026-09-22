export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export const WEEKEND_DAYS = ['Sat']

/** RBS class list from the live timetable export. */
export const CLASSROOMS = [
  '6',
  '7',
  '8A',
  '8B',
  '9A',
  '9B',
  '10A',
  '10B',
  '11',
  '12',
]

export function classroomGrade(classroom) {
  const match = String(classroom).match(/^(\d+)/)
  return match ? Number.parseInt(match[1], 10) : 0
}

/** Below class 9 → junior track; 9+ → senior track (staggered lunch). */
export function isJuniorClassroom(classroom) {
  return classroomGrade(classroom) < 9
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

export function baseSlotsForDay(day) {
  return day === 'Sat' ? SATURDAY_SLOTS : WEEKDAY_SLOTS
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
