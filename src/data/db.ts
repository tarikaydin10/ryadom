import { deleteDB, openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from 'idb';
import type { Locale } from '../i18n';

/**
 * Local store. This is the app's source of truth — not a cache of the server.
 *
 * Every write lands here first and is immediately visible; the network is a
 * background courier that catches up whenever it can. On a phone that has not
 * seen a connection in a week, the app still opens, still shows the sky, still
 * takes today's answer.
 */

export type Author = 'me' | 'them';

/** Which side of the pair wrote something. The server's word, not a claim. */
export type Side = 'a' | 'b';

/**
 * A day is a handful of rounds now, not a single question.
 *
 * Round 0 is the question of the day and is derived from the date alone, so it
 * is there on a phone that has never reached the server. Every round after it
 * is opened by the server the moment both of you have answered the one before
 * — which is knowledge only the server has — and is therefore always something
 * that arrived over the wire.
 */
export type RoundQuestion =
  /** Derived from the date and the slot; see `questionFor`. */
  | { kind: 'bundled' }
  /** One of your own, by id, carried in full on the day payload. */
  | { kind: 'pool'; id: string };

export interface AnswerRecord {
  /** `${date}#${slot}:${author}` */
  id: string;
  date: string;
  slot: number;
  questionId: string;
  author: Author;
  text: string;
  createdAt: number;
  updatedAt: number;
  /** Set once the answer has been acknowledged by the server. */
  syncedAt: number | null;
}

/**
 * A round as the server last described it: which question it asks, and whether
 * the other side has written. The text of their answer is never in here — it
 * lives in `answers` and only ever arrives once your own has been sent.
 */
export interface RoundRecord {
  /** `${date}#${slot}` */
  id: string;
  date: string;
  slot: number;
  question: RoundQuestion;
  /** The server tells us *that* they answered and when, without the text. */
  answered: boolean;
  answeredAt: number | null;
  fetchedAt: number;
}

/**
 * A question one of you wrote.
 *
 * It carries the language it was written in rather than a pair of fields,
 * because that is what is actually true: somebody wrote one sentence, in their
 * own language. A translation is optional and knows where it came from — from
 * the author, who typed it, or one day from a machine, which is a thing the
 * reader deserves to be told.
 */
export interface QuestionRecord {
  /** `p-…`, made on the device that wrote it, so a retry cannot duplicate it. */
  id: string;
  author: Side;
  lang: Locale;
  text: string;
  translation: { lang: Locale; text: string; by: 'author' | 'machine' } | null;
  createdAt: number;
  updatedAt: number;
  /** The date it was asked on, once it has been. Asked questions cannot go. */
  usedOn: string | null;
  deleted: boolean;
  syncedAt: number | null;
}

export type OutboxItem = { id?: number; queuedAt: number; attempts: number; lastError: string | null } & (
  | { kind: 'answer'; date: string; slot: number; payload: { text: string; questionId: string; updatedAt: number } }
  | {
      kind: 'question';
      questionId: string;
      payload: {
        lang: Locale;
        text: string;
        translation: QuestionRecord['translation'];
        createdAt: number;
        updatedAt: number;
        deleted: boolean;
      };
    }
);

/**
 * The same item before it has a key. A plain `Omit` over a union keeps only the
 * fields every member shares, which here is nearly none of them, so the union
 * is distributed by hand.
 */
export type OutboxDraft = OutboxItem extends infer Item ? (Item extends OutboxItem ? Omit<Item, 'id'> : never) : never;

interface RyadomDB extends DBSchema {
  answers: { key: string; value: AnswerRecord; indexes: { 'by-date': string } };
  rounds: { key: string; value: RoundRecord; indexes: { 'by-date': string } };
  questions: { key: string; value: QuestionRecord };
  outbox: { key: number; value: OutboxItem };
  kv: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<RyadomDB>> | null = null;

const STORES = ['answers', 'rounds', 'questions', 'outbox', 'kv'] as const;

const VERSION = 2;

function create(database: IDBPDatabase<RyadomDB>): void {
  const answers = database.createObjectStore('answers', { keyPath: 'id' });
  answers.createIndex('by-date', 'date');
  const rounds = database.createObjectStore('rounds', { keyPath: 'id' });
  rounds.createIndex('by-date', 'date');
  database.createObjectStore('questions', { keyPath: 'id' });
  database.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
  database.createObjectStore('kv');
}

/**
 * Version 1 knew one answer per person per day. Version 2 knows rounds.
 *
 * Every answer already written belongs to round 0 — that is what the day was
 * when it was written — so it keeps its text, its timestamps and its place in
 * the outbox, and only its key changes. The partner store is the one thing
 * dropped rather than moved: it held nothing that was not a copy of something
 * the server will say again on the next sync.
 */
async function toVersion2(
  database: IDBPDatabase<RyadomDB>,
  tx: IDBPTransaction<RyadomDB, ArrayLike<'answers' | 'rounds' | 'questions' | 'outbox' | 'kv'>, 'versionchange'>,
): Promise<void> {
  const answers = tx.objectStore('answers');
  const carried = await answers.getAll();
  await answers.clear();
  for (const record of carried) await answers.put(withSlot(record));

  const outbox = tx.objectStore('outbox');
  for (const item of await outbox.getAll()) {
    if (item.kind === 'answer' && item.id !== undefined) await outbox.put({ ...item, slot: item.slot ?? 0 });
  }

  const untyped = database as unknown as IDBPDatabase;
  if (untyped.objectStoreNames.contains('partner')) untyped.deleteObjectStore('partner');
  const rounds = database.createObjectStore('rounds', { keyPath: 'id' });
  rounds.createIndex('by-date', 'date');
  database.createObjectStore('questions', { keyPath: 'id' });
}

/** An answer from before rounds existed, in the shape rounds need. */
function withSlot(record: AnswerRecord & { slot?: number }): AnswerRecord {
  const slot = record.slot ?? 0;
  return { ...record, slot, id: answerId(record.date, slot, record.author) };
}

export function db(): Promise<IDBPDatabase<RyadomDB>> {
  dbPromise ??= open();
  return dbPromise;
}

async function open(): Promise<IDBPDatabase<RyadomDB>> {
  const database = await openDB<RyadomDB>('ryadom', VERSION, {
    upgrade: async (upgraded, oldVersion, _newVersion, tx) => {
      if (oldVersion < 1) {
        create(upgraded);
        return;
      }
      if (oldVersion < 2) await toVersion2(upgraded, tx);
    },
  });
  await carryOver(database);
  return database;
}

/**
 * The store this app kept before it was renamed.
 *
 * A database cannot be renamed, only copied, and what is in here is the part of
 * the rename that would actually hurt to lose: the answers already written, and
 * the outbox — an answer typed on a train, queued, and not yet acknowledged by
 * the server. Losing that is losing something somebody wrote to somebody else.
 *
 * Only ever runs into an empty store, and deletes the old one when it is done,
 * so it cannot copy twice and cannot walk over anything written since. See
 * `carry-over.ts` for the same step on the `localStorage` side.
 *
 * What comes across is what a device cannot get back: answers, the outbox, and
 * the odds and ends in `kv`. Anything the server can say again is left behind —
 * that database predates rounds and its round-less shape has no business in
 * here.
 */
async function carryOver(database: IDBPDatabase<RyadomDB>): Promise<void> {
  try {
    const counts = await Promise.all(STORES.map((store) => database.count(store)));
    if (counts.some((count) => count > 0)) return;

    // Opening at version 1 with an upgrade that creates nothing is how "does
    // this exist?" is asked without `indexedDB.databases()`, which not every
    // browser this runs on has: a database that was not there arrives with no
    // stores in it, and is thrown away again.
    const old = await openDB('rjadom', 1, { upgrade: () => {} });
    if (old.objectStoreNames.length === 0) {
      old.close();
      await deleteDB('rjadom');
      return;
    }

    for (const name of ['answers', 'outbox', 'kv'] as const) {
      if (!old.objectStoreNames.contains(name)) continue;
      const values = await old.getAll(name);
      if (values.length === 0) continue;
      // `kv` is the one store keyed from outside the record, so its keys have
      // to travel beside the values rather than inside them.
      const keys = old.transaction(name).store.keyPath === null ? await old.getAllKeys(name) : null;
      const tx = (database as unknown as IDBPDatabase).transaction(name, 'readwrite');
      for (let i = 0; i < values.length; i++) {
        const value =
          name === 'answers'
            ? withSlot(values[i] as AnswerRecord)
            : name === 'outbox'
              ? { ...(values[i] as OutboxItem & { slot?: number }), slot: 0 }
              : values[i];
        await (keys ? tx.store.put(value, keys[i]) : tx.store.put(value));
      }
      await tx.done;
    }

    old.close();
    await deleteDB('rjadom');
  } catch {
    // A failed carry-over leaves the old database where it is and the new one
    // empty, which is recoverable — the server still has the answers. Refusing
    // to open the app over it would not be.
  }
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  return (await (await db()).get('kv', key)) as T | undefined;
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  await (await db()).put('kv', value, key);
}

export const answerId = (date: string, slot: number, author: Author) => `${date}#${slot}:${author}`;
export const roundId = (date: string, slot: number) => `${date}#${slot}`;

export async function getAnswer(date: string, slot: number, author: Author): Promise<AnswerRecord | undefined> {
  return (await db()).get('answers', answerId(date, slot, author));
}

export async function getAnswers(date: string): Promise<AnswerRecord[]> {
  return (await db()).getAllFromIndex('answers', 'by-date', date);
}

/**
 * Everything this device has ever held, for the chronicle.
 *
 * Two people writing a few sentences a day will not outgrow one read; when they
 * do, this becomes a cursor over the date index.
 */
export async function getAllAnswers(): Promise<AnswerRecord[]> {
  return (await db()).getAll('answers');
}

export async function putAnswer(record: AnswerRecord): Promise<void> {
  const store = await db();
  const existing = await store.get('answers', record.id);
  // Last write wins, by the author's own clock. Only one device per author ever
  // writes a given record, so this only ever arbitrates between that author's
  // own phone and tablet.
  if (existing && existing.updatedAt > record.updatedAt) return;
  await store.put('answers', record);
}

export async function getRounds(date: string): Promise<RoundRecord[]> {
  return (await db()).getAllFromIndex('rounds', 'by-date', date);
}

export async function getAllRounds(): Promise<RoundRecord[]> {
  return (await db()).getAll('rounds');
}

/**
 * Everything the server can say again — answers and rounds — but not the
 * outbox, which holds words that have not reached it yet, and not `kv`.
 * Used when the store turns out to belong to the other side of the pair.
 */
export async function clearDayStores(): Promise<void> {
  const store = await db();
  const tx = store.transaction(['answers', 'rounds'], 'readwrite');
  await Promise.all([tx.objectStore('answers').clear(), tx.objectStore('rounds').clear(), tx.done]);
}

export async function putRound(record: RoundRecord): Promise<void> {
  await (await db()).put('rounds', record);
}

export async function getQuestions(): Promise<QuestionRecord[]> {
  return (await db()).getAll('questions');
}

export async function getQuestion(id: string): Promise<QuestionRecord | undefined> {
  return (await db()).get('questions', id);
}

export async function putQuestion(record: QuestionRecord): Promise<void> {
  const store = await db();
  const existing = await store.get('questions', record.id);
  if (existing && existing.updatedAt > record.updatedAt) return;
  await store.put('questions', record);
}

export async function enqueue(item: OutboxDraft): Promise<void> {
  const store = await db();
  const tx = store.transaction('outbox', 'readwrite');
  // One pending write per thing written: a re-edit before the first one leaves
  // replaces it, rather than queueing two versions of the same sentence.
  for (const existing of await tx.store.getAll()) {
    if (existing.id === undefined || existing.kind !== item.kind) continue;
    const same =
      existing.kind === 'answer' && item.kind === 'answer'
        ? existing.date === item.date && existing.slot === item.slot
        : existing.kind === 'question' && item.kind === 'question'
          ? existing.questionId === item.questionId
          : false;
    if (same) await tx.store.delete(existing.id);
  }
  await tx.store.add(item as OutboxItem);
  await tx.done;
}

export async function outbox(): Promise<OutboxItem[]> {
  return (await db()).getAll('outbox');
}

export async function dequeue(id: number): Promise<void> {
  await (await db()).delete('outbox', id);
}

export async function updateOutboxItem(item: OutboxItem): Promise<void> {
  if (item.id === undefined) return;
  await (await db()).put('outbox', item);
}

export async function outboxCount(): Promise<number> {
  return (await db()).count('outbox');
}
