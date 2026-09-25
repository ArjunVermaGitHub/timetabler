import catalog from './rbsCatalog.json'
import { CLASSROOMS, classroomGrade } from './schedule'

const COLOR_BY_SUBJECT = {
  Maths: '#2a7ab8',
  'Applied Maths': '#3a6aa8',
  English: '#4a5fd4',
  Hindi: '#9a3d8a',
  Science: '#1a9a6a',
  'Environmental Studies': '#2a8a5a',
  Biology: '#2f8f5b',
  Chemistry: '#3d7a9a',
  Physics: '#4a6f8a',
  'Social Studies': '#6a5f8a',
  History: '#7a5a6a',
  Geography: '#5a7a6a',
  Library: '#3d6ec4',
  CTP: '#0d7a72',
  Culture: '#b84a7a',
  'Art Education': '#c45a3a',
  'Life Skills': '#8a6a3a',
  Economics: '#5a6a8a',
  Sanskrit: '#8a4a6a',
  'Performing Arts': '#b85a3a',
  Dance: '#c45a4a',
  Music: '#a55a7a',
  Vocal: '#a54a6a',
  Tabla: '#955a5a',
  Bharatnatyam: '#b84a5a',
  Painting: '#c46a3a',
  'Visual Arts': '#c46a2a',
  'Computer Lab': '#2a6a8a',
  'Remedial Maths': '#3a7a9a',
  'Remedial English': '#5a5fb8',
  'Remedial Hindi': '#8a4a7a',
  LRC: '#4a7080',
  Craft: '#9a6a4a',
  Games: '#5a8a3a',
  'Free Play': '#7a8a5a',
  'Information Technology': '#2a7088',
  'Physical Education': '#5a7a3a',
  Accountancy: '#6a5a7a',
  'Business Studies': '#5a6a7a',
  'Political Science': '#6a4a6a',
  Psychology: '#7a5a8a',
  'Computer Science': '#3a6080',
}

const TEACHER_SHIFT = {
  'Aarti Pathak': 0,
  Aaysha: 4,
  'Anjali Krishna': -4,
  'Nitya Pandey': 6,
  'Madhavi Talwalkar': -6,
  'Shreshtha Singh': 5,
  'Dwarithi Sinha Roy': -5,
  Vani: 3,
  'bharati ghosh': 0,
  'Bijay Sahu': 2,
  Partha: -3,
  'Sudeshna Banerjee': 4,
  'Manohar Srivastava': -2,
  'Ananya Pathak': 1,
  'Karuna Jaithirtha': 3,
  'Bankey Bihari Agarwal': -2,
  'Jaishree Vij': 2,
  Srajan: -3,
  Papya: 4,
}

function shiftHex(hex, amount) {
  const n = Number.parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + amount))
  const g = Math.min(
    255,
    Math.max(0, ((n >> 8) & 255) + Math.round(amount * 0.4)),
  )
  const b = Math.min(255, Math.max(0, (n & 255) - Math.round(amount * 0.3)))
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

export function colorFor(subject, teacher) {
  const base = COLOR_BY_SUBJECT[subject] ?? '#4a6570'
  const shift = TEACHER_SHIFT[teacher] ?? 0
  return shift === 0 ? base : shiftHex(base, shift)
}

/** Full teacher list from the RBS teacher-individual export. */
export const TEACHER_DIRECTORY = catalog.teachers

/** Class teacher map from the class-individual export. */
export const CLASS_TEACHERS = catalog.classTeachers

/**
 * Every lesson card from RBS exports (600+).
 * HS electives carry syncGroupId so PDF stream mates stay locked together.
 */
export const UNSCHEDULED_LESSONS = catalog.lessons.map((lesson) => ({
  ...lesson,
  color: colorFor(lesson.subject, lesson.teacher),
}))

export const TEACHERS = [
  ...new Set([
    ...TEACHER_DIRECTORY,
    ...UNSCHEDULED_LESSONS.map((lesson) => lesson.teacher),
  ]),
].sort((a, b) => a.localeCompare(b))

/** Sanity: catalog classrooms should match schedule.CLASSROOMS. */
export function catalogClassroomCount() {
  return catalog.classrooms.length
}

export function catalogLessonCount() {
  return UNSCHEDULED_LESSONS.length
}

// Re-export grade helper usage for any leftover callers
export { CLASSROOMS, classroomGrade }
