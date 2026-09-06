/**
 * The viewport, watched — and written down.
 *
 * Two jobs in one file because they are the same subject. `healViewport` tries
 * to give the screen back to iOS after the keyboard (ADR-0010); `measure` and
 * `healLog` are what tell us, afterwards, whether it even tried. The bug has
 * now survived two rounds of fixing, and every round was fought with a picture
 * of a phone and a hypothesis. This is the part that was missing: numbers, from
 * the device, at the moment it is wrong (TD-05).
 *
 * Nothing here changes layout. It reads, and it remembers what it read.
 */

export interface HealEntry {
  at: number;
  /** What woke it: the visual viewport resizing, or something losing focus. */
  why: 'resize' | 'focusout';
  innerWidth: number;
  innerHeight: number;
  visualHeight: number;
  scale: number;
  keyboard: boolean;
  short: boolean;
  /** Whether the root was actually hidden for a frame. */
  healed: boolean;
}

/**
 * The last dozen decisions. In memory only: the interesting state is the one
 * the running app is in, and a state that survived a restart is a different
 * bug — the viewport heals itself when the app is force-quit.
 */
const log: HealEntry[] = [];
const LOG_LIMIT = 12;

export const healLog = (): HealEntry[] => [...log];

const isStandalone = (): boolean => window.matchMedia('(display-mode: standalone)').matches;

/** Whether the layout viewport is shorter than the screen it sits on. */
function shortBy(): number {
  const scale = window.visualViewport?.scale ?? 1;
  const viewport = Math.max(window.innerWidth, window.innerHeight) * scale;
  const screen = Math.max(window.screen.width, window.screen.height);
  return screen - viewport;
}

const keyboardUp = (): boolean => {
  const visual = window.visualViewport;
  return visual !== null && visual !== undefined && visual.height < window.innerHeight - 80;
};

/**
 * Give the screen back to iOS after the keyboard.
 *
 * In a home-screen app the first keyboard takes the top inset off the layout
 * viewport — 62pt on a Dynamic Island phone — and iOS does not put it back
 * when the keyboard goes. The viewport stays that much shorter than the screen
 * until the app is force-quit, and everything measured against it (dvh, a
 * sticky tab bar) stops that far above the bottom edge, with bare background
 * beneath. No meta tag prevents it; a scrolling document does not either.
 *
 * What works is making iOS measure again: hide the root for one frame and show
 * it. Done only when the viewport really is shorter than the screen — in
 * standalone with viewport-fit=cover the two are the same height — so a page
 * that never lost anything never blinks.
 *
 * Watched through the visual viewport, not through focus. The keyboard's own
 * dismiss key leaves the field focused, and a field that unmounts (the
 * passphrase, on unlock) never blurs at all — neither would have fired. The
 * visual viewport resizes whenever the keyboard comes or goes; the check runs
 * once it has been still for a moment, and never while the keyboard is up.
 */
export function healViewport(): void {
  if (!isStandalone()) return;

  const heal = (why: HealEntry['why']) => {
    const keyboard = keyboardUp();
    const deficit = shortBy();
    // More than two pixels: a fractional viewport on a zoomed page is not a
    // missing inset.
    const short = deficit > 2;
    const root = document.getElementById('root');
    const healed = !keyboard && short && root !== null;

    log.push({
      at: Date.now(),
      why,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      visualHeight: Math.round(window.visualViewport?.height ?? 0),
      scale: window.visualViewport?.scale ?? 1,
      keyboard,
      short,
      healed,
    });
    if (log.length > LOG_LIMIT) log.shift();

    if (!healed || !root) return;
    const y = window.scrollY;
    root.style.display = 'none';
    void root.offsetHeight;
    root.style.display = '';
    window.scrollTo(0, y);
  };

  let pending = 0;
  const settle = (why: HealEntry['why']) => {
    window.clearTimeout(pending);
    pending = window.setTimeout(() => heal(why), 300);
  };
  window.visualViewport?.addEventListener('resize', () => settle('resize'));
  document.addEventListener('focusout', () => settle('focusout'));
}

/**
 * The safe-area insets as actual numbers.
 *
 * A custom property computes to the token that was written, not to the pixels
 * it resolves to, so `--safe-top` says "env(safe-area-inset-top, 0px)" and not
 * "62px". A throwaway element with that padding is the only way to read what
 * the phone is really reserving.
 */
function insets(): string {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:absolute;visibility:hidden;pointer-events:none;' +
    'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const value = [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft]
    .map((side) => Math.round(parseFloat(side)))
    .join(' / ');
  probe.remove();
  return value;
}

/**
 * Everything worth knowing about the viewport right now, as label and value.
 *
 * Flat strings rather than a nested object, because the point of this is to be
 * read on a phone and pasted into a message.
 */
export function measure(): [string, string][] {
  const visual = window.visualViewport;
  const bar = document.querySelector('.tabs')?.getBoundingClientRect() ?? null;
  const deficit = Math.round(shortBy());

  return [
    ['mode', isStandalone() ? 'standalone' : 'browser'],
    ['inner', `${window.innerWidth} × ${window.innerHeight}`],
    ['visual', visual ? `${Math.round(visual.width)} × ${Math.round(visual.height)}` : '—'],
    ['scale', (visual?.scale ?? 1).toFixed(3)],
    ['offset', visual ? `${Math.round(visual.offsetTop)} / ${Math.round(visual.pageTop)}` : '—'],
    ['screen', `${window.screen.width} × ${window.screen.height}`],
    ['dpr', String(window.devicePixelRatio)],
    ['safe t/r/b/l', insets()],
    // The symptom itself, in one number: how far the bottom of the tab bar is
    // from the bottom of the layout viewport. Zero is right.
    ['bar gap', bar ? String(Math.round(window.innerHeight - bar.bottom)) : '—'],
    ['short by', String(deficit)],
    ['keyboard', keyboardUp() ? 'up' : 'down'],
    ['ua', navigator.userAgent],
  ];
}

/** The measurement and the log as one block of text, ready to be pasted. */
export function report(): string {
  const time = (at: number) => new Date(at).toISOString().slice(11, 19);
  const lines = measure().map(([label, value]) => `${label}: ${value}`);
  lines.push('heal:');
  if (log.length === 0) lines.push('  (never ran)');
  for (const entry of healLog()) {
    lines.push(
      `  ${time(entry.at)} ${entry.why} inner=${entry.innerWidth}×${entry.innerHeight} ` +
        `vis=${entry.visualHeight} scale=${entry.scale.toFixed(2)} ` +
        `kbd=${entry.keyboard ? 'up' : 'down'} short=${entry.short} healed=${entry.healed}`,
    );
  }
  return lines.join('\n');
}
