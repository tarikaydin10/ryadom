import { enqueue, getRound, putRound, type NoteRecord, type RoundRecord } from './db';
import { syncEnabled } from './api';
import { syncNow } from './sync';

/**
 * The afterword: what the two of you say about a round once it is finished.
 *
 * Same arrangement as everything else that is written here — it lands in the
 * local store first and is on the screen before the network has been asked, and
 * the courier carries it when it can. A note's id is made on the device for the
 * same reason a question's is: a retry after a lost connection must put the
 * same sentence there once rather than twice.
 *
 * Only ever on a round both of you have answered. The screens do not offer it
 * before that and the server refuses it (`round not closed`), because a mark on
 * a locked answer would be a word about something the other one has not read
 * yet — the one thing this app does not do.
 */

/**
 * The six, and no more.
 *
 * An emoji keyboard is a place to be clever; this is a place to say one thing,
 * quickly, about something somebody wrote to you: love, moved, laughter,
 * surprise, an embrace, thanks. Six fit in a row on the narrowest phone at the
 * size of a real target, which is the other half of the reason there are six.
 * `server/index.mjs` holds the same list — keep them in step.
 */
export const REACTIONS = ['❤️', '🥹', '😂', '😮', '🤗', '🙏'] as const;

export type ReactionEmoji = (typeof REACTIONS)[number];

export const MAX_NOTE_TEXT = 280;

function newNoteId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  // `randomUUID` needs a secure context, which a phone on a plain-http LAN
  // during development is not. Nothing here is a secret; it only has to be
  // unique between two people.
  return `n-${uuid ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
}

/** The afterword of a round that has none yet, so a write never has to guess. */
const talkOf = (round: RoundRecord) => ({
  reactions: round.reactions ?? { mine: null, theirs: null },
  notes: round.notes ?? [],
});

/**
 * Put a mark on their answer, change it, or take it back with an empty string.
 *
 * One per person per round — tapping the one that is already there removes it,
 * the way it does everywhere else this gesture exists. The clock travels with
 * it so that a tap made offline and a tap made on your other phone can be told
 * apart by something other than which of them reached the server first.
 */
export async function react(date: string, slot: number, emoji: string): Promise<void> {
  const round = await getRound(date, slot);
  if (!round) return;
  const at = Date.now();
  const { reactions, notes } = talkOf(round);
  await putRound({ ...round, reactions: { ...reactions, mine: { emoji, at } }, notes });
  await enqueue({ kind: 'reaction', date, slot, payload: { emoji, at }, queuedAt: at, attempts: 0, lastError: null });
  if (syncEnabled()) void syncNow([date]).catch(() => undefined);
}

/** A word under the round. Written once: there is no editing and no taking back. */
export async function addNote(date: string, slot: number, text: string): Promise<void> {
  const round = await getRound(date, slot);
  const trimmed = text.trim().slice(0, MAX_NOTE_TEXT);
  if (!round || !trimmed) return;
  const now = Date.now();
  const note: NoteRecord = { id: newNoteId(), author: 'me', text: trimmed, createdAt: now };
  const { reactions, notes } = talkOf(round);
  // Writing is looking: the thread is open in front of you, so nothing in it is
  // new any more.
  await putRound({ ...round, reactions, notes: [...notes, note], notesSeenAt: now });
  await enqueue({
    kind: 'note',
    date,
    slot,
    payload: { id: note.id, text: note.text, createdAt: now },
    queuedAt: now,
    attempts: 0,
    lastError: null,
  });
  if (syncEnabled()) void syncNow([date]).catch(() => undefined);
}

/**
 * The thread has been read on this device.
 *
 * Kept on the round rather than in a store of its own, and never sent: whether
 * something is new is a fact about this phone. Read receipts are a different
 * feature and not one this app wants — nobody here owes anybody an answer by a
 * certain hour.
 */
export async function markNotesSeen(date: string, slot: number): Promise<boolean> {
  const round = await getRound(date, slot);
  if (!round) return false;
  const newest = (round.notes ?? []).reduce((latest, note) => Math.max(latest, note.createdAt), 0);
  if (newest === 0 || (round.notesSeenAt ?? 0) >= newest) return false;
  await putRound({ ...round, notesSeenAt: newest });
  return true;
}
