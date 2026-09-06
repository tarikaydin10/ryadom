import { questionFor, questionText, type Question } from './questions';
import type { QuestionRecord, RoundQuestion, Side } from '../data/db';
import type { Locale } from '../i18n';

/**
 * What a round actually asks, once the two sources of questions are resolved.
 *
 * There are two, and they behave differently on purpose. A bundled question is
 * written in both languages and ships with the app, so it is always there and
 * always reads as your own tongue. One of yours is one sentence in one
 * language — because that is what somebody wrote — and may or may not have a
 * translation beside it yet.
 */
export type Prompt = { kind: 'bundled'; question: Question } | { kind: 'pool'; question: QuestionRecord };

/**
 * How many rounds a day can hold.
 *
 * The server owns this rule — it is the one that opens a round when both of you
 * have answered the last — and this copy exists only so the page can say "that
 * is the day" rather than leave somebody waiting for a fourth question that is
 * not coming. Keep it in step with `MAX_ROUNDS` in `server/index.mjs`.
 */
export const MAX_ROUNDS = 3;

export interface PromptLines {
  primary: { text: string; lang: Locale };
  /** The same question in the other language, when there is one. */
  secondary: { text: string; lang: Locale } | null;
  /** True when a machine did the translating, which the reader is told. */
  machine: boolean;
}

/** Resolve a round's question, falling back to the table if a pool id is gone. */
export function promptFor(date: string, slot: number, question: RoundQuestion, pool: Map<string, QuestionRecord>): Prompt {
  if (question.kind === 'pool') {
    const written = pool.get(question.id);
    if (written) return { kind: 'pool', question: written };
    // The pool entry has not arrived on this device yet. The bundled question
    // for the slot is not what the other phone is looking at, so this is a
    // stand-in and nothing more — the next sync replaces it.
  }
  return { kind: 'bundled', question: questionFor(date, slot) };
}

export const promptId = (prompt: Prompt): string => prompt.question.id;

/** Who asked, when it was not the app. */
export const promptAuthor = (prompt: Prompt): Side | null => (prompt.kind === 'pool' ? prompt.question.author : null);

/**
 * Both languages where both exist, and never a pretence that they do.
 *
 * The design puts two languages under each other: two people, two mother
 * tongues, one question. A question one of you wrote has only the language it
 * was written in until somebody supplies the other, and then it is shown in the
 * language you read with the original underneath — her sentence stays on the
 * screen, because it is hers.
 */
export function promptLines(prompt: Prompt, locale: Locale, other: Locale): PromptLines {
  if (prompt.kind === 'bundled') {
    return {
      primary: { text: questionText(prompt.question, locale), lang: locale },
      secondary: { text: questionText(prompt.question, other), lang: other },
      machine: false,
    };
  }

  const { lang, text, translation } = prompt.question;
  const original = { text, lang };
  if (lang === locale) {
    return {
      primary: original,
      secondary: translation ? { text: translation.text, lang: translation.lang } : null,
      machine: false,
    };
  }
  if (translation && translation.lang === locale) {
    return {
      primary: { text: translation.text, lang: translation.lang },
      secondary: original,
      machine: translation.by === 'machine',
    };
  }
  // Untranslated and not in your language: you get it as it was written, which
  // is better than a blank. It is one sentence, and it is hers.
  return { primary: original, secondary: null, machine: false };
}
