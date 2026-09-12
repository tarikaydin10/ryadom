import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useSettings } from '../data/settings-context';
import { getPair } from '../data/pair';
import { displayName, sidesFor } from '../data/settings';
import { loadHistory, saveMyAnswer, type DayHistory, type RoundView } from '../data/answers';
import { subscribeSync } from '../data/sync';
import { promptId, promptLines } from '../content/prompt';
import { QuestionPool } from '../components/QuestionPool';
import { Reaction } from '../components/Reaction';
import { RoundTalk } from '../components/RoundTalk';
import { react } from '../data/talk';
import { dateInRecord, dayAndMonth, longDate } from '../lib/format';
import { DAY_MS, dateKey, dateKeyToMs } from '../lib/day';
import { seeded } from '../lib/random';
import { useNow } from '../lib/hooks';

/** How far back a day has to be before it is worth finding again. */
const FIND_AFTER_DAYS = 7;

/**
 * Counts worth a line of their own. Not a streak — a number that only grows,
 * and these are the places where it is briefly a name.
 */
const MILESTONES = new Set([10, 25, 50, 100, 200, 365, 500, 1000]);

interface Finished {
  date: string;
  round: RoundView;
}

/**
 * The rounds both of you finished, newest first, out of the record.
 *
 * What the count counts. A round one of you missed is not in it, and nothing
 * ever leaves it: a quiet week changes the number by nothing, which is the
 * difference between this and a streak. Ask the two of them which one they
 * would rather have on the screen after a bad week.
 */
const finishedRounds = (history: DayHistory[]): Finished[] =>
  history.flatMap((day) => day.rounds.filter((round) => round.mine && round.theirs).map((round) => ({ date: day.date, round })));

/**
 * One round from the past, found again — the same one all day, on both phones.
 *
 * Chosen from the date rather than at random: the two of them can talk about
 * it, and a page that showed a different memory on every visit would be a
 * slot machine. Nothing younger than a week — a week is already far enough
 * for a sentence to have been forgotten and to be a small pleasure to meet.
 */
function findAgain(finished: Finished[], today: string): Finished | null {
  const cutoff = dateKey(dateKeyToMs(today) - FIND_AFTER_DAYS * DAY_MS);
  const candidates = finished.filter((entry) => entry.date <= cutoff);
  if (candidates.length === 0) return null;
  const roll = seeded(Math.floor(dateKeyToMs(today) / DAY_MS))();
  return candidates[Math.floor(roll * candidates.length)] ?? null;
}

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
  const { t, tp, locale, other } = useI18n();
  const { settings } = useSettings();
  const [history, setHistory] = useState<DayHistory[]>([]);
  const now = useNow();

  const member = getPair()?.member ?? 'a';
  const sides = sidesFor(member, settings);
  const partnerName = displayName(sides.partnerName, locale);
  const yourName = displayName(sides.yourName, locale);

  // Stable, because the afterword under a round hands it back as "something was
  // written, read the day again" — from an effect, where a callback rebuilt on
  // every render would keep the screen reloading itself.
  const refresh = useCallback(() => void loadHistory().then(setHistory), []);
  useEffect(refresh, [refresh]);
  useEffect(() => subscribeSync(() => refresh()), [refresh]);

  const save = (date: string, round: RoundView, text: string) =>
    saveMyAnswer(date, round.slot, promptId(round.prompt), text).then(refresh);

  const onReact = (date: string, round: RoundView, emoji: string) => void react(date, round.slot, emoji).then(refresh);

  /** "written later, on …" — when the answer's day is not the question's day. */
  const lateLine = (date: string, at: number | null) =>
    at !== null && dateKey(at) > date ? (
      <span className="chron__late">{t('chronicle.late', { date: dayAndMonth(at, locale) })}</span>
    ) : null;

  const finished = finishedRounds(history);
  const count = finished.length;
  const first = finished[finished.length - 1]?.date ?? null;
  const found = findAgain(finished, dateKey(now));

  return (
    <div className="screen">
      <h1 className="screen__title">{t('tabs.chronicle')}</h1>
      {history.length === 0 && <p className="screen__note">{t('chronicle.empty')}</p>}

      {/* What the two of you have: the rounds both of you finished, as one
          number that only ever grows, and the day it started counting. Set
          large because it is the one figure in the app that is allowed to be
          proud of itself — nothing about it can be lost by missing a day. */}
      {count > 0 && first && (
        <div className="tally">
          <span className="tally__number">{count}</span>
          <span className="tally__unit">
            {MILESTONES.has(count) && <span className="tally__mark">{t('chronicle.milestone')}</span>}
            {tp('chronicle.count', count)}
            <span className="tally__since">{t('chronicle.since', { date: dateInRecord(dateKeyToMs(first), locale, now) })}</span>
          </span>
        </div>
      )}

      {/* One finished round from at least a week ago, found again — the same
          one all day, on both phones. */}
      {found && <FoundAgain entry={found} yourName={yourName} partnerName={partnerName} />}

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
                    {/* Their mark on what you wrote, kept with the words it was
                        put on — the record holds it the way the day did. */}
                    {round.talk.theirs && (
                      <span className="chron__mark">
                        <Reaction mark={round.talk.theirs} ownership="theirs" partnerName={partnerName} />
                      </span>
                    )}
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
                    {/* Yours, and still yours to give: a page from August can be
                        read for the first time in December, and the mark then is
                        as true as one put on the day. */}
                    {round.mine && (
                      <span className="chron__mark">
                        <Reaction
                          mark={round.talk.mine}
                          ownership="yours"
                          onPick={(emoji) => onReact(day.date, round, emoji)}
                        />
                      </span>
                    )}
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
                {round.mine && round.theirs && (
                  <RoundTalk
                    date={day.date}
                    slot={round.slot}
                    talk={round.talk}
                    yourName={yourName}
                    partnerName={partnerName}
                    tone="quiet"
                    onWritten={refresh}
                  />
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

interface FoundProps {
  entry: Finished;
  yourName: string;
  partnerName: string;
}

/**
 * A memory, set the way the record sets a day, in a card so that it reads as
 * something put in front of you rather than as the first entry of the list.
 */
function FoundAgain({ entry, yourName, partnerName }: FoundProps) {
  const { t, locale, other } = useI18n();
  const lines = promptLines(entry.round.prompt, locale, other);
  return (
    <section className="find" aria-label={t('chronicle.found')}>
      <span className="find__kicker">{t('chronicle.foundKicker', { date: dateInRecord(dateKeyToMs(entry.date), locale) })}</span>
      <p className="chron__question" lang={lines.primary.lang}>
        {lines.primary.text}
      </p>
      <p className="chron__said">
        <span className="chron__who">{yourName}</span>
        {entry.round.mine?.text}
      </p>
      <p className="chron__said">
        <span className="chron__who">{partnerName}</span>
        {entry.round.theirs?.text}
      </p>
    </section>
  );
}
