import { memo } from 'react';
import { useI18n } from '../i18n';
import { promptLines } from '../content/prompt';
import type { RoundView } from '../data/answers';

interface Props {
  /** A round both of you have answered — `mine` and `theirs` are both there. */
  round: RoundView;
  partnerName: string;
  /** Told which round, for the same reason `AnswerPair.onSave` is: one stable callback for all of them. */
  onOpen(slot: number): void;
}

/**
 * A finished round, folded to what was said.
 *
 * The open round is the page: a question in two languages and two cards is the
 * right size for the thing you are being asked. It is the wrong size for the
 * two things you already answered this morning — by the afternoon the question
 * that is actually open sat below two screens of finished ones, and the page
 * that is supposed to read downward the way the day went made you scroll past
 * the day to reach it. So a round both of you have answered is set the way the
 * chronicle sets it: the question in your language, and the two answers as
 * quotes. Everything is still there to read; nothing takes the room of a card.
 *
 * A tap unfolds it to the full pair, which is where the edit button lives. It
 * stays unfolded for the session — nobody folds a page back up by hand.
 */
export const RoundDone = memo(function RoundDone({ round, partnerName, onOpen }: Props) {
  const { t, tp, locale, other } = useI18n();
  const lines = promptLines(round.prompt, locale, other);
  const { talk } = round;
  const notes = talk.notes.length;

  return (
    <button className="round-done" onClick={() => onOpen(round.slot)}>
      <span className="round-done__question" lang={lines.primary.lang}>
        {lines.primary.text}
      </span>
      <span className="round-done__said">
        <span className="round-done__who">{t('answer.you')}</span>
        {round.mine?.text}
        {/* The marks travel with the quotes they belong to, as text among text.
            Nothing here is a control: the whole fold is one button, and a button
            inside a button is neither. Unfolding it is what opens the six. */}
        {talk.theirs && <span className="round-done__mark">{talk.theirs.emoji}</span>}
      </span>
      <span className="round-done__said">
        <span className="round-done__who">{partnerName}</span>
        {round.theirs?.text}
        {talk.mine && <span className="round-done__mark">{talk.mine.emoji}</span>}
      </span>
      {/* Said afterwards, and said here as a count: the fold is the shape of a
          finished round and stays it. A dot where something is new. */}
      {notes > 0 && (
        <span className="round-done__talk">
          {notes} {tp('talk.count', notes)}
          {talk.unseen > 0 && <span className="talk__new" aria-label={t('talk.new')} />}
        </span>
      )}
    </button>
  );
});
