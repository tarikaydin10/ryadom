import { useEffect, useRef, useState } from 'react';
import { DAY_MS } from './day';

/**
 * Winding time, shared by every screen that has a sky.
 *
 * The band on Today and the map both let a drag carry the moment away from now
 * and a tap bring it back. It is one gesture, so it is one piece of state: the
 * same limit, the same clamp, the same way home. Two copies of this had already
 * started to drift when the map arrived.
 *
 * Coming back to now is a journey, not a jump. Snapping cuts from one sky to
 * another and loses the one thing worth seeing — the light running back across
 * both cities. So it winds: longer for a longer way, never long enough to become
 * a wait. A reader who has asked not to be moved gets the jump instead.
 */
export interface Scrub {
  /** Null while time is live; a moment while a drag holds it. */
  scrubMs: number | null;
  /** What to draw: the held moment, or now. */
  shownMs: number;
  scrubTo(ms: number): void;
  backToNow(wind: boolean): void;
}

/**
 * How far the sky can be wound. Sun and moon are arithmetic and would happily go
 * anywhere; the weather reaches seven days, and past a fortnight this stops
 * being a gesture and starts being a date picker.
 */
export const SCRUB_LIMIT_MS = 14 * DAY_MS;

export function useScrub(now: number, limitMs: number = SCRUB_LIMIT_MS): Scrub {
  const [scrubMs, setScrubMs] = useState<number | null>(null);
  const rewind = useRef<number | null>(null);

  const cancelRewind = () => {
    if (rewind.current !== null) cancelAnimationFrame(rewind.current);
    rewind.current = null;
  };

  useEffect(() => cancelRewind, []);

  const scrubTo = (ms: number) => {
    cancelRewind();
    setScrubMs(Math.min(now + limitMs, Math.max(now - limitMs, ms)));
  };

  const backToNow = (wind: boolean) => {
    cancelRewind();
    const from = scrubMs;
    if (from === null) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // The rail catches at now on its own, within about half an hour of it.
    // Winding back from there would be a journey of nine pixels, which is not a
    // journey — it is a stutter.
    if (!wind || reduced) {
      setScrubMs(null);
      return;
    }

    const started = performance.now();
    const distance = Math.abs(Date.now() - from);
    // A few hours winds back briskly; a fortnight takes a breath longer.
    const duration = Math.min(3500, 1000 + (distance / DAY_MS) * 500);
    const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

    const step = (frame: number) => {
      const progress = Math.min(1, (frame - started) / duration);
      // Aimed at the live clock, not a frozen one, so it lands on now rather
      // than on where now was when the finger lifted.
      setScrubMs(from + (Date.now() - from) * ease(progress));
      if (progress < 1) {
        rewind.current = requestAnimationFrame(step);
        return;
      }
      rewind.current = null;
      setScrubMs(null);
    };
    rewind.current = requestAnimationFrame(step);
  };

  return { scrubMs, shownMs: scrubMs ?? now, scrubTo, backToNow };
}
