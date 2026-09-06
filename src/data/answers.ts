import {
  answerId,
  enqueue,
  getAllAnswers,
  getAllRounds,
  getAnswer,
  getAnswers,
  getQuestions,
  getRounds,
  putAnswer,
  type AnswerRecord,
  type QuestionRecord,
  type RoundRecord,
} from './db';
import { syncNow } from './sync';
import { syncEnabled } from './api';
import { promptFor, type Prompt } from '../content/prompt';

/** One round of a day, with everything the screen needs to draw it. */
export interface RoundView {
  slot: number;
  prompt: Prompt;
  mine: AnswerRecord | null;
  theirs: AnswerRecord | null;
  /** That they wrote, which is known long before what they wrote. */
  partnerAnswered: boolean;
  partnerAt: number | null;
}

/** A day as it will be remembered: its rounds, in the order they were asked. */
export interface DayHistory {
  date: string;
  rounds: RoundView[];
}

/**
 * Turn what is stored into what is shown.
 *
 * `withEmpty` is the difference between the two readers of this. Today needs
 * the open round even when nobody has written in it yet — that is the whole
 * point of the screen. The chronicle does not: a round nobody answered is not a
 * memory, it is an empty chair.
 */
function viewsFor(
  date: string,
  described: RoundRecord[],
  answers: AnswerRecord[],
  pool: Map<string, QuestionRecord>,
  withEmpty: boolean,
): RoundView[] {
  const bySlot = new Map(described.map((round) => [round.slot, round]));
  const slots = new Set<number>([
    ...(withEmpty ? [0] : []),
    ...described.map((round) => round.slot),
    ...answers.map((answer) => answer.slot),
  ]);

  return [...slots]
    .sort((left, right) => left - right)
    .map((slot) => {
      const round = bySlot.get(slot);
      const mine = answers.find((answer) => answer.slot === slot && answer.author === 'me') ?? null;
      const theirs = answers.find((answer) => answer.slot === slot && answer.author === 'them') ?? null;
      return {
        slot,
        prompt: promptFor(date, slot, round?.question ?? { kind: 'bundled' }, pool),
        mine,
        theirs,
        partnerAnswered: round?.answered ?? theirs !== null,
        partnerAt: theirs?.createdAt ?? round?.answeredAt ?? null,
      };
    })
    .filter((view) => withEmpty || view.mine !== null || view.theirs !== null);
}

/**
 * The day as rounds, oldest first.
 *
 * Round 0 is always in the list even when nothing has ever been synced: it is
 * the question of the day, it is derived from the date, and a phone that has
 * not seen a server in a week can still be answered. Every further round is
 * there because the server said so — it opens one when both of you have
 * answered the round before, which is knowledge only it has.
 */
export async function loadDay(date: string): Promise<RoundView[]> {
  const [rounds, answers, questions] = await Promise.all([getRounds(date), getAnswers(date), getQuestions()]);
  const pool = new Map(questions.map((question) => [question.id, question]));
  return viewsFor(date, rounds, answers, pool, true);
}

/**
 * Every day this device has kept, newest first.
 *
 * Reads the local store only; the courier keeps it complete by pulling every
 * day that changed on the server since its last look (`pullHistory`). Offline,
 * the chronicle shows what the device has, which after one sync is all of it.
 */
export async function loadHistory(): Promise<DayHistory[]> {
  const [rounds, answers, questions] = await Promise.all([getAllRounds(), getAllAnswers(), getQuestions()]);
  const pool = new Map(questions.map((question) => [question.id, question]));

  const dates = [...new Set(answers.map((answer) => answer.date))].sort().reverse();
  return dates
    .map((date) => ({
      date,
      rounds: viewsFor(
        date,
        rounds.filter((round) => round.date === date),
        answers.filter((answer) => answer.date === date),
        pool,
        false,
      ),
    }))
    .filter((day) => day.rounds.length > 0);
}

/**
 * Write locally, then tell the courier. The UI updates from the local write and
 * never waits for the network — that is the whole point of the arrangement.
 */
export async function saveMyAnswer(
  date: string,
  slot: number,
  questionId: string,
  text: string,
): Promise<AnswerRecord> {
  const trimmed = text.trim();
  const now = Date.now();
  const existing = await getAnswer(date, slot, 'me');
  const record: AnswerRecord = {
    id: answerId(date, slot, 'me'),
    date,
    slot,
    questionId,
    author: 'me',
    text: trimmed,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    syncedAt: null,
  };
  await putAnswer(record);
  await enqueue({
    kind: 'answer',
    date,
    slot,
    payload: { text: trimmed, questionId, updatedAt: now },
    queuedAt: now,
    attempts: 0,
    lastError: null,
  });
  if (syncEnabled()) void syncNow([date]).catch(() => undefined);
  return record;
}
