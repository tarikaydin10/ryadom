import {
  answerId,
  enqueue,
  getAnswer,
  getAnswers,
  getQuestions,
  getRounds,
  putAnswer,
  type AnswerRecord,
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
  const described = new Map(rounds.map((round) => [round.slot, round]));

  const slots = new Set<number>([0, ...rounds.map((round) => round.slot), ...answers.map((answer) => answer.slot)]);
  return [...slots]
    .sort((left, right) => left - right)
    .map((slot) => {
      const round = described.get(slot);
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
    });
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
