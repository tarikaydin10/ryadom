import { memo } from 'react';
import { useI18n } from '../i18n';
import { promptLines, type Prompt } from '../content/prompt';

interface Props {
  prompt: Prompt;
  /** What this round is: the day's question, or one more of them. */
  kicker: string;
  /** Who asked, when it was one of you and not the app. */
  byline: string | null;
}

/**
 * Both languages, always — where there are two.
 *
 * The design put two languages under each other on purpose: two people, two
 * mother tongues, one question. That survives the move from German/Russian to
 * English/Russian — the reader's language is the large line, the other one sits
 * under it. It is also what makes the screen work when the two of them are
 * looking at it together. A question one of you wrote has only the language it
 * was written in until somebody supplies the other, and then the original stays
 * on the screen underneath, because it is hers.
 *
 * Memoised, along with the rest of the page below the band: winding the sky
 * through a fortnight changes nothing here, and re-rendering it on every frame
 * of that gesture is what a scrub cannot afford.
 */
export const QuestionBlock = memo(function QuestionBlock({ prompt, kicker, byline }: Props) {
  const { t, locale, other } = useI18n();
  const lines = promptLines(prompt, locale, other);

  return (
    <div className="question">
      <span className="question__kicker">{kicker}</span>
      <span className="question__primary" lang={lines.primary.lang}>
        {lines.primary.text}
      </span>
      {lines.secondary && (
        <span className="question__secondary" lang={lines.secondary.lang}>
          {lines.secondary.text}
        </span>
      )}
      {(byline || lines.machine) && (
        <span className="question__byline">{[byline, lines.machine ? t('question.machine') : null].filter(Boolean).join(' · ')}</span>
      )}
    </div>
  );
});
