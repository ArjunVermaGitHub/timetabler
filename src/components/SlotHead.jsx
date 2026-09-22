/** Column header for a period, break, or fixed (e.g. Self Study) slot. */
export function SlotHead({ slot }) {
  const isBlocked = slot.kind === 'break' || slot.kind === 'fixed'
  const headClass =
    slot.kind === 'fixed'
      ? 'slot-head is-fixed'
      : slot.kind === 'break'
        ? 'slot-head is-break'
        : 'slot-head'

  return (
    <th className={headClass}>
      {isBlocked ? (
        <span className="slot-time is-stacked">
          <span>{slot.start}</span>
          <span>{slot.end}</span>
        </span>
      ) : (
        <span className="slot-time">
          {slot.start}–{slot.end}
        </span>
      )}
      <span className="slot-label">{slot.label}</span>
    </th>
  )
}
