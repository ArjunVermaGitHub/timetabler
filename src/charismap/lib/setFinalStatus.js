/** Shared enums for Set (interactions); keep model + UI + API + seed in sync. Chip styling lives in `src/app/components/InteractionChips/InteractionChips.module.scss` (`.chipStatus<Value>` classes). */

import { SET_PRIORITY_VALUES } from './setPriority.js';

/** Default for new sets, in play, not closed. Activity lives in priority + follow-up. */
export const SET_FINAL_STATUS_DEFAULT = 'open';

/**
 * Outcome-only statuses (5). Not activity: use priority, follow-up, lastContacted.
 */
export const SET_FINAL_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'exclusive', label: 'Girlfriend' },
  { value: 'casual', label: 'Casual' },
  { value: 'wishlist', label: 'Wish to Talk' },
  { value: 'friends', label: 'Friends' },
  { value: 'over', label: 'Over' },
];

export const SET_FINAL_STATUS_VALUES = SET_FINAL_STATUS_OPTIONS.map((o) => o.value);

/** Numeric rank for table sort: exclusive → casual → open → friends → over when ascending (sortOrder 1). */
export const SET_FINAL_STATUS_SORT_RANK = Object.freeze({
  exclusive: 0,
  casual: 1,
  open: 2,
  wishlist: 3,
  friends: 4,
  over: 5,
});

/** Pre–v2 values → canonical status (DB migration + read-time normalize). */
export const SET_FINAL_STATUS_LEGACY_MAP = Object.freeze({
  in_progress: 'open',
  on_hold: 'open',
  rejected: 'over',
  not_pursuing: 'over',
  ended: 'over',
});

export function normalizeFinalStatus(value) {
  if (value && SET_FINAL_STATUS_VALUES.includes(value)) return value;
  if (value && SET_FINAL_STATUS_LEGACY_MAP[value]) {
    return SET_FINAL_STATUS_LEGACY_MAP[value];
  }
  return SET_FINAL_STATUS_DEFAULT;
}

/** Terminal status, no follow-up urgency; always persisted as `low`. */
export function priorityForSave(finalStatus, priority) {
  if (normalizeFinalStatus(finalStatus) === 'over') return 'low';
  return SET_PRIORITY_VALUES.includes(priority) ? priority : 'medium';
}

for (const value of SET_FINAL_STATUS_VALUES) {
  if (SET_FINAL_STATUS_SORT_RANK[value] === undefined) {
    throw new Error(
      `[setFinalStatus] SET_FINAL_STATUS_SORT_RANK missing "${value}". Add rank when changing SET_FINAL_STATUS_OPTIONS.`,
    );
  }
}
