import { useCallback, useEffect, useRef, useState } from 'react';
import { SkyBand } from '../components/SkyBand';
import { TimeRail } from '../components/TimeRail';
import { QuestionBlock } from '../components/QuestionBlock';
import { AnswerPair } from '../components/AnswerPair';
import { RoundDone } from '../components/RoundDone';
import { CountdownCard } from '../components/CountdownCard';
import { useI18n } from '../i18n';
import { useNow, useOnline, useSyncStatus, useWeather } from '../lib/hooks';
import { useSettings } from '../data/settings-context';
import { BAND_ORDER, CITIES } from '../content/cities';
import { rowAt, skyDay, statusFor } from '../sky/engine';
import { dateKey } from '../lib/day';
import { useScrub, SCRUB_LIMIT_MS } from '../lib/scrub';
import { questionFor } from '../content/questions';
import { MAX_ROUNDS, promptAuthor } from '../content/prompt';
import { displayName, sidesFor } from '../data/settings';
import { getPair } from '../data/pair';
import { loadDay, saveMyAnswer, type RoundView } from '../data/answers';
import { pruneDrafts } from '../data/drafts';

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
  // Whether `rounds` is the store's word or the opening guess — see the scroll
  // effect below, which must not treat the first real answer as a round opening.
  const fromStore = useRef(false);

  const today = dateKey(now);

  const refresh = useCallback(() => {
    void loadDay(today).then((loaded) => {
      fromStore.current = true;
      setRounds(loaded);
    });
  }, [today]);

  // Four in the morning: the day starts again from its own first question
  // rather than leaving yesterday's answers on the screen until the store has
  // answered.
  useEffect(() => {
    fromStore.current = false;
    setRounds(openingRound(today));
    pruneDrafts(today);
  }, [today]);
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
  const partnerTz = CITIES[sides.theirs].tz;

  // Finished rounds unfolded by a tap, by slot. Never folded again by the page:
  // see RoundDone.
  const [unfolded, setUnfolded] = useState<number[]>([]);
  const onOpen = useCallback((slot: number) => setUnfolded((slots) => [...slots, slot]), []);

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
  const lastClosed = Boolean(last?.mine) && (last?.partnerAnswered ?? false);
  /**
   * What the open round leads to, said in one line under it.
   *
   * "When does the next question come?" is the question this page cannot
   * answer by showing, because the answer is not a time — it is the other one
   * of you. It used to be said only once you had written and they had not,
   * which left the two commoner moments silent: a fresh question with nothing
   * under it, where nobody has been told that answering opens another; and
   * their answer waiting behind your empty card, where a tap buys more than the
   * card admits. So the line is there for as long as the round is open, and it
   * changes with whose move it is. The third round is the day's last, which is
   * worth knowing before rather than after. And once the day is full, it says
   * so — quietly, so "nothing more today" is a fact on the page rather than the
   * absence of one.
   */
  const footnote = (): string | null => {
    if (!last) return null;
    if (lastClosed) return rounds.length >= MAX_ROUNDS ? t('question.dayFull') : null;
    if (rounds.length >= MAX_ROUNDS) return t('question.lastOfDay');
    return last.partnerAnswered ? t('question.nextWhenYou') : t('question.nextWhenBoth');
  };

  /**
   * A round that opens while you are looking is shown, not merely appended.
   *
   * It opens under the round you both just finished, and that round — a
   * question in two languages and two answers — is a screen tall on a phone. So
   * the best moment of the day, her answer unlocked and a new question with it,
   * happened below the fold with nothing to say it had. This scrolls the new
   * round to the top once the page holds more rounds than it did a moment ago.
   * Only then: a launch that lands on an afternoon's third question stays where
   * every launch starts, with the sky, and the day is read downward from there.
   * `known` is null until the store has answered, so the first load — one
   * opening round becoming the day's real list — is not mistaken for news.
   */
  const daily = useRef<HTMLElement>(null);
  const known = useRef<number | null>(null);
  useEffect(() => {
    if (known.current !== null && rounds.length > known.current) {
      const opened = daily.current?.querySelectorAll<HTMLElement>('.round');
      opened?.[opened.length - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    known.current = fromStore.current ? rounds.length : null;
  }, [rounds]);

  const netline = (): string | null => {
    if (!online) return t('net.offline');
    if (sync.state === 'disabled') return null;
    if (sync.state === 'error') return t('net.syncFailed');
    if (sync.pending > 0) return t('settings.pendingItems', { count: sync.pending });
    return null;
  };

  const line = netline();
  const note = footnote();

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
            you both said, folded to the words once both of you have said them,
            and at the bottom, at full size, the one still open. */}
        <section className="daily" aria-label={t('question.kickerPlain')} ref={daily}>
          {rounds.map((round) =>
            round.mine && round.theirs && !unfolded.includes(round.slot) ? (
              <div className="round" key={round.slot}>
                <RoundDone round={round} partnerName={partnerName} onOpen={onOpen} />
              </div>
            ) : (
              <div className="round" key={round.slot}>
                <QuestionBlock
                  prompt={round.prompt}
                  kicker={round.slot === 0 ? t('question.kickerPlain') : t('question.kickerMore')}
                  byline={byline(round)}
                />
                <AnswerPair
                  round={round}
                  date={today}
                  partnerName={partnerName}
                  partnerTz={partnerTz}
                  saving={saving}
                  onSave={onSave}
                />
              </div>
            ),
          )}
          {note && <p className="daily__note">{note}</p>}
          <button className="daily__ask" onClick={onAsk}>
            {t('question.askSomething')}
          </button>
        </section>

        <CountdownCard />
      </div>
    </div>
  );
}
