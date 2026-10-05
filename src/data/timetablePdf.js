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
import { CLASS_TEACHERS, SUBJECT_ABBR, TEACHER_ABBR } from './mockLessons'

pdfMake.addVirtualFileSystem(vfs)

const THEMES = {
  colour: {
    ink: '#3b2418',
    soft: '#8a6a55',
    title: '#1a6b66',
    headFill: '#1a6b66',
    headInk: '#e8fffa',
    breakFill: '#f3d9a4',
    breakInk: '#5a3a08',
    emptyFill: '#f7ede4',
    grid: '#e2cdbd',
    lessonInk: '#ffffff',
    zebra: null,
  },
  // Print-friendly: no fills except a light zebra on alternate day rows
  mono: {
    ink: '#000000',
    soft: '#444444',
    title: '#000000',
    headFill: null,
    headInk: '#000000',
    breakFill: null,
    breakInk: '#444444',
    emptyFill: null,
    grid: '#8a8a8a',
    lessonInk: '#000000',
    zebra: '#efefef',
  },
}

/**
 * Downloads the grids currently on screen as a PDF: one landscape A4 page per
 * class (or teacher), weekdays then Saturday, built from the same placements.
 */
export function downloadTimetablePdf(options) {
  const { definition, fileName } = buildTimetableDoc(options)
  pdfMake.createPdf(definition).download(fileName)
}

export function buildTimetableDoc({
  mode,
  groups,
  lessons,
  placements,
  colour = true,
  abbreviate = true,
}) {
  const theme = colour ? THEMES.colour : THEMES.mono
  const pages = groups.map((group, index) => {
    const ctx = {
      theme,
      mode,
      group,
      lessons,
      placements,
      abbreviate,
      used: { subjects: new Map(), teachers: new Map() },
    }
    const weekdays = weekTable(ctx, DAYS)
    const saturday = weekTable(ctx, WEEKEND_DAYS)
    return {
      stack: [
        schoolTitle(),
        pageHeader(mode, group),
        weekdays,
        {
          unbreakable: true,
          stack: [
            { text: 'Saturday', style: 'section', margin: [0, 12, 0, 4] },
            saturday,
            ...abbreviationKey(ctx),
          ],
        },
      ],
      pageBreak: index === 0 ? undefined : 'before',
    }
  })

  const stamp = new Date().toISOString().slice(0, 10)
  const scope =
    groups.length === 1 ? groups[0] : mode === 'teacher' ? 'teachers' : 'classes'
  const suffix = colour ? '' : '-bw'

  return {
    fileName: `timetable-${scope.replace(/\s+/g, '-').toLowerCase()}-${stamp}${suffix}.pdf`,
    definition: {
      info: { title: `Timetable · ${scope}` },
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [24, 24, 24, 30],
      defaultStyle: { font: 'Roboto', fontSize: 7, color: theme.ink },
      styles: {
        school: { fontSize: 11, bold: true, color: theme.title, characterSpacing: 1.2 },
        title: { fontSize: 15, bold: true, color: theme.title },
        meta: { fontSize: 8, color: theme.soft },
        section: { fontSize: 9, bold: true, color: theme.soft },
      },
      footer: (page, count) =>
        count > 1
          ? {
              text: `${page} / ${count}`,
              style: 'meta',
              alignment: 'right',
              margin: [24, 8, 24, 0],
            }
          : null,
      content: pages,
    },
  }
}

const SCHOOL_NAME = 'Rajghat Besant School'

function schoolTitle() {
  return {
    text: `${SCHOOL_NAME.toUpperCase()}  ·  TIMETABLE ${new Date().getFullYear()}`,
    style: 'school',
    alignment: 'center',
    margin: [0, 0, 0, 6],
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

function weekTable(ctx, days) {
  const { theme, mode, group } = ctx
  const slots =
    mode === 'teacher'
      ? slotsForTeacherDay(days[0])
      : slotsForClassroom(group, days[0])

  const header = [
    headCell(theme, 'Day'),
    ...slots.map((slot) =>
      headCell(theme, `${slot.label}\n${slot.start}–${slot.end}`, slot.kind !== 'period'),
    ),
  ]

  const body = days.map((day, row) => {
    const rowFill = theme.zebra && row % 2 === 1 ? theme.zebra : undefined
    return [
      {
        text: day,
        bold: true,
        color: theme.headInk,
        fillColor: theme.headFill ?? rowFill,
        alignment: 'center',
      },
      ...dayCells(ctx, rowFill, day, slots),
    ]
  })

  return {
    table: {
      headerRows: 1,
      dontBreakRows: true,
      widths: [30, ...slots.map((slot) => (slot.kind === 'period' ? '*' : 34))],
      heights: (row) => (row === 0 ? 20 : 46),
      body: [header, ...body],
    },
    layout: {
      hLineColor: () => theme.grid,
      vLineColor: () => theme.grid,
      hLineWidth: (line) => (line === 1 ? 1.2 : 0.6),
      vLineWidth: () => 0.6,
      paddingLeft: () => 3,
      paddingRight: () => 3,
      paddingTop: () => 3,
      paddingBottom: () => 3,
    },
  }
}

function headCell(theme, text, blocked = false) {
  return {
    text,
    bold: true,
    fontSize: 6.5,
    alignment: 'center',
    color: blocked ? theme.breakInk : theme.headInk,
    fillColor: (blocked ? theme.breakFill : theme.headFill) ?? undefined,
  }
}

/** Mirrors the on-screen grid: breaks, fixed sessions, doubles span two columns, electives share a cell. */
function dayCells(ctx, rowFill, day, slots) {
  const { theme, mode, group, lessons, placements } = ctx
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
        color: theme.breakInk,
        italics: true,
        fillColor: theme.breakFill ?? rowFill,
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
      cells.push({ text: '', fillColor: theme.emptyFill ?? rowFill })
      index += 1
      continue
    }

    const span = Math.min(
      Math.max(...starters.map((item) => item.lesson.span)),
      slots.length - index,
    )
    const cell = lessonCell(ctx, starters.map((item) => item.lesson))
    if (theme.zebra) cell.fillColor = rowFill
    cells.push({ ...cell, colSpan: span })
    for (let i = 1; i < span; i += 1) cells.push({})
    index += span
  }

  return cells
}

