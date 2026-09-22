import { CLASSROOMS, classroomGrade } from './schedule'

const COLOR_BY_SUBJECT = {
  Maths: '#2a7ab8',
  English: '#4a5fd4',
  Hindi: '#9a3d8a',
  Science: '#1a9a6a',
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
  'Visual Arts': '#c46a2a',
  'Computer Lab': '#2a6a8a',
  'Remedial Maths': '#3a7a9a',
  'Remedial English': '#5a5fb8',
  LRC: '#4a7080',
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

/** Display names from RBS teacher timetable export. */
export const TEACHER_DIRECTORY = [
  'Aarti Pathak',
  'Aaysha',
  'Aishwarya Kirti',
  'Ananya Pathak',
  'Anil Chary',
  'Anjali Bhagchandani',
  'Anjali Krishna',
  'Anurag Sharma',
  'Anurag Tiwari',
  'Arjun',
  'Atul Vij',
  'Bankey Bihari Agarwal',
  'bharati ghosh',
  'Bijay Sahu',
  'Chhaya Rani Singh',
  'Danish Raza',
  'Dwarithi Sinha Roy',
  'Jaishree Vij',
  'Juli Singh',
  'Kalpana Sharma',
  'Karuna Jaithirtha',
  'Komal',
  'Madhavi Talwalkar',
  'Manohar Srivastava',
  'Medhna Kashyap',
  'Neha Tripathi',
  'Nitya Pandey',
  'Papya',
  'Partha',
  'Prabha',
  'Ritu Srivastava',
  'Saptarshi Bhattacharya',
  'Seema Mehrotra',
  'Shahnaz Ali',
  'Shivangi Vats',
  'Shreshtha Singh',
  'Shripati Dubey',
  'Smiriti Verma',
  'Srajan',
  'Sudeshna Banerjee',
  'Sweta Singh',
  'Urshia Akhtar',
  'Vani',
  'Vikas Sharma',
  'Vivek Mishra',
]

/** Class teachers named on the RBS export (classes 6–12). */
const CLASS_TEACHERS = {
  6: 'Seema Mehrotra',
  7: 'Vivek Mishra',
  '8A': 'Bankey Bihari Agarwal',
  '8B': 'Karuna Jaithirtha',
  '9A': 'Ritu Srivastava',
  '9B': 'Danish Raza',
  '10A': 'Medhna Kashyap',
  '10B': 'Srajan',
  11: 'Ananya Pathak',
  12: 'Anjali Bhagchandani',
}

/**
 * Period-slot budgets from the class-individual PDF (~full days).
 * Junior weekdays: 8 periods (incl. Jr P-8 / 14:30). Saturday: 5.
 * Senior weekdays: 7 periods. Saturday: 6.
 * Subject once/day still applies — copies spread across days.
 */
const JUNIOR_LOAD = [
  { subject: 'English', span: 1, copies: 5 },
  { subject: 'Hindi', span: 1, copies: 5 },
  { subject: 'Maths', span: 2, copies: 1 },
  { subject: 'Maths', span: 1, copies: 3 },
  { subject: 'Science', span: 2, copies: 1 },
  { subject: 'Science', span: 1, copies: 2 },
  { subject: 'Social Studies', span: 1, copies: 4 },
  { subject: 'Sanskrit', span: 1, copies: 3 },
  { subject: 'Performing Arts', span: 2, copies: 1 },
  { subject: 'Life Skills', span: 2, copies: 1 },
  { subject: 'Visual Arts', span: 2, copies: 1 },
  { subject: 'LRC', span: 1, copies: 3 },
  { subject: 'Remedial Maths', span: 1, copies: 2 },
  { subject: 'Computer Lab', span: 1, copies: 1 },
  { subject: 'Library', span: 1, copies: 1 },
  { subject: 'CTP', span: 1, copies: 1 },
  { subject: 'Culture', span: 1, copies: 1 },
]

/** ~41 period slots — matches 9/10 class grids. */
const SENIOR_LOAD = [
  { subject: 'English', span: 1, copies: 5 },
  { subject: 'Maths', span: 1, copies: 5 },
  { subject: 'Hindi', span: 1, copies: 4 },
  { subject: 'Sanskrit', span: 1, copies: 2 },
  { subject: 'Physics', span: 1, copies: 3 },
  { subject: 'Chemistry', span: 1, copies: 3 },
  { subject: 'Biology', span: 1, copies: 3 },
  { subject: 'History', span: 1, copies: 3 },
  { subject: 'Geography', span: 1, copies: 3 },
  { subject: 'Economics', span: 1, copies: 2 },
  { subject: 'Art Education', span: 2, copies: 1 },
  { subject: 'Information Technology', span: 2, copies: 1 },
  { subject: 'Library', span: 1, copies: 1 },
  { subject: 'CTP', span: 1, copies: 1 },
]

/** Simplified stream-agnostic load that still fills senior capacity. */
const SENIOR_HS_LOAD = [
  { subject: 'English', span: 1, copies: 5 },
  { subject: 'Maths', span: 2, copies: 2 },
  { subject: 'Maths', span: 1, copies: 2 },
  { subject: 'Physics', span: 1, copies: 3 },
  { subject: 'Chemistry', span: 1, copies: 3 },
  { subject: 'Biology', span: 1, copies: 3 },
  { subject: 'History', span: 1, copies: 3 },
  { subject: 'Geography', span: 1, copies: 2 },
  { subject: 'Economics', span: 1, copies: 2 },
  { subject: 'Business Studies', span: 1, copies: 3 },
  { subject: 'Accountancy', span: 1, copies: 2 },
  { subject: 'Computer Science', span: 1, copies: 2 },
  { subject: 'Physical Education', span: 2, copies: 1 },
  { subject: 'Art Education', span: 2, copies: 1 },
  { subject: 'CTP', span: 1, copies: 1 },
]

function loadForClassroom(classroom) {
  const grade = classroomGrade(classroom)
  if (grade < 9) return JUNIOR_LOAD
  if (grade <= 10) return SENIOR_LOAD
  return SENIOR_HS_LOAD
}

function teacherFor(subject, classroom) {
  const grade = classroomGrade(classroom)
  switch (subject) {
    case 'CTP':
      return CLASS_TEACHERS[classroom] ?? 'Nitya Pandey'
    case 'Maths':
      if (classroom === '6') return 'Jaishree Vij'
      if (classroom === '7') return 'Bankey Bihari Agarwal'
      if (classroom === '8A' || classroom === '8B') return 'Anurag Sharma'
      if (classroom === '9A' || classroom === '9B') return 'Srajan'
      if (classroom === '10A' || classroom === '10B') return 'Medhna Kashyap'
      return 'Arjun' // 11 / 12
    case 'English':
      if (classroom === '6') return 'Aishwarya Kirti'
      if (classroom === '7' || classroom === '8A' || classroom === '8B') {
        return 'Karuna Jaithirtha'
      }
      if (classroom === '9A' || classroom === '9B') return 'Aishwarya Kirti'
      if (classroom === '10A' || classroom === '10B') return 'Kalpana Sharma'
      if (classroom === '11') return 'Ananya Pathak'
      return 'Vani' // 12
    case 'Hindi':
      if (classroom === '6' || classroom === '8A' || classroom === '8B') {
        return 'Aarti Pathak'
      }
      if (classroom === '7') return 'Shivangi Vats'
      // 10 Hindi/Sanskrit lists Ritu first (Shreshtha co-listed)
      return 'Ritu Srivastava'
    case 'Science':
      if (classroom === '8A' || classroom === '8B') return 'Bankey Bihari Agarwal'
      return 'Vivek Mishra' // 6, 7
    case 'Biology':
      if (grade >= 10) return 'Urshia Akhtar'
      return 'Aaysha'
    case 'Chemistry':
      if (grade >= 12) return 'Aaysha'
      if (grade >= 10) return 'Anil Chary'
      return 'Anurag Sharma'
    case 'Physics':
      if (classroom === '10A' || classroom === '10B') return 'Atul Vij'
      return 'Neha Tripathi'
    case 'Social Studies':
      if (classroom === '7') return 'Vikas Sharma'
      return 'Seema Mehrotra'
    case 'History':
      if (classroom === '10A' || classroom === '10B') return 'Vikas Sharma'
      return 'Saptarshi Bhattacharya'
    case 'Geography':
      if (grade <= 9) return 'Papya'
      return 'Sweta Singh'
    case 'Economics':
      if (classroom === '9A' || classroom === '9B') return 'Danish Raza'
      if (classroom === '10A' || classroom === '10B') return 'Srajan'
      return 'Prabha'
    case 'Library':
      if (classroom === '6') return 'Aishwarya Kirti'
      if (classroom === '7' || classroom === '8A' || classroom === '8B') {
        return 'Karuna Jaithirtha'
      }
      if (classroom === '9A') return 'Anurag Sharma'
      if (classroom === '9B') return 'Papya'
      return 'Srajan'
    case 'Art Education':
      return 'Partha'
    case 'Visual Arts':
      return 'Partha'
    case 'Performing Arts':
      return 'Chhaya Rani Singh'
    case 'Culture':
      if (classroom === '6') return 'Vivek Mishra'
      if (classroom === '7') return 'Jaishree Vij'
      if (grade <= 8) return 'Kalpana Sharma'
      return 'Ananya Pathak'
    case 'Life Skills':
      return 'bharati ghosh'
    case 'Sanskrit':
      if (classroom === '8B') return 'Shreshtha Singh'
      return 'Shivangi Vats'
    case 'Computer Lab':
    case 'Information Technology':
      return 'Juli Singh'
    case 'Computer Science':
      return 'Juli Singh'
    case 'Remedial Maths':
      if (classroom === '6') return 'Jaishree Vij'
      if (classroom === '7') return 'Bankey Bihari Agarwal'
      return 'Anurag Sharma'
    case 'Remedial English':
      if (classroom === '6') return 'Aishwarya Kirti'
      return 'Karuna Jaithirtha'
    case 'LRC':
      return 'Manohar Srivastava'
    case 'Physical Education':
      return 'Anurag Tiwari'
    case 'Accountancy':
      return 'Anjali Bhagchandani'
    case 'Business Studies':
      return 'Danish Raza'
    case 'Political Science':
      return 'Ananya Pathak'
    case 'Psychology':
      return classroom === '12' ? 'Papya' : 'Komal'
    default:
      return CLASS_TEACHERS[classroom] ?? 'Nitya Pandey'
  }
}

export const UNSCHEDULED_LESSONS = CLASSROOMS.flatMap((classroom) => {
  const load = loadForClassroom(classroom)
  const lessons = []
  load.forEach((item, loadIndex) => {
    for (let copy = 0; copy < item.copies; copy += 1) {
      const teacher = teacherFor(item.subject, classroom)
      lessons.push({
        id: `${classroom}-${item.subject}-${item.span}-${loadIndex}-${copy}`,
        subject: item.subject,
        teacher,
        classroom,
        span: item.span,
        color: colorFor(item.subject, teacher),
      })
    }
  })
  return lessons
})

export const TEACHERS = [
  ...new Set([
    ...TEACHER_DIRECTORY,
    ...UNSCHEDULED_LESSONS.map((lesson) => lesson.teacher),
  ]),
].sort((a, b) => a.localeCompare(b))
