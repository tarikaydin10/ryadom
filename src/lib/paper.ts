import { useEffect, useSyncExternalStore } from 'react';
import { rowAt } from '../sky/engine';
import type { CityId } from '../content/cities';

/**
 * When the paper dims: after civil dusk in the city this phone is in, until
 * civil dawn — the sun six degrees under the horizon, which is when the lamps
 * go on. Taken from the same engine that draws the band, so the page and the
 * sky agree about what time it is.
 *
 * A device preference, not a shared one: whether to read on dark paper at
 * night is a fact about the eyes holding this phone. Kept in localStorage
 * like the language, so the first frame is already right.
 */
export type PaperPreference = 'sun' | 'light';

const STORAGE_KEY = 'ryadom.paper';
const DUSK_DEG = -6;
const listeners = new Set<() => void>();

function read(): PaperPreference {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'sun';
  } catch {
    return 'sun';
  }
}

export function setPaperPreference(next: PaperPreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Not remembering the choice is survivable; ignoring the tap is not.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePaperPreference(): PaperPreference {
  return useSyncExternalStore(subscribe, read, () => 'sun');
}

/** Whether it is night, for the paper's purposes, in a city at a moment. */
export const isDuskIn = (city: CityId, now: number): boolean => rowAt(now).alt[city] < DUSK_DEG;

/**
 * Keeps the root element's `data-night` in step with the sun and the
 * preference. `now` ticks on the minute, which is as often as dusk needs.
 */
export function useNightPaper(city: CityId, now: number): void {
  const preference = usePaperPreference();
  useEffect(() => {
    const night = preference === 'sun' && isDuskIn(city, now);
    if (night) document.documentElement.dataset.night = '';
    else delete document.documentElement.dataset.night;
  }, [preference, city, now]);
}
