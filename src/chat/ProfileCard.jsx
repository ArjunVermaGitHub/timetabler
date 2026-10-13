import { useLayoutEffect, useRef, useState } from 'react'
import { CLASS_TEACHERS, UNSCHEDULED_LESSONS } from '../data/mockLessons'
import { lessonAtTeacher } from '../data/placement'
import { CLASSROOMS, baseSlotsForDay, fixedDutyFor } from '../data/schedule'

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const clock = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

function dutyAt(teacher, day, slotId, placements) {
  const hit = lessonAtTeacher(teacher, day, slotId, UNSCHEDULED_LESSONS, placements)
  if (hit) return { key: hit.lesson.id, label: `${hit.lesson.classroom} ${hit.lesson.subject}` }
  const fixed = fixedDutyFor(teacher, day, slotId)
  return fixed ? { key: `fixed-${slotId}`, label: `${fixed.classroom} ${fixed.label}` } : null
}

/** Where a teacher is at `date` by the timetable; null when nothing of theirs is scheduled. */
function whereNow(teacher, placements, date = new Date()) {
  const own = UNSCHEDULED_LESSONS.filter((l) => l.teacher === teacher)
  if (!own.some((l) => placements[l.id])) return null
  const day = WEEK[date.getDay()]
  if (day === 'Sun') return { busy: false, text: 'Off today' }
  const time = clock(date)
  const slots = baseSlotsForDay(day)
  const duties = slots.map((s) => dutyAt(teacher, day, s.id, placements))
  if (!duties.some(Boolean)) return { busy: false, text: 'No lessons today' }
  const now = slots.findIndex((s) => s.start <= time && time < s.end)
  if (now >= 0 && duties[now]) {
    let last = now
    while (duties[last + 1]?.key === duties[now].key) last += 1
    return { busy: true, text: `Teaching ${duties[now].label}`, detail: `until ${slots[last].end}` }
  }
  const next = slots.findIndex((s, i) => duties[i] && s.start >= time)
  if (next < 0) return { busy: false, text: 'Done teaching for today' }
  return {
    busy: false,
    text: time < slots[0].start ? `First lesson at ${slots[next].start}` : `Free until ${slots[next].start}`,
    detail: `then ${duties[next].label}`,
  }
}

/** Subjects, classes and class-teacher duties, in the timetable's own class order. */
function teaching(teacher) {
  const own = UNSCHEDULED_LESSONS.filter((l) => l.teacher === teacher)
  const order = (c) => {
    const i = CLASSROOMS.indexOf(c)
    return i < 0 ? Infinity : i
  }
  const byClass = (a, b) => order(a) - order(b)
  return {
    subjects: [...new Set(own.map((l) => l.subject))].sort((a, b) => a.localeCompare(b)),
    classes: [...new Set(own.map((l) => l.classroom))].sort(byClass),
    classTeacherOf: Object.entries(CLASS_TEACHERS)
      .filter(([, names]) => names.includes(teacher))
      .map(([c]) => c)
      .sort(byClass),
  }
}

const initials = (name) =>
  name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

const GAP = 8

/** Keeps the card on screen: below the anchor if it fits, otherwise above. */
function usePlacement(anchor) {
  const ref = useRef(null)
  const [style, setStyle] = useState({ visibility: 'hidden' })
  useLayoutEffect(() => {
    const card = ref.current
    if (!card) return
    const { width, height } = card.getBoundingClientRect()
    const left = Math.min(Math.max(anchor.left, GAP), window.innerWidth - width - GAP)
    const below = anchor.bottom + 6
    const top = below + height <= window.innerHeight - GAP ? below : Math.max(GAP, anchor.top - height - 6)
    setStyle({ left, top })
  }, [anchor])
  return [ref, style]
}

export function ProfileCard({
  person,
  isMe,
  canMessage,
  placements,
  anchor,
  onMessage,
  onTimetable,
  onClose,
  ...hover
}) {
  const [ref, style] = usePlacement(anchor)
  const [copied, setCopied] = useState(false)
  const status = person.teacher ? whereNow(person.teacher, placements) : null
  const work = person.teacher ? teaching(person.teacher) : null
  const roles = [person.teacher ? 'Teacher' : null, person.admin ? 'Admin' : null].filter(Boolean)
  const copy = () =>
    navigator.clipboard?.writeText(person.email).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  return (
    <div className="profile-card" role="dialog" aria-label={person.name} ref={ref} style={style} {...hover}>
      <div className="profile-card-head">
        <span className="profile-card-avatar" aria-hidden="true">
          {initials(person.name)}
        </span>
        <div className="profile-card-who">
          <strong>
            {person.name}
            {isMe ? <span className="profile-card-you"> (you)</span> : null}
          </strong>
          <span>{roles.join(' · ')}</span>
        </div>
        <button type="button" className="profile-card-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      {person.email ? (
        <div className="profile-card-email">
          <a href={`mailto:${person.email}`}>{person.email}</a>
          <button type="button" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      ) : null}
      {status ? (
        <p className={`profile-card-now${status.busy ? ' is-busy' : ''}`}>
          <span className="profile-card-dot" aria-hidden="true" />
          <span>
            <strong>{status.text}</strong>
            {status.detail ? ` ${status.detail}` : null}
          </span>
        </p>
      ) : null}
      {work && (work.subjects.length || work.classTeacherOf.length) ? (
        <dl className="profile-card-facts">
          {work.subjects.length ? (
            <>
              <dt>Teaches</dt>
              <dd>{work.subjects.join(', ')}</dd>
              <dt>Classes</dt>
              <dd>{work.classes.join(', ')}</dd>
            </>
          ) : null}
          {work.classTeacherOf.length ? (
            <>
              <dt>Class teacher</dt>
              <dd>{work.classTeacherOf.join(', ')}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
      {canMessage || person.teacher ? (
        <div className="profile-card-actions">
          {canMessage ? (
            <button type="button" className="chat-new-btn" onClick={onMessage}>
              Message
            </button>
          ) : null}
          {person.teacher ? (
            <button type="button" className="profile-card-link" onClick={onTimetable}>
              View timetable
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
