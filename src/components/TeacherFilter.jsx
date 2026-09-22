import { useId, useState } from 'react'
import { TEACHERS } from '../data/mockLessons'
import { Checkbox } from './Checkbox'

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

export function TeacherFilter({ selected, onChange }) {
  const panelId = useId()
  const [open, setOpen] = useState(false)

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

  return (
    <div className="filter-accordion">
      <div className="filter-accordion-bar">
        <button
          type="button"
          className="filter-accordion-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="filter-accordion-chevron" aria-hidden="true">
            {open ? '▾' : '▸'}
          </span>
          <span className="filter-accordion-title">Teachers</span>
          <span className="filter-accordion-summary">
            {summaryLabel(selected, allSelected, noneSelected)}
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
      </div>
      {open ? (
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
    </div>
  )
}
