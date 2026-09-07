import { loadDay } from './answers';
import { dateKey } from '../lib/day';

/**
 * The dot on the icon, and the one thing it means: it is your move.
 *
 * Push says that she wrote, once, and is gone with a swipe. The badge stays:
 * a phone on the table, an icon with a mark on it, and the mark means exactly
 * one thing — her answer is waiting behind your empty card. It clears the
 * moment that stops being true, which is the moment you write, and it never
 * counts anything else. Not days, not rounds, not questions of hers in the
 * pool: a number that grows is a number that nags, and this app does not.
 *
 * Costs nothing the phone does not already give: no permission beyond the one
 * the notifications asked for, no second host, and on a phone that cannot
 * badge — a browser tab, an older iOS — the calls are simply not there.
 */

type Badging = Navigator & {
  setAppBadge?(count?: number): Promise<void>;
  clearAppBadge?(): Promise<void>;
};

const badging = (): Badging | null => (typeof navigator === 'undefined' ? null : (navigator as Badging));

async function show(on: boolean): Promise<void> {
  const nav = badging();
  if (!nav?.setAppBadge || !nav.clearAppBadge) return;
  try {
    if (on) await nav.setAppBadge(1);
    else await nav.clearAppBadge();
  } catch {
    // A browser that lists the API and then refuses it. The icon stays as it
    // was, which is the worst that can happen here.
  }
}

/** Whether her answer to today's open round is waiting behind yours. */
export async function yourMove(now: number = Date.now()): Promise<boolean> {
  const rounds = await loadDay(dateKey(now));
  return rounds.some((round) => round.partnerAnswered && round.mine === null);
}

/**
 * Bring the icon in line with the store. Called after every sync and every
 * write, and once at launch — the worker may have set the badge on a push
 * while the app was closed, and a look at the app is what clears it.
 */
export async function refreshBadge(): Promise<void> {
  try {
    await show(await yourMove());
  } catch {
    // The store could not be read; leave the icon alone.
  }
}
