import { kvGet, kvSet } from './db';
import type { CityId } from '../content/cities';
import { otherCity } from '../content/cities';
import type { PairMember } from './pair';
import type { Locale } from '../i18n';
import { dateKey, dateKeyToMs, isValidDateKey, startOfPairDay, wallClockToMs } from '../lib/day';
import { CITIES } from '../content/cities';
import { dayAndMonth } from '../lib/format';

/**
 * A name, optionally written twice.
 *
 * Names are never translated — but a name can legitimately have two spellings,
 * the way the app itself is both Ryadom and Рядом. Whichever spelling matches
 * the interface language is shown; if only one exists, that one is shown in both
 * languages. Both bundled fonts carry Latin and Cyrillic, so neither spelling
 * ever drops to a system fallback.
 */
export interface PersonName {
  latin: string;
  cyrillic: string;
}

export interface Settings {
  /** Who lives where. Keyed by city, not by "you" and "them". */
  names: Record<CityId, PersonName>;
  /**
   * The date, the city, and — optionally — the hour of arrival in that
   * city's own time. The hour is what lets the map move the traveller along
   * the line on the day, and what the card says once the day is close.
   */
  reunion: {
    date: string | null;
    city: CityId;
    time: string | null;
    /**
     * The day the date was set — the start of the wait. What the way there
     * is measured from: the dot on the line, on the card and on the map,
     * has come this far since then. Stamped by the card, never typed.
     */
    since: string | null;
  };
  /**
   * The days the two of you have: a birthday each and the day that counts as
   * yours. Full dates (`YYYY-MM-DD`), so the year is known when it matters;
   * only month and day decide when the sky's table asks about them (see
   * `src/content/occasions.ts` and `settle` in the server).
   */
  dates: { birthdays: Record<CityId, string | null>; anniversary: string | null };
  /**
   * When these were last edited, anywhere.
   *
   * Settings are shared: names and a reunion date belong to the two of you, not
   * to the device they were typed on. This is what lets the newer edit win when
   * two devices disagree.
   */
  updatedAt: number;
}

export const DEFAULT_SETTINGS: Settings = {
  names: {
    hamburg: { latin: 'Tarik', cyrillic: 'Тарик' },
    kaliningrad: { latin: 'Mila', cyrillic: 'Мила' },
  },
  reunion: { date: null, city: 'hamburg', time: null, since: null },
  dates: { birthdays: { hamburg: null, kaliningrad: null }, anniversary: null },
  updatedAt: 0,
};

/**
 * Which side of the sky this device is on.
 *
 * Deliberately *not* a setting. It follows from the side chosen at unlock, so it
 * cannot drift out of step with it — which is exactly what happened when it was
 * stored: unlocking a second time as the other city left the old side behind,
 * and the app showed you your own name as your partner's.
 */
export const cityOf = (member: PairMember): CityId => (member === 'a' ? 'hamburg' : 'kaliningrad');

export interface Sides {
  yours: CityId;
  theirs: CityId;
  yourName: PersonName;
  partnerName: PersonName;
}

export function sidesFor(member: PairMember, settings: Settings): Sides {
  const yours = cityOf(member);
  const theirs = otherCity(yours);
  return { yours, theirs, yourName: settings.names[yours], partnerName: settings.names[theirs] };
}

const KEY = 'settings';

/** The shape settings had before the side stopped being stored. */
interface LegacySettings {
  you?: { name?: Partial<PersonName>; city?: CityId };
  partner?: { name?: Partial<PersonName>; city?: CityId };
}

