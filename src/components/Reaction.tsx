import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { REACTIONS } from '../data/talk';
import type { Reaction as Mark } from '../data/db';

interface Props {
  mark: Mark | null;
  /** Whose mark this is: yours to give, or theirs to read. */
  ownership: 'yours' | 'theirs';
  /** The name behind a mark you did not make, so the card says who smiled. */
  partnerName?: string;
  /** Absent on a read-only mark. Called with '' to take one back. */
  onPick?(emoji: string): void;
}

/** A face with a plus at its shoulder: the sign every messenger uses for "react". */
function AddFace() {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true">
      <path
        d="M15.5 9.6A6.4 6.4 0 1 1 9.4 3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="7.3" cy="8.6" r="0.95" fill="currentColor" />
      <circle cx="11.3" cy="8.6" r="0.95" fill="currentColor" />
      <path d="M6.8 11.6c1.6 1.7 3.9 1.7 5.4 0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M15.6 1.8v4.4M13.4 4h4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/**
 * One mark at the foot of an answer card.
 *
 * It sits on the card it is about — your mark under their answer, theirs under
 * yours — which is the arrangement every messenger uses and the only one that
 * does not need a label to be understood.
 *
 * There is exactly one per person per round. A tap opens the six in a bar that
 * floats over the page, the way a tapback does, rather than inside the card: the
 * first version grew the card by two rows of buttons, and her answer jumped
 * down the page to make room for a choice about it. Picking the one already
 * there takes it back. The six are a closed list (see `REACTIONS`): an emoji
 * keyboard would turn one tap into a search, and this is meant to cost nothing.
 * The quickest way of all, a double tap on her words, lives on the card — see
 * `TheirAnswer`.
 *
 * Nothing is drawn on an open round. The screens do not render this before both
 * of you have answered — a mark on an answer somebody has not read yet is a
 * word about it, and the lock-in says no.
 */
export function Reaction({ mark, ownership, partnerName, onPick }: Props) {
  const { t } = useI18n();
  const [picking, setPicking] = useState(false);
  const holder = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);

  // The bar opens from the chip, but the chip can be anywhere: at the foot of
  // the right-hand card, or at the end of a quote in the record. Measured once
  // it is on screen and pushed back inside the page's column — the window on a
  // phone, the paper on a desk — so that the six are always all there to be
  // had. Measured from the chip and the bar's own width, not the bar's
  // rectangle: it opens with a scale, and a rectangle taken mid-animation is
  // too small.
  useLayoutEffect(() => {
    const element = bar.current;
    if (!picking || !element || !holder.current) return;
    const column = holder.current.closest('.app')?.getBoundingClientRect() ?? { left: 0, right: window.innerWidth };
    const left = holder.current.getBoundingClientRect().left + element.offsetLeft;
    const right = left + element.offsetWidth;
    const edge = 10;
    const shift = Math.max(column.left + edge - left, Math.min(0, column.right - edge - right));
    if (shift !== 0) element.style.translate = `${shift}px 0`;
  }, [picking]);

  // Anywhere else closes it — a choice not made is not a choice to keep asking.
  useEffect(() => {
    if (!picking) return;
    const away = (event: PointerEvent) => {
      if (!holder.current?.contains(event.target as Node)) setPicking(false);
    };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setPicking(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [picking]);

  if (ownership === 'theirs') {
    if (!mark) return null;
    return (
      // Keyed by the emoji, so a change arrives the way a new one does: with a pop.
      <span key={mark.emoji} className="mark mark--theirs" role="img" aria-label={t('talk.from', { name: partnerName ?? '' })}>
        {mark.emoji}
      </span>
    );
  }

  const pick = (emoji: string) => {
    setPicking(false);
    // The one that is already there means "take it back".
    onPick?.(emoji === mark?.emoji ? '' : emoji);
  };

  return (
    <span className="mark__holder" ref={holder}>
      <button
        key={mark?.emoji ?? ''}
        className={mark ? 'mark mark--mine' : 'mark mark--empty'}
        onClick={() => setPicking((open) => !open)}
        aria-label={mark ? t('talk.change') : t('talk.react')}
        aria-expanded={picking}
      >
        {mark ? <span aria-hidden="true">{mark.emoji}</span> : <AddFace />}
      </button>
      {picking && (
        <span className="mark__bar" ref={bar} role="group" aria-label={t('talk.pick')}>
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              className={emoji === mark?.emoji ? 'mark__pick mark__pick--on' : 'mark__pick'}
              onClick={() => pick(emoji)}
            >
              {emoji}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}
