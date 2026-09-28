/**
 * Per-row follow-up reminders, keep in sync with `Set` schema and API validation.
 */

import { SURFACE_SEMANTIC_STRONG } from '@/app/constants/colors.constants.js';

export const FOLLOW_UP_CHANNEL_VALUES = Object.freeze(['call', 'text', 'ig']);

export const FOLLOW_UP_CHANNEL_OPTIONS = Object.freeze([
  { value: 'call', label: 'Call' },
  { value: 'text', label: 'Text' },
  { value: 'ig', label: 'Instagram DM' },
]);

export const FOLLOW_UP_CHANNEL_LABELS = Object.freeze({
  call: 'Call',
  text: 'Text',
  ig: 'IG',
});

function hashSeed(seed) {
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Stable pseudo-random reminder, ~50% of rows get a due time, rest cleared. */
export function sampleFollowUpForDemoRow(seed) {
  const h = hashSeed(seed);

  if (h % 2 === 0) {
    return { nextFollowUpAt: null, followUpChannel: null };
  }

  const channel = FOLLOW_UP_CHANNEL_VALUES[h % FOLLOW_UP_CHANNEL_VALUES.length];
  const bucket = h % 11;
  let at;

  if (bucket < 3) {
    const hoursAgo = (h % 96) + 1;
    at = new Date(Date.now() - hoursAgo * 3600000);
  } else if (bucket < 8) {
    const minutes = ((h % 47) + 1) * 15;
    at = new Date(Date.now() + minutes * 60 * 1000);
  } else {
    const days = (h % 12) + 2;
    at = new Date(Date.now() + days * 86400000);
    at.setHours(8 + (h % 10), (h % 4) * 15, 0, 0);
  }

  return { nextFollowUpAt: at, followUpChannel: channel };
}

/** Quick snooze offsets from “now” (hours). */
export const FOLLOW_UP_SNOOZE_PRESETS = Object.freeze([
  { id: '4h', label: '+4 hours', hours: 4 },
  { id: '1d', label: '+1 day', hours: 24 },
  { id: '3d', label: '+3 days', hours: 72 },
  { id: '1w', label: '+1 week', hours: 168 },
]);

/** Default due date when priority changes and no reminder is set yet. */
export function defaultNextFollowUpFromPriority(priority, from = new Date()) {
  const days =
    priority === 'high' ? 1 : priority === 'low' ? 7 : 3;
  const at = new Date(from);
  at.setDate(at.getDate() + days);
  at.setHours(10, 0, 0, 0);
  return at;
}

const MS_MIN = 60 * 1000;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;

function plural(n, unit) {
  return `${n}${unit}${n === 1 ? '' : 's'}`;
}

/**
 * Relative label + urgency tier for table chips.
 * @returns {{ label: string, tier: 'none'|'overdue'|'soon'|'later' }}
 */
export function formatFollowUpLabel(nextFollowUpAt, now = new Date()) {
  if (!nextFollowUpAt) {
    return { label: 'No reminder', tier: 'none' };
  }

  const at = new Date(nextFollowUpAt);
  if (Number.isNaN(at.getTime())) {
    return { label: 'No reminder', tier: 'none' };
  }

  const diffMs = at.getTime() - now.getTime();

  if (diffMs < 0) {
    const overdueMs = -diffMs;
    if (overdueMs < MS_HOUR) {
      const m = Math.max(1, Math.floor(overdueMs / MS_MIN));
      return { label: `Overdue ${plural(m, 'm')}`, tier: 'overdue' };
    }
    if (overdueMs < MS_DAY) {
      const h = Math.max(1, Math.floor(overdueMs / MS_HOUR));
      return { label: `Overdue ${plural(h, 'h')}`, tier: 'overdue' };
    }
    const d = Math.max(1, Math.floor(overdueMs / MS_DAY));
    return { label: `Overdue ${plural(d, 'd')}`, tier: 'overdue' };
  }

  if (diffMs < MS_HOUR) {
    const m = Math.max(1, Math.ceil(diffMs / MS_MIN));
    return { label: `Due in ${plural(m, 'm')}`, tier: 'soon' };
  }
  if (diffMs < MS_DAY) {
    const h = Math.max(1, Math.ceil(diffMs / MS_HOUR));
    return { label: `Due in ${plural(h, 'h')}`, tier: 'soon' };
  }
  if (diffMs < 2 * MS_DAY) {
    return { label: 'Due tomorrow', tier: 'later' };
  }
  const d = Math.ceil(diffMs / MS_DAY);
  return { label: `Due in ${plural(d, 'd')}`, tier: 'later' };
}

export function followUpChannelShort(channel) {
  if (!channel || !FOLLOW_UP_CHANNEL_VALUES.includes(channel)) return '';
  return FOLLOW_UP_CHANNEL_LABELS[channel] || '';
}

/** Compact table timer: `4h`, `2d`, or `Overdue` (no "Due in" prefix). */
export function formatFollowUpTimer(nextFollowUpAt, now = new Date()) {
  if (!nextFollowUpAt) return '-';

  const at = new Date(nextFollowUpAt);
  if (Number.isNaN(at.getTime())) return '-';

  const diffMs = at.getTime() - now.getTime();
  if (diffMs < 0) return 'Overdue';

  if (diffMs < MS_HOUR) {
    const m = Math.max(1, Math.ceil(diffMs / MS_MIN));
    return plural(m, 'm');
  }
  if (diffMs < MS_DAY) {
    const h = Math.max(1, Math.ceil(diffMs / MS_HOUR));
    return plural(h, 'h');
  }
  const d = Math.ceil(diffMs / MS_DAY);
  return plural(d, 'd');
}

/** Plain countdown for table cells (uses stored date or stable preview sample). */
export function getFollowUpDisplayText(set, index = 0, now = new Date()) {
  const seed =
    set?._id != null ? String(set._id) : `${set?.name ?? 'row'}:${index}`;
  let at = set?.nextFollowUpAt;

  if (!at) {
    const sample = sampleFollowUpForDemoRow(seed);
    at = sample.nextFollowUpAt;
  }

  return formatFollowUpTimer(at, now);
}

export function followUpSortTimestamp(nextFollowUpAt) {
  if (!nextFollowUpAt) return Number.POSITIVE_INFINITY;
  const t = new Date(nextFollowUpAt).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

export function addHoursToDate(date, hours) {
  return new Date(date.getTime() + hours * MS_HOUR);
}

export function combineDateAndTime(dateStr, timeStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  let hours = 10;
  let minutes = 0;
  if (timeStr && timeStr.includes(':')) {
    const [h, min] = timeStr.split(':').map(Number);
    if (!Number.isNaN(h)) hours = h;
    if (!Number.isNaN(min)) minutes = min;
  }
  const at = new Date(y, m - 1, d, hours, minutes, 0, 0);
  return Number.isNaN(at.getTime()) ? null : at;
}

export function splitFollowUpDateTime(isoOrDate) {
  if (!isoOrDate) return { date: '', time: '' };
  const at = new Date(isoOrDate);
  if (Number.isNaN(at.getTime())) return { date: '', time: '' };
  const date = at.toISOString().split('T')[0];
  const time = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

export const FOLLOW_UP_CHIP_STYLES = Object.freeze({
  none: Object.freeze({ bg: '#90a4ae', border: '#78909c' }),
  overdue: SURFACE_SEMANTIC_STRONG.red,
  soon: SURFACE_SEMANTIC_STRONG.orange,
  later: Object.freeze({ bg: '#546e7a', border: '#455a64' }),
});

for (const tier of ['none', 'overdue', 'soon', 'later']) {
  if (!FOLLOW_UP_CHIP_STYLES[tier]) {
    throw new Error(`[setFollowUp] FOLLOW_UP_CHIP_STYLES missing "${tier}".`);
  }
}
