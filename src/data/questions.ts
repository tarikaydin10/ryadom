import { enqueue, getQuestion, putQuestion, type QuestionRecord, type Side } from './db';
import { syncEnabled } from './api';
import { syncNow } from './sync';
import type { Locale } from '../i18n';

/**
 * The questions the two of you write yourselves.
 *
 * Same arrangement as an answer: it lands in the local store first and is
 * visible immediately, and the courier carries it when it can. The id is made
 * here rather than by the server, so a retry after a lost connection updates
 * the question that was written instead of adding a second copy of it.
 */

const MAX_QUESTION_CHARS = 300;

function newId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  // `randomUUID` needs a secure context, which a phone on a plain-http LAN
  // during development is not. Nothing here is a secret; it only has to be
  // unique between two people.
  return `p-${uuid ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
}

export interface QuestionDraft {
  /** Absent for a new question; present when one is being edited. */
  id?: string;
  author: Side;
  lang: Locale;
  text: string;
  translation: QuestionRecord['translation'];
}

export async function saveQuestion(draft: QuestionDraft): Promise<QuestionRecord> {
  const now = Date.now();
  const id = draft.id ?? newId();
  const existing = draft.id ? await getQuestion(draft.id) : undefined;
  const record: QuestionRecord = {
    id,
    author: draft.author,
    lang: draft.lang,
    text: draft.text.trim().slice(0, MAX_QUESTION_CHARS),
    translation: draft.translation
      ? { ...draft.translation, text: draft.translation.text.trim().slice(0, MAX_QUESTION_CHARS) }
      : null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    usedOn: existing?.usedOn ?? null,
    deleted: false,
    syncedAt: null,
  };
  await commit(record);
  return record;
}

/**
 * Taking a question back.
 *
 * Only ever one that has not been asked yet — a question that has been put to
 * somebody and answered is part of a day, and days are not edited. The server
 * enforces that too; this is here so the button can be hidden rather than
 * refused.
 */
export async function removeQuestion(id: string): Promise<void> {
  const existing = await getQuestion(id);
  if (!existing || existing.usedOn !== null) return;
  await commit({ ...existing, deleted: true, updatedAt: Date.now(), syncedAt: null });
}

async function commit(record: QuestionRecord): Promise<void> {
  await putQuestion(record);
  await enqueue({
    kind: 'question',
    questionId: record.id,
    payload: {
      lang: record.lang,
      text: record.text,
      translation: record.translation,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      deleted: record.deleted,
    },
    queuedAt: Date.now(),
    attempts: 0,
    lastError: null,
  });
  if (syncEnabled()) void syncNow().catch(() => undefined);
}
