import pdfMake from 'pdfmake/build/pdfmake'
import vfs from 'pdfmake/build/vfs_fonts'
import {
  DAYS,
  WEEKEND_DAYS,
  fixedDutyFor,
  fixedSessionAt,
  slotsForClassroom,
  slotsForTeacherDay,
} from './schedule'
import { lessonAtTeacher, lessonsAt } from './placement'
import { CLASS_TEACHERS } from './mockLessons'

pdfMake.addVirtualFileSystem(vfs)

const INK = '#3b2418'
const SOFT = '#8a6a55'
const HEAD_FILL = '#1a6b66'
const HEAD_INK = '#e8fffa'
const BREAK_FILL = '#f3d9a4'
const BREAK_INK = '#5a3a08'
const EMPTY_FILL = '#f7ede4'
const GRID_LINE = '#e2cdbd'

/**
 * Downloads the grids currently on screen as a PDF: one landscape A4 page per
 * class (or teacher), weekdays then Saturday, built from the same placements.
 */
export function downloadTimetablePdf(options) {
  const { definition, fileName } = buildTimetableDoc(options)
  pdfMake.createPdf(definition).download(fileName)
}

export function buildTimetableDoc({ mode, groups, lessons, placements }) {
  const pages = groups.map((group, index) => ({
    stack: [
      pageHeader(mode, group),
      weekTable(mode, group, DAYS, lessons, placements),
      {
        unbreakable: true,
        stack: [
          { text: 'Saturday', style: 'section', margin: [0, 12, 0, 4] },
          weekTable(mode, group, WEEKEND_DAYS, lessons, placements),
        ],
      },
    ],
    pageBreak: index === 0 ? undefined : 'before',
  }))

  const stamp = new Date().toISOString().slice(0, 10)
  const scope =
    groups.length === 1 ? groups[0] : mode === 'teacher' ? 'teachers' : 'classes'

  return {
    fileName: `timetable-${scope.replace(/\s+/g, '-').toLowerCase()}-${stamp}.pdf`,
    definition: {
      info: { title: `Timetable · ${scope}` },
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [24, 24, 24, 30],
      defaultStyle: { font: 'Roboto', fontSize: 7, color: INK },
      styles: {
        title: { fontSize: 15, bold: true, color: HEAD_FILL },
        meta: { fontSize: 8, color: SOFT },
        section: { fontSize: 9, bold: true, color: SOFT },
      },
      footer: (page, count) => ({
        columns: [
          { text: `Generated ${stamp}`, style: 'meta' },
          { text: `${page} / ${count}`, style: 'meta', alignment: 'right' },
        ],
        margin: [24, 8, 24, 0],
      }),
      content: pages,
    },
  }
}

function pageHeader(mode, group) {
  const classTeacher = mode === 'classroom' ? CLASS_TEACHERS[group] : null
  return {
    columns: [
      {
        text: mode === 'teacher' ? group : `Class ${group}`,
        style: 'title',
      },
      {
        text: classTeacher ? `Class teacher: ${classTeacher}` : '',
        style: 'meta',
        alignment: 'right',
        margin: [0, 5, 0, 0],
      },
    ],
    margin: [0, 0, 0, 8],
  }
}

function weekTable(mode, group, days, lessons, placements) {
  const slots =
    mode === 'teacher'
      ? slotsForTeacherDay(days[0])
      : slotsForClassroom(group, days[0])

  const header = [
    headCell('Day'),
    ...slots.map((slot) =>
      headCell(`${slot.label}\n${slot.start}–${slot.end}`, slot.kind !== 'period'),
    ),
  ]

  const body = days.map((day) => [
    { text: day, bold: true, color: HEAD_INK, fillColor: HEAD_FILL, alignment: 'center' },
    ...dayCells(mode, group, day, slots, lessons, placements),
  ])

  return {
    table: {
      headerRows: 1,
      dontBreakRows: true,
      widths: [30, ...slots.map((slot) => (slot.kind === 'period' ? '*' : 34))],
      heights: (row) => (row === 0 ? 20 : 46),
      body: [header, ...body],
    },
    layout: {
      hLineColor: () => GRID_LINE,
      vLineColor: () => GRID_LINE,
      hLineWidth: () => 0.6,
      vLineWidth: () => 0.6,
      paddingLeft: () => 3,
      paddingRight: () => 3,
      paddingTop: () => 3,
      paddingBottom: () => 3,
    },
  }
}

function headCell(text, blocked = false) {
  return {
    text,
    bold: true,
    fontSize: 6.5,
    alignment: 'center',
    color: blocked ? BREAK_INK : HEAD_INK,
    fillColor: blocked ? BREAK_FILL : HEAD_FILL,
  }
}

/** Mirrors the on-screen grid: breaks, fixed sessions, doubles span two columns, electives stack. */
function dayCells(mode, group, day, slots, lessons, placements) {
  const cells = []
  let index = 0

  while (index < slots.length) {
    const slot = slots[index]

    if (slot.kind !== 'period') {
      const fixed =
        slot.kind === 'fixed'
          ? mode === 'teacher'
            ? fixedDutyFor(group, day, slot.id)
            : fixedSessionAt(group, day, slot.id)
          : null
      const label = !fixed
        ? slot.label
        : mode === 'teacher'
          ? `${fixed.label}\n${fixed.classroom}`
          : fixed.parts.map((p) => p.label).join(' / ')
      cells.push({
        text: label,
        fontSize: 6,
        bold: true,
        alignment: 'center',
        color: BREAK_INK,
        fillColor: BREAK_FILL,
      })
      index += 1
      continue
    }

    const starters =
      mode === 'teacher'
        ? [lessonAtTeacher(group, day, slot.id, lessons, placements)].filter(
            (item) => item && !item.covered,
          )
        : lessonsAt(group, day, slot.id, lessons, placements).filter(
            (item) => !item.covered,
          )

    if (starters.length === 0) {
      cells.push({ text: '', fillColor: EMPTY_FILL })
      index += 1
      continue
    }

    const span = Math.min(
      Math.max(...starters.map((item) => item.lesson.span)),
      slots.length - index,
    )
    cells.push({ ...lessonCell(mode, starters.map((item) => item.lesson)), colSpan: span })
    for (let i = 1; i < span; i += 1) cells.push({})
    index += span
  }

  return cells
}

function lessonCell(mode, list) {
  const bySubject = new Map()
  for (const lesson of list) {
    const who = mode === 'teacher' ? `Class ${lesson.classroom}` : lesson.teacher
    const names = bySubject.get(lesson.subject) ?? []
    if (!names.includes(who)) names.push(who)
    bySubject.set(lesson.subject, names)
  }
  const stacked = bySubject.size > 1
  const lines = [...bySubject].map(([subject, names]) => ({
    text: stacked
      ? [
          { text: subject, bold: true },
          { text: ` · ${names.join(', ')}`, fontSize: 5.5 },
        ]
      : [
          { text: `${subject}\n`, bold: true, fontSize: 7.5 },
          { text: names.join(', '), fontSize: 6.5 },
        ],
    fontSize: stacked ? 6 : undefined,
    color: '#ffffff',
    margin: [0, 0, 0, stacked ? 1.5 : 0],
  }))
  const stream = list.find((lesson) => lesson.stream)?.stream
  return {
    stack: stream
      ? [{ text: stream, fontSize: 5.5, bold: true, color: '#ffffff' }, ...lines]
      : lines,
    // Parallel electives get one neutral fill rather than the first subject's colour
    fillColor: list.every((lesson) => lesson.subject === list[0].subject)
      ? list[0].color
      : '#4a6570',
  }
}
