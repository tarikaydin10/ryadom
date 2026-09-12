import { loadHistory, type RoundView } from './answers';
import { getQuestions, type QuestionRecord } from './db';
import { cityOf, displayName, loadSettings, type Settings } from './settings';
import { getPair, type PairMember } from './pair';
import { promptId, promptLines } from '../content/prompt';
import { questionText } from '../content/questions';
import { dateKey, dateKeyToMs } from '../lib/day';
import { dayMonthYear, longDate, timeOfDay } from '../lib/format';
import type { Locale } from '../i18n';
import { DICTIONARIES } from '../i18n/strings';

/**
 * Everything, in two files you can open in ten years.
 *
 * The answers are the one thing of value in this app and they live in a file
 * on a rented server. The backup (deploy/README.md) covers the mistake; this
 * covers the end — the day the app is not run any more, the domain lapses,
 * the hoster closes. What the two of you wrote to each other should still be
 * readable then, without Ryadom: as text, a day after another, and as JSON
 * for whatever comes next.
 *
 * Built on the device, not by the server, and for a reason the concept in
 * docs/konzepte/export.md did not see: the server does not know the table's
 * questions. A bundled round is `{ kind: 'bundled' }` and the sentence is
 * derived from the date on the phone (ADR-0012), so only the phone can write
 * "What made you laugh today?" above the two answers. The device's store is
 * complete after one sync (ADR-0014) and holds exactly the server's view for
 * this side — a round you never answered is closed here as it is there — so
 * the one rule holds by construction: the export has the chronicle's sight
 * and no other.
 */

const EXPORT_VERSION = 1;

interface ExportedRound {
  slot: number;
  question: { id: string; kind: 'bundled' | 'pool'; text: Record<string, string> };
  you: { text: string; writtenAt: number } | null;
  partner: { text: string; writtenAt: number } | { locked: true; writtenAt: number | null } | null;
  /**
   * What was said about the round afterwards. Absent when nothing was: a file
   * that carries an empty field under every question is harder to read, and
   * most rounds will have nothing here.
   */
  talk?: {
    /** Your mark on their answer, and theirs on yours. */
    yours: string | null;
    theirs: string | null;
    notes: { by: 'you' | 'them'; text: string; writtenAt: number }[];
  };
}

export interface ExportBundle {
  text: string;
  json: string;
  /** `ryadom-YYYY-MM-DD`, the stem of both file names. */
  stem: string;
}

/** Both languages of a question, keyed by language, as the file should keep them. */
function questionTexts(round: RoundView): Record<string, string> {
  if (round.prompt.kind === 'bundled') {
    return { en: questionText(round.prompt.question, 'en'), ru: questionText(round.prompt.question, 'ru') };
  }
  const { lang, text, translation } = round.prompt.question;
  const texts: Record<string, string> = { [lang]: text };
  if (translation) texts[translation.lang] = translation.text;
  return texts;
}

const exportedTalk = (round: RoundView): ExportedRound['talk'] => {
  const { mine, theirs, notes } = round.talk;
  if (!mine && !theirs && notes.length === 0) return undefined;
  return {
    yours: mine?.emoji ?? null,
    theirs: theirs?.emoji ?? null,
    notes: notes.map((note) => ({
      by: note.author === 'me' ? ('you' as const) : ('them' as const),
      text: note.text,
      writtenAt: note.createdAt,
    })),
  };
};

const exportedRound = (round: RoundView): ExportedRound => ({
  slot: round.slot,
  question: { id: promptId(round.prompt), kind: round.prompt.kind, text: questionTexts(round) },
  you: round.mine ? { text: round.mine.text, writtenAt: round.mine.createdAt } : null,
  partner: round.theirs
    ? { text: round.theirs.text, writtenAt: round.theirs.createdAt }
    : round.partnerAnswered
      ? { locked: true, writtenAt: round.partnerAt }
      : null,
  talk: exportedTalk(round),
});

