/**
 * "Which day is it?" — answered once, for both people.
 *
 * Hamburg and Kaliningrad are one or two hours apart depending on the season, so
 * a naive local date would put the two phones on different questions for a couple
 * of hours every evening, and the two answers would never meet. The pair therefore
 * shares one canonical timezone for day boundaries. Everything the two of them
 * hold in common — the question of the day, the answer keys, the day counter — is
 * keyed by this. Clocks and sunsets stay strictly local; only the calendar is shared.
 */
export const PAIR_TIMEZONE = 'Europe/Berlin';

/**
 * The shared day turns at four in the morning, not at midnight.
 *
 * Nobody writes at four. Plenty of people write at half past midnight, and for
 * them it is still the same evening — the day they are answering a question
 * about. With the boundary at midnight, one of you writing at 23:50 and the
 * other at 00:10 landed on two different questions, and the first answer sat
 * unread until somebody went back for it. Four o'clock is the hotel's day, the
 * diary's day: it ends when the night does. For Kaliningrad that is five or
 * six; equally empty.
 *
 * Only the calendar shifts. Clocks, sunrises and the sky stay on real time.
 */
export const DAY_START_HOUR = 4;
const DAY_SHIFT_MS = DAY_START_HOUR * 60 * 60 * 1000;

const keyFormatters = new Map<string, Intl.DateTimeFormat>();

function keyFormatter(tz: string): Intl.DateTimeFormat {
  let fmt = keyFormatters.get(tz);
  if (!fmt) {
    // en-CA renders as YYYY-MM-DD, which is the key format we want anyway.
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    keyFormatters.set(tz, fmt);
  }
  return fmt;
}

/** `YYYY-MM-DD` in the pair's shared timezone. */
export function dateKey(ms: number = Date.now(), tz: string = PAIR_TIMEZONE): string {
  return keyFormatter(tz).format(new Date(ms - DAY_SHIFT_MS));
}

/** Midday UTC of a date key — a safe instant for date arithmetic. */
export function dateKeyToMs(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12);
}

export const DAY_MS = 24 * 60 * 60 * 1000;

const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

/** How far a zone is from UTC at a given instant, in milliseconds. */
function zoneOffset(ms: number, tz: string): number {
  let fmt = offsetFormatters.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'longOffset' });
    offsetFormatters.set(tz, fmt);
  }
  const name = fmt.formatToParts(new Date(ms)).find((part) => part.type === 'timeZoneName')?.value;
  const match = name ? /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name) : null;
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0)) * 60 * 1000;
}

/**
 * The instant a calendar day begins — the boundary itself, not a key for it.
 *
 * `dateKey` answers "which day is this?"; the time rail has to draw the line
 * where one day becomes the next, which is a moment. Computed from the zone's
 * offset rather than from the device's own clock, so a phone in Kaliningrad
 * marks the same midnight as a phone in Hamburg — the pair share one calendar,
 * and a boundary drawn an hour apart on the two phones would be a different
 * day's question on each.
 *
 * Asked twice: the first answer uses the offset in force before the boundary,
 * which is the wrong one on the two nights a year when the clocks change.
 */
export function startOfPairDay(ms: number, tz: string = PAIR_TIMEZONE): number {
  // Four hours after the calendar midnight the shifted moment falls in. On the
  // two nights a year the clocks change this can be an hour off four; nobody
  // is writing then either.
  return startOfCalendarDay(ms - DAY_SHIFT_MS, tz) + DAY_SHIFT_MS;
}

function startOfCalendarDay(ms: number, tz: string): number {
  const guess = zoneOffset(ms, tz);
  const start = Math.floor((ms + guess) / DAY_MS) * DAY_MS - guess;
  const settled = zoneOffset(start, tz);
  if (settled === guess) return start;
  return Math.floor((ms + settled) / DAY_MS) * DAY_MS - settled;
}

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((dateKeyToMs(toKey) - dateKeyToMs(fromKey)) / DAY_MS);
}

/** 1 on the start date itself, as a human would count it. */
export function dayNumber(startKey: string, todayKey: string): number {
  return daysBetween(startKey, todayKey) + 1;
}

export function isValidDateKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(dateKeyToMs(key));
}
