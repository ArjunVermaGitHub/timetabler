/**
 * Checkbox inspired by charismap's Checkbox —
 * label row with native input + text, selected border/fill state.
 */
export function Checkbox({
  id,
  label,
  checked,
  onChange,
  disabled = false,
  indeterminate = false,
  className = '',
}) {
  function handleChange(event) {
    onChange?.(event.target.checked, event)
  }

  return (
    <label
      className={[
        'filter-check',
        checked || indeterminate ? 'is-checked' : '',
        disabled ? 'is-disabled' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      htmlFor={id}
    >
      <input
        id={id}
        type="checkbox"
        className="filter-check-input"
        checked={checked}
        disabled={disabled}
        ref={(node) => {
          if (node) node.indeterminate = Boolean(indeterminate)
        }}
        onChange={handleChange}
      />
      <span className="filter-check-text">{label}</span>
    </label>
  )
}
