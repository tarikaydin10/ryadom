import { useState } from 'react';
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

/**
 * One mark at the foot of an answer card.
 *
 * It sits on the card it is about — your mark under their answer, theirs under
 * yours — which is the arrangement every messenger uses and the only one that
 * does not need a label to be understood.
 *
 * There is exactly one per person per round. A second tap opens the six again
 * and picking the one that is already there takes it back, which is the gesture
 * this control has everywhere else and therefore the only one worth having
 * here. The six are a closed list (see `REACTIONS`): an emoji keyboard would
 * turn one tap into a search, and this is meant to cost nothing.
 *
 * Nothing is drawn on an open round. The screens do not render this before both
 * of you have answered — a mark on an answer somebody has not read yet is a
 * word about it, and the lock-in says no.
 */
export function Reaction({ mark, ownership, partnerName, onPick }: Props) {
  const { t } = useI18n();
  const [picking, setPicking] = useState(false);

  if (ownership === 'theirs') {
    if (!mark) return null;
    return (
      <span className="mark mark--theirs" role="img" aria-label={t('talk.from', { name: partnerName ?? '' })}>
        {mark.emoji}
      </span>
    );
  }

  const pick = (emoji: string) => {
    setPicking(false);
    // The one that is already there means "take it back".
    onPick?.(emoji === mark?.emoji ? '' : emoji);
  };

  if (picking) {
    return (
      <span className="mark__row" role="group" aria-label={t('talk.pick')}>
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
    );
  }

  return (
    <button
      className={mark ? 'mark mark--mine' : 'mark mark--empty'}
      onClick={() => setPicking(true)}
      aria-label={mark ? t('talk.change') : t('talk.react')}
    >
      {mark ? <span aria-hidden="true">{mark.emoji}</span> : <span aria-hidden="true">+</span>}
    </button>
  );
}
