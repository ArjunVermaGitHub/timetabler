import { CLASSROOMS } from '../data/schedule'
import { Checkbox } from './Checkbox'

function inClassroomOrder(ids) {
  const selected = new Set(ids)
  return CLASSROOMS.filter((id) => selected.has(id))
}

export function ClassroomFilter({ selected, onChange }) {
  const allSelected =
    CLASSROOMS.length > 0 && selected.length === CLASSROOMS.length
  const noneSelected = selected.length === 0
  const partial = !allSelected && !noneSelected

  function toggleAll(checked) {
    onChange(checked ? [...CLASSROOMS] : [])
  }

  function toggle(classroom, checked) {
    if (checked) {
      onChange(inClassroomOrder([...selected, classroom]))
      return
    }
    onChange(inClassroomOrder(selected.filter((id) => id !== classroom)))
  }

  return (
    <div className="filter-row" role="group" aria-label="Classes">
      <Checkbox
        id="filter-class-all"
        label="All classes"
        checked={allSelected}
        indeterminate={partial}
        onChange={toggleAll}
        className="is-all"
      />
      {CLASSROOMS.map((classroom) => (
        <Checkbox
          key={classroom}
          id={`filter-class-${classroom}`}
          label={classroom}
          checked={selected.includes(classroom)}
          onChange={(checked) => toggle(classroom, checked)}
        />
      ))}
    </div>
  )
}
