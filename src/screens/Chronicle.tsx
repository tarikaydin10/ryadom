import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { useSettings } from '../data/settings-context';
import { getPair } from '../data/pair';
import { displayName, sidesFor } from '../data/settings';
import { loadHistory, type DayHistory } from '../data/answers';
import { subscribeSync } from '../data/sync';
import { promptLines } from '../content/prompt';
import { QuestionPool } from '../components/QuestionPool';
import { longDate } from '../lib/format';
import { dateKeyToMs } from '../lib/day';

/**
 * What has been asked and answered, newest first.
 *
 * The tab has been called Chronicle since the first sketch and showed a
 * placeholder that said it would come later; then it briefly showed only the
 * questions you write yourselves, which was worse — a heading that promised a
 * record and delivered a form. This is the record.
 *
 * One language per question here, not two. On the home screen both are shown
 * because the two of you read the same screen together and the question is the
 * event; in a list of a hundred past days the second line is only noise. The
 * answers are quoted as they were written, in whatever language that was —
 * they are not translated anywhere, ever.
 *
 * Complete, not just what this phone was around for: the courier pulls every
 * day that changed since its last look (`pullHistory` in sync.ts), so a
 * reinstall or a second device shows the same record as the first. What stays
 * closed stays closed — the lock-in holds for the past as it does for today.
 */
export function Chronicle() {
  const { t, locale, other } = useI18n();
  const { settings } = useSettings();
  const [history, setHistory] = useState<DayHistory[]>([]);

  const member = getPair()?.member ?? 'a';
  const sides = sidesFor(member, settings);
  const partnerName = displayName(sides.partnerName, locale);
  const yourName = displayName(sides.yourName, locale);

  const refresh = () => void loadHistory().then(setHistory);
  useEffect(refresh, []);
  useEffect(() => subscribeSync(() => refresh()), []);

  return (
    <div className="screen">
      <h1 className="screen__title">{t('tabs.chronicle')}</h1>
      {history.length === 0 && <p className="screen__note">{t('chronicle.empty')}</p>}

      {history.map((day) => (
        <section className="chron" key={day.date}>
          <span className="chron__date">{longDate(dateKeyToMs(day.date), locale)}</span>
          {day.rounds.map((round) => {
            const lines = promptLines(round.prompt, locale, other);
            return (
              <div className="chron__round" key={round.slot}>
                <p className="chron__question" lang={lines.primary.lang}>
                  {lines.primary.text}
                </p>
                {round.mine && (
                  <p className="chron__said">
                    <span className="chron__who">{yourName}</span>
                    {round.mine.text}
                  </p>
                )}
                {round.theirs ? (
                  <p className="chron__said">
                    <span className="chron__who">{partnerName}</span>
                    {round.theirs.text}
                  </p>
                ) : (
                  // Their answer exists but is still locked behind your own, or
                  // they have not written. Both are worth saying — a gap with no
                  // explanation reads as something lost.
                  <p className="chron__said chron__said--pending">
                    <span className="chron__who">{partnerName}</span>
                    {round.partnerAnswered ? t('answer.hidden') : t('answer.notYet')}
                  </p>
                )}
              </div>
            );
          })}
        </section>
      ))}

      <QuestionPool />
    </div>
  );
}
