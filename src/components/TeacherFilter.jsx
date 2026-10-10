import { useId, useState } from 'react'
import { TEACHERS } from '../data/mockLessons'
import { DAYS, WEEKEND_DAYS, slotsForTeacherDay } from '../data/schedule'
import { Checkbox } from './Checkbox'

const FREE_DAYS = [...DAYS, ...WEEKEND_DAYS].map((day) => ({
  day,
  slots: slotsForTeacherDay(day).filter((slot) => slot.kind === 'period'),
}))

const shortTime = (time) => time.replace(/^0/, '')

export const freeSlotKey = (day, slotId) => `${day}|${slotId}`

function inTeacherOrder(ids) {
  const selected = new Set(ids)
  return TEACHERS.filter((id) => selected.has(id))
}

function summaryLabel(selected, allSelected, noneSelected) {
  if (allSelected) return `All ${TEACHERS.length} teachers`
  if (noneSelected) return 'No teachers selected'
  if (selected.length <= 2) return selected.join(', ')
  return `${selected.length} teachers selected`
}

function freeSummary(freeSlots) {
  if (freeSlots.length === 0) return 'Any time'
  if (freeSlots.length > 2) return `${freeSlots.length} slots`
  return FREE_DAYS.flatMap(({ day, slots }) =>
    slots
      .filter((slot) => freeSlots.includes(freeSlotKey(day, slot.id)))
      .map((slot) => `${day} ${shortTime(slot.start)}`),
  ).join(', ')
}

export function TeacherFilter({
  selected,
  onChange,
  freeSlots,
  onFreeSlotsChange,
  abbreviate,
  onAbbreviateChange,
}) {
  const panelId = useId()
  const freePanelId = useId()
  const [open, setOpen] = useState(null)

  const allSelected =
    TEACHERS.length > 0 && selected.length === TEACHERS.length
  const noneSelected = selected.length === 0
  const partial = !allSelected && !noneSelected

  function toggleAll(checked) {
    onChange(checked ? [...TEACHERS] : [])
  }

  function toggle(teacher, checked) {
    if (checked) {
      onChange(inTeacherOrder([...selected, teacher]))
      return
    }
    onChange(inTeacherOrder(selected.filter((id) => id !== teacher)))
  }

  function toggleFree(key) {
    onFreeSlotsChange(
      freeSlots.includes(key)
        ? freeSlots.filter((item) => item !== key)
        : [...freeSlots, key],
    )
  }

  const flip = (panel) => setOpen((value) => (value === panel ? null : panel))

  return (
    <div className="filter-accordion">
      <div className="filter-accordion-bar">
        <button
          type="button"
          className="filter-accordion-toggle"
          aria-expanded={open === 'teachers'}
          aria-controls={panelId}
          onClick={() => flip('teachers')}
        >
          <span className="filter-accordion-chevron" aria-hidden="true">
            {open === 'teachers' ? '▾' : '▸'}
          </span>
          <span className="filter-accordion-title">Teachers</span>
          <span className="filter-accordion-summary">
            {summaryLabel(selected, allSelected, noneSelected)}
          </span>
        </button>
        <button
          type="button"
          className={`filter-accordion-toggle is-free${freeSlots.length ? ' is-active' : ''}`}
          aria-expanded={open === 'free'}
          aria-controls={freePanelId}
          onClick={() => flip('free')}
        >
          <span className="filter-accordion-chevron" aria-hidden="true">
            {open === 'free' ? '▾' : '▸'}
          </span>
          <span className="filter-accordion-title">Free at</span>
          <span className="filter-accordion-summary">
            {freeSummary(freeSlots)}
          </span>
        </button>
        <Checkbox
          id="filter-teacher-all"
          label="All"
          checked={allSelected}
          indeterminate={partial}
          onChange={toggleAll}
          className="is-all filter-accordion-all"
        />
        <Checkbox
          id="filter-teacher-abbreviate"
          label="Use abbreviations"
          checked={abbreviate}
          onChange={onAbbreviateChange}
          className="is-abbreviate"
        />
      </div>
      {open === 'teachers' ? (
        <div
          id={panelId}
          className="filter-row is-accordion-panel"
          role="group"
          aria-label="Teachers"
        >
          {TEACHERS.map((teacher) => (
            <Checkbox
              key={teacher}
              id={`filter-teacher-${teacher.replace(/\s+/g, '-')}`}
              label={teacher}
              checked={selected.includes(teacher)}
              onChange={(checked) => toggle(teacher, checked)}
            />
          ))}
        </div>
      ) : null}
      {open === 'free' ? (
        <div
          id={freePanelId}
          className="free-picker"
          role="group"
          aria-label="Show teachers free at"
        >
          <p className="free-picker-hint">
            Pick one or more periods to show only teachers free in all of them.
          </p>
          {FREE_DAYS.map(({ day, slots }) => (
            <div key={day} className="free-picker-row">
              <span className="free-picker-day">{day}</span>
              {slots.map((slot) => {
                const key = freeSlotKey(day, slot.id)
                const on = freeSlots.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    className="free-picker-slot"
                    aria-pressed={on}
                    title={`${day} · ${slot.label} (${slot.start}–${slot.end})`}
                    onClick={() => toggleFree(key)}
                  >
                    {shortTime(slot.start)}
                  </button>
                )
              })}
            </div>
          ))}
          {freeSlots.length ? (
            <button
              type="button"
              className="free-picker-clear"
              onClick={() => onFreeSlotsChange([])}
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
