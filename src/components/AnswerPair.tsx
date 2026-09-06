import { memo, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { clock } from '../lib/format';
import { promptId } from '../content/prompt';
import { PAIR_TIMEZONE } from '../lib/day';
import type { RoundView } from '../data/answers';
import type { AnswerRecord } from '../data/db';

interface Props {
  round: RoundView;
  partnerName: string;
  saving: boolean;
  /**
   * Stable across renders, and told which round it is writing into rather than
   * closing over it — a fresh closure per round would re-render every card on
   * every frame of a scrub, which is the one thing the page below the band must
   * not do.
   */
  onSave(slot: number, questionId: string, text: string): void;
}

interface TheirsProps {
  theirs: AnswerRecord | null;
  partnerAnswered: boolean;
  partnerName: string;
  partnerAt: number | null;
}

/**
 * Her side, which is a card you read rather than one you touch.
 *
 * That is the whole of its affordance and it is deliberate: nothing here invites
 * a tap, because there is nothing here to do. The only way to open it is to
 * write on your own side, and the pair of cards says so by looking like an open
 * page next to a closed one.
 */
function TheirAnswer({ theirs, partnerAnswered, partnerName, partnerAt }: TheirsProps) {
  const { t, locale } = useI18n();

  return (
    <div className="answer answer--theirs">
      <span className="answer__label">
        {partnerName}
        {partnerAt !== null ? ` · ${clock(partnerAt, PAIR_TIMEZONE, locale)}` : ''}
      </span>

      {theirs ? (
        <p className="answer__text">{theirs.text}</p>
      ) : partnerAnswered ? (
        <>
          <span className="answer__bar" aria-hidden="true" />
          <span className="answer__bar answer__bar--short" aria-hidden="true" />
        </>
      ) : (
        <span className="answer__placeholder">{t('answer.notYet')}</span>
      )}

      <div className="answer__spacer" />
      {!theirs && <span className="answer__foot">{partnerAnswered ? t('answer.hidden') : t('answer.waiting')}</span>}
    </div>
  );
}

/**
 * The lock-in: their answer appears only once yours exists.
 *
 * The bars are empty elements, not their words behind a filter. The plaintext of
 * a locked answer is never delivered to this device — the server withholds it
 * (see `server/index.js`), so there is nothing here to reveal with a devtools
 * inspector. What is shown before unlocking is only what is fair to show: that
 * they wrote, and when.
 */
export const AnswerPair = memo(function AnswerPair({ round, partnerName, saving, onSave }: Props) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const editor = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) editor.current?.focus();
  }, [editing]);

  const { mine, theirs, partnerAnswered, partnerAt } = round;
  const their = { theirs, partnerAnswered, partnerName, partnerAt };

  const beginEdit = () => {
    setDraft(mine?.text ?? '');
    setEditing(true);
  };

  const commit = () => {
    const text = draft.trim();
    if (!text) {
      setEditing(false);
      return;
    }
    onSave(round.slot, promptId(round.prompt), text);
    setEditing(false);
  };

  /**
   * Nothing written yet: the whole card is the way in.
   *
   * It used to be a card with a small button of placeholder text inside it. It
   * looked like a field but only the words were tappable, and a field you have
   * to hit exactly is not a field. As a button it is one target the size of the
   * thing being asked for, it takes a press like a control, and the caret in it
   * says the one thing no border can — that your words go here.
   */
  if (!mine && !editing) {
    return (
      <div className="answers">
        <button
          className={partnerAnswered ? 'answer answer--mine answer--empty answer--urgent' : 'answer answer--mine answer--empty'}
          onClick={beginEdit}
        >
          <span className="answer__label">{t('answer.you')}</span>
          <span className="answer__placeholder answer__prompt">
            {partnerAnswered ? t('answer.placeholderUrgent') : t('answer.placeholder')}
          </span>
        </button>
        <TheirAnswer {...their} />
      </div>
    );
  }

  return (
    <div className="answers">
      <div className="answer answer--mine">
        <span className="answer__label">{t('answer.you')}</span>

        {editing ? (
          <>
            <textarea
              ref={editor}
              className="answer__editor"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t('answer.placeholder')}
              aria-label={t('answer.you')}
            />
            <div className="answer__actions">
              <button className="button" onClick={commit} disabled={saving || draft.trim().length === 0}>
                {t('answer.send')}
              </button>
              <button className="button button--ghost" onClick={() => setEditing(false)}>
                {t('answer.cancel')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="answer__text">{mine!.text}</p>
            <div className="answer__spacer" />
            <button className="button button--ghost answer__edit" onClick={beginEdit}>
              {t('answer.edit')}
            </button>
            <span className="answer__foot">{mine!.syncedAt ? t('answer.synced') : t('answer.pending')}</span>
          </>
        )}
      </div>

      <TheirAnswer {...their} />
    </div>
  );
});
