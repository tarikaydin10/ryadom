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
  /**
   * Wind to a moment. A drag stays within the limit; a jump (`free`) may go
   * anywhere — the reunion is often more than a fortnight away, and it is
   * the one place beyond the limit worth going. Once there, the rail can be
   * dragged around that day: see `reachMs`.
   */
  scrubTo(ms: number, free?: boolean): void;
  /**
   * Travel to a moment rather than appear there: the sky runs forward
   * through the days between, the way it runs back on `backToNow`. For the
   * reunion — a jump to a day eleven days out that cut from one sky to
   * another lost the one thing worth seeing, which is the days passing.
   */
  windTo(ms: number): void;
  /** How far from now the rail may currently be dragged: the limit, or further if a jump went further. */
  reachMs: number;
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

  // A jump beyond the limit widens the reach to where it landed, plus a day
  // either side to look around in; it narrows again on the way back to now.
  const reachMs = scrubMs === null ? limitMs : Math.max(limitMs, Math.abs(scrubMs - now) + DAY_MS);

  const scrubTo = (ms: number, free = false) => {
    cancelRewind();
    setScrubMs(free ? ms : Math.min(now + reachMs, Math.max(now - reachMs, ms)));
  };

  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
  // A few hours winds briskly; a fortnight takes a breath longer; a month
  // or more is capped, because a wait is not something to sit through twice.
  const durationFor = (distance: number) => Math.min(4000, 1000 + (distance / DAY_MS) * 500);

  /**
   * Run the sky from where it is to a moment. `target` is asked for on every
   * frame — for now, which moves — and `land` is called on arrival.
   */
  const travel = (from: number, target: () => number, land: () => void) => {
    const started = performance.now();
    const duration = durationFor(Math.abs(target() - from));
    const step = (frame: number) => {
      const progress = Math.min(1, (frame - started) / duration);
      setScrubMs(from + (target() - from) * ease(progress));
      if (progress < 1) {
        rewind.current = requestAnimationFrame(step);
        return;
      }
      rewind.current = null;
      land();
    };
    rewind.current = requestAnimationFrame(step);
  };

  const backToNow = (wind: boolean) => {
    cancelRewind();
    const from = scrubMs;
    if (from === null) return;
    // The rail catches at now on its own, within about half an hour of it.
    // Winding back from there would be a journey of nine pixels, which is not a
    // journey — it is a stutter.
    if (!wind || reducedMotion()) {
      setScrubMs(null);
      return;
    }
    // Aimed at the live clock, not a frozen one, so it lands on now rather
    // than on where now was when the finger lifted.
    travel(from, () => Date.now(), () => setScrubMs(null));
  };

  const windTo = (ms: number) => {
    cancelRewind();
    if (reducedMotion()) {
      setScrubMs(ms);
      return;
    }
    travel(scrubMs ?? Date.now(), () => ms, () => setScrubMs(ms));
  };

  return { scrubMs, shownMs: scrubMs ?? now, scrubTo, windTo, reachMs, backToNow };
}
