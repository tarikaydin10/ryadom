import { useCallback, useEffect, useState } from 'react';
import { SkyBand } from '../components/SkyBand';
import { TimeRail } from '../components/TimeRail';
import { QuestionBlock } from '../components/QuestionBlock';
import { AnswerPair } from '../components/AnswerPair';
import { CountdownCard } from '../components/CountdownCard';
import { useI18n } from '../i18n';
import { useNow, useOnline, useSyncStatus, useWeather } from '../lib/hooks';
import { useSettings } from '../data/settings-context';
import { BAND_ORDER } from '../content/cities';
import { rowAt, skyDay, statusFor } from '../sky/engine';
import { dateKey } from '../lib/day';
import { useScrub, SCRUB_LIMIT_MS } from '../lib/scrub';
import { questionFor } from '../content/questions';
import { MAX_ROUNDS, promptAuthor } from '../content/prompt';
import { displayName, sidesFor } from '../data/settings';
import { getPair } from '../data/pair';
import { loadDay, saveMyAnswer, type RoundView } from '../data/answers';

import { subscribeSync } from '../data/sync';

/**
 * The day before the local store has answered, and on a device that has never
 * reached a server: the question of the day, derived from the date, with two
 * empty cards under it. Anything asynchronous here would show a blank block
 * for a frame or two on every launch, and the block is the page.
 */
const openingRound = (date: string): RoundView[] => [
  {
    slot: 0,
    prompt: { kind: 'bundled', question: questionFor(date, 0) },
    mine: null,
    theirs: null,
    partnerAnswered: false,
    partnerAt: null,
  },
];

interface Props {
  /**
   * The way to the questions you write yourselves. It is a tab away, and a tab
   * called "Chronicle" is not where anybody looks for it — the wish to ask
   * something arrives here, under the question that just came.
   */
  onAsk(): void;
}

export function Today({ onAsk }: Props) {
  const { t, locale } = useI18n();
  const { settings } = useSettings();
  const now = useNow();
  const online = useOnline();
  const weather = useWeather();
  const sync = useSyncStatus();

  const { scrubMs, shownMs, scrubTo, backToNow } = useScrub(now);
  const [rounds, setRounds] = useState<RoundView[]>(() => openingRound(dateKey(now)));
  const [saving, setSaving] = useState(false);

  const today = dateKey(now);

  const refresh = useCallback(() => {
    void loadDay(today).then(setRounds);
  }, [today]);

  // Midnight: the day starts again from its own first question rather than
  // leaving yesterday's answers on the screen until the store has answered.
  useEffect(() => setRounds(openingRound(today)), [today]);
  useEffect(refresh, [refresh]);
  // Whatever the courier brings in — their answer, an acknowledgement — shows up
  // without the user doing anything.
  useEffect(() => subscribeSync(() => refresh()), [refresh]);

  const table = skyDay(shownMs);
  const row = rowAt(shownMs);

  const member = getPair()?.member ?? 'a';
  const sides = sidesFor(member, settings);
  const yourCity = sides.yours;
  const partnerName = displayName(sides.partnerName, locale);



  // Stable across renders, so winding the sky does not re-render the answers.
  // Which round is being written into travels as an argument rather than in a
  // closure, for the same reason.
  const onSave = useCallback(
    (slot: number, questionId: string, text: string) => {
      setSaving(true);
      void saveMyAnswer(today, slot, questionId, text)
        .then(refresh)
        .finally(() => setSaving(false));
    },
    [today, refresh],
  );

  /**
   * Who asked. Nothing at all for a question out of the table — it is the app
   * asking, which needs no announcing — and a name for one of your own, because
   * whose question it is is most of what makes it different.
   */
  const byline = (round: RoundView): string | null => {
    const author = promptAuthor(round.prompt);
    if (author === null) return null;
    return author === member ? t('question.askedByYou') : t('question.askedBy', { name: partnerName });
  };

  const last = rounds[rounds.length - 1];
  /**
   * You have written, they have not, and the day could still hold another
   * question. That is the one moment where nothing visibly happens and the
   * reason is invisible — so it is said out loud, once, in place.
   */
  const waitingForNext = rounds.length < MAX_ROUNDS && Boolean(last?.mine) && !(last?.partnerAnswered ?? false);
  // The day is full: three rounds, and the last one closed. Said once, quietly,
  // so that "nothing more today" is a fact on the page rather than the absence
  // of one.
  const closed = rounds.length >= MAX_ROUNDS && Boolean(last?.mine) && (last?.partnerAnswered ?? false);

  const netline = (): string | null => {
    if (!online) return t('net.offline');
    if (sync.state === 'disabled') return null;
    if (sync.state === 'error') return t('net.syncFailed');
    if (sync.pending > 0) return t('settings.pendingItems', { count: sync.pending });
    return null;
  };

  const line = netline();

  return (
    <div className="screen-scroll">
      <SkyBand
        row={row}
        day={table}
        ms={shownMs}
        leftCity={BAND_ORDER.left}
        rightCity={BAND_ORDER.right}
        weather={weather}
        onScrubTo={scrubTo}
      />

      <TimeRail
        now={now}
        ms={shownMs}
        live={scrubMs === null}
        limitMs={SCRUB_LIMIT_MS}
        onScrubTo={scrubTo}
        onNow={backToNow}
      />

      <div className={`status ${scrubMs !== null ? 'status--preview' : ''}`}>
        <span className="status__text">{t(`sky.status.${statusFor(row, yourCity)}`)}</span>
      </div>

      {line && <div className="netline">{line}</div>}

      <div className="content">
        {/* The question and the two answers are one thing and are kept in one
            region — the kicker titles it, the band holds it. The reunion is a
            different subject and stays outside, on bare paper.

            A day is several of those now, oldest first, so the page reads
            downward the way the day went: what was asked this morning and what
            you both said, and at the bottom the one still open. */}
        <section className="daily" aria-label={t('question.kickerPlain')}>
          {rounds.map((round) => (
            <div className="round" key={round.slot}>
              <QuestionBlock
                prompt={round.prompt}
                kicker={round.slot === 0 ? t('question.kickerPlain') : t('question.kickerMore')}
                byline={byline(round)}
              />
              <AnswerPair round={round} partnerName={partnerName} saving={saving} onSave={onSave} />
            </div>
          ))}
          {waitingForNext && <p className="daily__closed">{t('question.nextWhenBoth')}</p>}
          {closed && <p className="daily__closed">{t('question.dayFull')}</p>}
          <button className="daily__ask" onClick={onAsk}>
            {t('question.askSomething')}
          </button>
        </section>

        <CountdownCard />
      </div>
    </div>
  );
}