/** Teachers in a cell beyond this many are written as abbreviations. */
const MAX_FULL_NAMES = 2

function subjectAbbr(ctx, subject) {
  const abbr = SUBJECT_ABBR.get(subject) ?? subject
  if (abbr !== subject) ctx.used.subjects.set(abbr, subject)
  return abbr
}

function teacherAbbr(ctx, teacher) {
  const abbr = TEACHER_ABBR.get(teacher) ?? teacher
  if (abbr !== teacher) ctx.used.teachers.set(abbr, teacher)
  return abbr
}

/**
 * One subject with a couple of teachers reads in full. Parallel electives, or
 * a long list of co-teachers, collapse to abbreviations on a single line
 * ("ACC AB · BN SUB · PHY NT") explained by the key under the page.
 */
function lessonCell(ctx, list) {
  const { theme, mode } = ctx
  const bySubject = new Map()
  for (const lesson of list) {
    const names = bySubject.get(lesson.subject) ?? []
    const who = mode === 'teacher' ? lesson.classroom : lesson.teacher
    if (!names.includes(who)) names.push(who)
    bySubject.set(lesson.subject, names)
  }

  let lines
  if (bySubject.size > 1 && !ctx.abbreviate) {
    lines = [...bySubject].map(([subject, names]) => ({
      text: [
        { text: subject, bold: true },
        {
          text: ` · ${names.map((n) => (mode === 'teacher' ? `Class ${n}` : n)).join(', ')}`,
          fontSize: 5.5,
        },
      ],
      fontSize: 6,
      color: theme.lessonInk,
      margin: [0, 0, 0, 1.5],
    }))
  } else if (bySubject.size > 1) {
    const parts = [...bySubject].flatMap(([subject, names], i) => [
      ...(i ? [{ text: '  ·  ' }] : []),
      { text: subjectAbbr(ctx, subject), bold: true },
      {
        text: `\u00a0${names
          .map((name) => (mode === 'teacher' ? name : teacherAbbr(ctx, name)))
          .join(',\u00a0')}`,
      },
    ])
    lines = [{ text: parts, fontSize: 6.5, color: theme.lessonInk, lineHeight: 1.15 }]
  } else {
    const [[subject, names]] = bySubject
    const who =
      mode === 'teacher'
        ? `Class ${names.join(', ')}`
        : ctx.abbreviate && names.length > MAX_FULL_NAMES
          ? names.map((name) => teacherAbbr(ctx, name)).join(', ')
          : names.join(', ')
    lines = [
      {
        text: [
          { text: `${subject}\n`, bold: true, fontSize: 7.5 },
          { text: who, fontSize: 6.5 },
        ],
        color: theme.lessonInk,
      },
    ]
  }

  const stream = list.find((lesson) => lesson.stream)?.stream
  return {
    stack: stream
      ? [
          { text: stream, fontSize: 5.5, bold: true, color: theme.lessonInk, margin: [0, 0, 0, 1] },
          ...lines,
        ]
      : lines,
    // Parallel electives get one neutral fill rather than the first subject's colour
    fillColor: list.every((lesson) => lesson.subject === list[0].subject)
      ? list[0].color
      : '#4a6570',
  }
}

/** One wrapped line under each page spelling out every abbreviation used on it. */
function abbreviationKey(ctx) {
  const entries = (map) =>
    [...map]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([abbr, full]) => `${abbr} ${full}`)
      .join('  ·  ')
  const groups = [
    ['Subjects', entries(ctx.used.subjects)],
    ['Teachers', entries(ctx.used.teachers)],
  ].filter(([, text]) => text)
  if (groups.length === 0) return []
  return [
    {
      text: groups.flatMap(([label, text], i) => [
        { text: `${i ? '     ' : ''}${label}: `, bold: true, color: ctx.theme.soft },
        { text },
      ]),
      fontSize: 6.5,
      lineHeight: 1.2,
      margin: [0, 8, 0, 0],
    },
  ]
}
