/**
 * What you have typed and not yet sent, kept on this device.
 *
 * An answer is written on a phone, in the evening, with interruptions: a look
 * at the calendar to check a date, a message from somebody else — and iOS is
 * free to end a home-screen app it considers idle, which it does often enough
 * that a half-written answer was routinely gone when the app came back. So the
 * draft goes to localStorage on every keystroke and comes back when the card is
 * opened again. Only until it is sent: the moment the answer exists it is the
 * store's, and the draft is gone. Cancel discards it too — that is what the
 * word means; the draft guards against the phone, not against you.
 *
 * localStorage rather than IndexedDB because the card wants its words
 * synchronously — it must open with them already there, not a frame later —
 * and because a draft is one small string of which only the newest matters.
 */
const PREFIX = 'ryadom.draft.';
const keyFor = (date: string, slot: number): string => `${PREFIX}${date}.${slot}`;

export function loadDraft(date: string, slot: number): string {
  try {
    return localStorage.getItem(keyFor(date, slot)) ?? '';
  } catch {
    return '';
  }
}

/** An empty draft is no draft: the key goes away with the words. */
export function saveDraft(date: string, slot: number, text: string): void {
  try {
    if (text) localStorage.setItem(keyFor(date, slot), text);
    else localStorage.removeItem(keyFor(date, slot));
  } catch {
    // Private mode or a full store: the words live in the editor only, which
    // is exactly what they did before drafts existed.
  }
}

export const clearDraft = (date: string, slot: number): void => saveDraft(date, slot, '');

/**
 * Drafts for any day but today are abandoned. A day that has passed is written
 * into from the chronicle, if at all, and a sentence begun for yesterday's
 * question would only ever come back under the wrong one.
 */
export function pruneDrafts(today: string): void {
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(PREFIX) && !key.startsWith(`${PREFIX}${today}.`)) localStorage.removeItem(key);
    }
  } catch {
    // Nothing to prune where nothing could be stored.
  }
}