/** The text file: a day, its questions, what each of you said. No format to explain. */
function renderText(
  days: { date: string; rounds: RoundView[] }[],
  questions: QuestionRecord[],
  settings: Settings,
  member: PairMember,
  locale: Locale,
  now: number,
): string {
  const strings = DICTIONARIES[locale];
  const other: Locale = locale === 'ru' ? 'en' : 'ru';
  const you = displayName(settings.names[cityOf(member)], locale);
  const them = displayName(settings.names[cityOf(member === 'a' ? 'b' : 'a')], locale);
  const lines: string[] = [];
  const rule = '─'.repeat(40);

  lines.push('Ryadom · Рядом', `${strings.export.fileTitle} — ${dayMonthYear(now, locale)}, ${timeOfDay(now, locale)}`, '');

  for (const day of days) {
    lines.push(rule, longDate(dateKeyToMs(day.date), locale) + ' ' + day.date.slice(0, 4), rule);
    for (const round of day.rounds) {
      const shown = promptLines(round.prompt, locale, other);
      lines.push('', shown.primary.text);
      if (shown.secondary) lines.push(shown.secondary.text);
      lines.push('');
      lines.push(`${you}:`, round.mine ? indent(round.mine.text) : `  (${strings.export.notWritten})`);
      if (round.mine && dateKey(round.mine.createdAt) > day.date) {
        lines.push(`  (${strings.chronicle.late.replace('{date}', dayMonthYear(round.mine.createdAt, locale))})`);
      }
      // The mark each of you put on what the other wrote, kept with those words
      // — it is part of what was said, and a record that dropped it would be
      // missing the answer to half the answers.
      if (round.talk.theirs) lines.push(`  ${round.talk.theirs.emoji} ${them}`);
      lines.push('');
      lines.push(
        `${them}:`,
        round.theirs
          ? indent(round.theirs.text)
          : round.partnerAnswered
            ? `  (${strings.export.locked})`
            : `  (${strings.export.notWritten})`,
      );
      if (round.theirs && dateKey(round.theirs.createdAt) > day.date) {
        lines.push(`  (${strings.chronicle.late.replace('{date}', dayMonthYear(round.theirs.createdAt, locale))})`);
      }
      if (round.talk.mine) lines.push(`  ${round.talk.mine.emoji} ${you}`);
      lines.push('');
      // And what was said under the question afterwards, in the order it was
      // said, each line with the name of whoever said it.
      for (const note of round.talk.notes) {
        lines.push(`  · ${note.author === 'me' ? you : them}: ${note.text}`);
      }
      if (round.talk.notes.length > 0) lines.push('');
    }
  }

  const own = questions.filter((question) => !question.deleted && !question.sealed);
  if (own.length > 0) {
    lines.push(rule, strings.questions.list, rule, '');
    for (const question of own) {
      const who = question.author === member ? you : them;
      const when = question.usedOn ? dayMonthYear(dateKeyToMs(question.usedOn), locale) : strings.questions.waiting;
      lines.push(`${who} · ${when}`, indent(question.text));
      if (question.translation) lines.push(indent(question.translation.text));
      lines.push('');
    }
  }

  return lines.join('\n');
}

const indent = (text: string): string =>
  text
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

/** Everything on this device, rendered twice. */
export async function buildExport(locale: Locale, now: number = Date.now()): Promise<ExportBundle> {
  const member = getPair()?.member ?? 'a';
  const [history, questions, settings] = await Promise.all([loadHistory(), getQuestions(), loadSettings()]);
  // Oldest first: a record is read forward.
  const days = [...history].reverse();

  const json = {
    app: 'ryadom',
    version: EXPORT_VERSION,
    exportedAt: new Date(now).toISOString(),
    side: member,
    city: cityOf(member),
    locale,
    settings: { names: settings.names, reunion: settings.reunion },
    days: days.map((day) => ({ date: day.date, rounds: day.rounds.map(exportedRound) })),
    questions: questions
      .filter((question) => !question.deleted && !question.sealed)
      .map(({ id, author, lang, text, translation, createdAt, usedOn }) => ({ id, author, lang, text, translation, createdAt, usedOn })),
  };

  return {
    text: renderText(days, questions, settings, member, locale, now),
    json: JSON.stringify(json, null, 2),
    stem: `ryadom-${dateKey(now)}`,
  };
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';

/**
 * Hand the two files over.
 *
 * A home-screen app on iOS cannot download; it can share. `navigator.share`
 * with files goes to the sheet — Files, Notes, AirDrop, Mail — and that is
 * the way out. Where the sheet is not there (a desktop browser) the files
 * are offered as downloads instead. Neither path involves another host.
 */
export async function shareExport(bundle: ExportBundle): Promise<ShareOutcome> {
  const files = [
    new File([bundle.text], `${bundle.stem}.txt`, { type: 'text/plain' }),
    new File([bundle.json], `${bundle.stem}.json`, { type: 'application/json' }),
  ];
  const nav = navigator as Navigator & { canShare?(data: ShareData): boolean };
  if (typeof nav.share === 'function' && nav.canShare?.({ files })) {
    try {
      await nav.share({ files, title: 'Ryadom' });
      return 'shared';
    } catch (error) {
      // Closing the sheet is an AbortError and not a failure; anything else
      // falls through to the download, which at least leaves the files somewhere.
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    }
  }
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  return 'downloaded';
}
