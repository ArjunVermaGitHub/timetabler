import { resolveSubjectAbbreviations, resolveTeacherAbbreviations } from './abbreviations'
import { setClassrooms } from './schedule'

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

/** Distinct greys (cool, warm, green, violet tints) for subjects without a colour; all dark enough for white text. */
const GREY_SHADES = [
  '#4a6570',
  '#6b625a',
  '#556b5c',
  '#625a70',
  '#3d4a57',
  '#7a6f66',
  '#5f7376',
  '#4f4a52',
  '#707a6a',
  '#6a5f66',
]

let greyBySubject = new Map()

function assignGreys(subjects) {
  const unknown = [...new Set(subjects)]
    .filter((s) => !COLOR_BY_SUBJECT[s])
    .sort((a, b) => a.localeCompare(b))
  greyBySubject = new Map(
    unknown.map((s, i) => [s, GREY_SHADES[i % GREY_SHADES.length]]),
  )
}

export function colorFor(subject, teacher) {
  const base = COLOR_BY_SUBJECT[subject] ?? greyBySubject.get(subject) ?? '#4a6570'
  const shift = TEACHER_SHIFT[teacher] ?? 0
  return shift === 0 ? base : shiftHex(base, shift)
}

/** Lesson cards, teachers and class teachers from the server catalog. */
export let UNSCHEDULED_LESSONS = []
export let TEACHERS = []
export let CLASS_TEACHERS = {}
/** Name → abbreviation, set by hand or generated (see abbreviations.js). */
export let TEACHER_ABBR = new Map()
export let SUBJECT_ABBR = new Map()

/**
 * Install a catalog from `/api/catalog`. Fresh arrays every time, so caches
 * keyed on the lesson list (placement lookups) never serve stale data.
 */
export function applyCatalog({ classrooms, teachers, lessons, abbreviations = {} }) {
  setClassrooms(classrooms)
  CLASS_TEACHERS = Object.fromEntries(
    classrooms.filter((c) => c.classTeacher).map((c) => [c.name, c.classTeacher]),
  )
  assignGreys(lessons.map((l) => l.subject))
  UNSCHEDULED_LESSONS = lessons.map((lesson) => ({
    ...lesson,
    color: colorFor(lesson.subject, lesson.teacher),
  }))
  TEACHERS = [
    ...new Set([...teachers, ...UNSCHEDULED_LESSONS.map((l) => l.teacher)]),
  ].sort((a, b) => a.localeCompare(b))
  const ownTeacherAbbr = abbreviations.teachers ?? {}
  TEACHER_ABBR = resolveTeacherAbbreviations(
    TEACHERS.map((name) => ({ name, abbr: ownTeacherAbbr[name] })),
  )
  SUBJECT_ABBR = resolveSubjectAbbreviations(
    [...new Set(UNSCHEDULED_LESSONS.map((l) => l.subject))].sort((a, b) =>
      a.localeCompare(b),
    ),
    abbreviations.subjects,
  )
}
