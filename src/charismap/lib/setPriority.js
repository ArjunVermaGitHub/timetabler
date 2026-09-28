/**
 * Interaction priority, keep in sync with `Set` schema `priority.enum` and API validation.
 * `SET_PRIORITY_VALUES` array order = highest urgency first (API default sort).
 * Chip styling lives in `src/app/components/InteractionChips/InteractionChips.module.scss` (`.chipPriority<Value>` classes).
 */

export const SET_PRIORITY_VALUES = Object.freeze(['high', 'medium', 'low']);

/** Numeric rank for table sort: low → medium → high when ascending (sortOrder 1). */
export const SET_PRIORITY_SORT_RANK = Object.freeze({
  low: 0,
  medium: 1,
  high: 2,
});

for (const value of SET_PRIORITY_VALUES) {
  if (SET_PRIORITY_SORT_RANK[value] === undefined) {
    throw new Error(
      `[setPriority] SET_PRIORITY_SORT_RANK missing "${value}". Add rank when changing SET_PRIORITY_VALUES.`,
    );
  }
}
