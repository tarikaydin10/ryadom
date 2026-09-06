import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useSettings } from '../data/settings-context';
import { getPair } from '../data/pair';
import { displayName, sidesFor } from '../data/settings';
import { loadHistory, saveMyAnswer, type DayHistory, type RoundView } from '../data/answers';
import { subscribeSync } from '../data/sync';
import { promptId, promptLines } from '../content/prompt';
import { QuestionPool } from '../components/QuestionPool';
import { dayAndMonth, longDate } from '../lib/format';
import { dateKey, dateKeyToMs } from '../lib/day';

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
 * A record you can still write into. A round you missed shows a line to write
 * now: your answer takes the round's date, their text comes unlocked exactly as
 * it would have on the day, and the chronicle says under it that it was
 * written later. No deadline — a page from August is still worth finishing in
 * December — and no new round: the day is over, writing late buys reading, not
 * going on (the server enforces that; see `openRounds`).
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

  const save = (date: string, round: RoundView, text: string) =>
    saveMyAnswer(date, round.slot, promptId(round.prompt), text).then(refresh);

  /** "written later, on …" — when the answer's day is not the question's day. */
  const lateLine = (date: string, at: number | null) =>
    at !== null && dateKey(at) > date ? (
      <span className="chron__late">{t('chronicle.late', { date: dayAndMonth(at, locale) })}</span>
    ) : null;

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
                {round.mine ? (
                  <p className="chron__said">
                    <span className="chron__who">{yourName}</span>
                    {round.mine.text}
                    {lateLine(day.date, round.mine.createdAt)}
                  </p>
                ) : (
                  <LateAnswer
                    label={yourName}
                    prompt={t(round.partnerAnswered ? 'chronicle.writeLate' : 'chronicle.writeLateAlone')}
                    onSave={(text) => save(day.date, round, text)}
                  />
                )}
                {round.theirs ? (
                  <p className="chron__said">
                    <span className="chron__who">{partnerName}</span>
                    {round.theirs.text}
                    {lateLine(day.date, round.theirs.createdAt)}
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

interface LateProps {
  label: string;
  prompt: string;
  onSave(text: string): Promise<void>;
}

/**
 * Your missing answer, as a line you can open.
 *
 * Closed, it reads like the other lines on the page — a name and a sentence —
 * but in the colour every control in the app uses, so it is the one thing on a
 * page of quotes that can be touched. Open, it is the same editor as on Today:
 * the words go where the quote will be.
 */
function LateAnswer({ label, prompt, onSave }: LateProps) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const editor = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) editor.current?.focus();
  }, [editing]);

  const commit = () => {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    void onSave(text).finally(() => {
      setSaving(false);
      setEditing(false);
      setDraft('');
    });
  };

  if (!editing) {
    return (
      <button className="chron__said chron__write" onClick={() => setEditing(true)}>
        <span className="chron__who">{label}</span>
        <span className="answer__prompt">{prompt}</span>
      </button>
    );
  }

  return (
    <div className="chron__said chron__editing">
      <span className="chron__who">{label}</span>
      <textarea
        ref={editor}
        className="answer__editor"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={t('answer.placeholder')}
        aria-label={label}
      />
      <div className="answer__actions">
        <button className="button" onClick={commit} disabled={saving || draft.trim().length === 0}>
          {t('answer.send')}
        </button>
        <button className="button button--ghost" onClick={() => setEditing(false)}>
          {t('answer.cancel')}
        </button>
      </div>
    </div>
  );
}