function migrate(stored: Partial<Settings> & LegacySettings): Settings {
  const names = { ...DEFAULT_SETTINGS.names };

  if (stored.names) {
    for (const id of ['hamburg', 'kaliningrad'] as CityId[]) {
      names[id] = { ...names[id], ...stored.names[id] };
    }
  } else if (stored.you?.city || stored.partner?.city) {
    // Old shape: two people with a city each. Names move to the city they had.
    for (const person of [stored.you, stored.partner]) {
      if (person?.city && person.name) names[person.city] = { ...names[person.city], ...person.name };
    }
  }

  return {
    names,
    reunion: {
      ...DEFAULT_SETTINGS.reunion,
      ...stored.reunion,
      time: validTime(stored.reunion?.time),
      since: validDate(stored.reunion?.since),
    },
    dates: {
      birthdays: {
        hamburg: validDate(stored.dates?.birthdays?.hamburg),
        kaliningrad: validDate(stored.dates?.birthdays?.kaliningrad),
      },
      anniversary: validDate(stored.dates?.anniversary),
    },
    updatedAt: stored.updatedAt ?? 0,
  };
}

/** "HH:MM" or nothing — the field is optional and older settings lack it. */
const validDate = (value: unknown): string | null => (typeof value === 'string' && isValidDateKey(value) ? value : null);
const validTime = (value: unknown): string | null => (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? value : null);

export async function loadSettings(): Promise<Settings> {
  const stored = await kvGet<Partial<Settings> & LegacySettings>(KEY);
  return stored ? migrate(stored) : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await kvSet(KEY, settings);
}

/** Fold a copy from the server in, but never over a newer local edit. */
export async function mergeRemoteSettings(remote: unknown, updatedAt: number): Promise<Settings | null> {
  if (!remote || typeof remote !== 'object') return null;
  const local = await loadSettings();
  if (local.updatedAt >= updatedAt) return null;
  const merged = migrate({ ...(remote as Partial<Settings>), updatedAt });
  await saveSettings(merged);
  return merged;
}

export function displayName(name: PersonName, locale: Locale): string {
  const preferred = locale === 'ru' ? name.cyrillic : name.latin;
  return preferred.trim() || name.latin.trim() || name.cyrillic.trim();
}

/** Days until the reunion, counted in the pair's shared calendar. */
export function daysUntil(target: string, now: number = Date.now()): number {
  const today = dateKey(now);
  const [ty, tm, td] = target.split('-').map(Number);
  const [ny, nm, nd] = today.split('-').map(Number);
  const a = Date.UTC(ty ?? 0, (tm ?? 1) - 1, td ?? 1);
  const b = Date.UTC(ny ?? 0, (nm ?? 1) - 1, nd ?? 1);
  return Math.round((a - b) / 86400000);
}

/**
 * The moment of the reunion, as an instant: the hour of arrival in the
 * reunion city's own time, or midday there when no hour is set. What the sky
 * is wound to on a tap, and where the way there ends.
 */
export function reunionMoment(reunion: Settings['reunion']): number | null {
  if (!reunion.date) return null;
  return wallClockToMs(reunion.date, reunion.time ?? '12:00', CITIES[reunion.city].tz);
}

/**
 * How far along the wait a moment is, from the day the date was set to the
 * hour of arrival: nought at the start, one on arrival, clamped beyond both.
 * Null without a date, or before the start has been stamped. The same
 * fraction moves the dot on the card and the traveller on the map, so the
 * two never disagree about how far it still is.
 */
export function reunionProgress(reunion: Settings['reunion'], ms: number): number | null {
  const end = reunionMoment(reunion);
  if (end === null || !reunion.since) return null;
  const start = startOfPairDay(dateKeyToMs(reunion.since));
  if (end <= start) return ms >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (ms - start) / (end - start)));
}

/**
 * The reunion as somewhere to go, for the rail: the moment, and the day as a
 * word — the date, or "tomorrow", or "today". Null once it has passed: a day
 * behind you is not a destination.
 */
export function reunionDestination(
  reunion: Settings['reunion'],
  locale: Locale,
  words: { today: string; tomorrow: string },
  now: number = Date.now(),
): { ms: number; label: string } | null {
  const ms = reunionMoment(reunion);
  if (ms === null || !reunion.date) return null;
  const days = daysUntil(reunion.date, now);
  if (days < 0) return null;
  const day = days === 0 ? words.today : days === 1 ? words.tomorrow : dayAndMonth(dateKeyToMs(reunion.date), locale);
  return { ms, label: `${day} →` };
}
