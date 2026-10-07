import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { flushSync } from 'react-dom';
import { useI18n } from '../i18n';
import { addNote, markNotesSeen, MAX_NOTE_TEXT } from '../data/talk';
import type { TalkView } from '../data/answers';

interface Props {
  date: string;
  slot: number;
  talk: TalkView;
  yourName: string;
  partnerName: string;
  /**
   * How present the thread is. On today's round it is open, and its field is
   * the invitation; in the chronicle, where the same field under a hundred past
   * days would be a hundred chores, it is folded to one quiet line until it has
   * something new in it or somebody opens it.
   */
  tone: 'invite' | 'quiet';
  /** The page reloads the day from the store once something has been written. */
  onWritten(): void;
}

/**
 * What the two of you say about a round, once it is finished.
 *
 * The one thing the app could not do: you read what they wrote, the round
 * folded itself up, and there was nowhere to say "I did not know that about
 * you". A mark says a great deal in one tap and cannot say that.
 *
 * It hangs on the round — the question — and not on one of the two answers,
 * because what gets said here is almost always about both of them at once.
 *
 * On Today it is a field, and one tap puts the cursor in it. The first version
 * was a line that opened a thread that held a line that opened an editor with
 * Send and Cancel under it — three taps to say "ha", and the first of them
 * changed nothing you could see. Now it is written the way a reply under a post
 * is written anywhere: type, send, and the field stays for the next one, because
 * the thread is meant for several short things in a row, not one speech each.
 *
 * What still keeps it from becoming a chat with a question on top: it exists
 * only under a round you have both answered, it has no notion of whose turn it
 * is, and in the record it is folded.
 */
export function RoundTalk({ date, slot, talk, yourName, partnerName, tone, onWritten }: Props) {
  const { t, tp } = useI18n();
  // Something written since this device last looked opens the thread by itself;
  // news you have to go and find is news badly told.
  const [open, setOpen] = useState(tone === 'invite' || talk.unseen > 0);
  const [draft, setDraft] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);
  // Fixed for as long as the thread is on screen. Opening it marks it read
  // straight away, and if what counted as new were read back from the store, it
  // would stop being new in the same frame it was shown.
  const [seenBefore] = useState(talk.seenAt);
  const [shownAt] = useState(() => Date.now());

  useEffect(() => {
    if (talk.unseen > 0) setOpen(true);
  }, [talk.unseen]);

  // Open is read: the dot goes, and stays gone on the next launch. Writing
  // marks it too (see `addNote`), so the two halves cannot disagree. The page is
  // told only when something actually changed — a screen whose reload callback
  // is rebuilt on every render would otherwise reload itself for ever.
  useEffect(() => {
    if (open && talk.unseen > 0) void markNotesSeen(date, slot).then((changed) => changed && onWritten());
  }, [open, talk.unseen, date, slot, onWritten]);

  // As tall as what is in it, from one line up: a note is a sentence, and a box
  // drawn for a paragraph says the wrong thing about how much to write.
  useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }, [draft, open]);

  const commit = () => {
    const text = draft.trim();
    if (!text) return;
    // Cleared at once rather than after the store has answered: the note is on
    // the screen a frame later either way, and a field that still holds what
    // you sent looks like it did not go. Nor does it wait for the last one to
    // land before taking the next — two quick lines are the normal case, and
    // the store keeps both because notes are merged by id (see `putRound`).
    setDraft('');
    void addNote(date, slot, text).then(onWritten);
  };

  // Return sends. On the phone the key says so (`enterKeyHint`); on a keyboard
  // Shift+Return is still a new line. Never mid-composition, where Return
  // confirms a word rather than the message.
  const key = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    commit();
  };

  const count = talk.notes.length;

  if (!open) {
    return (
      <button
        className="talk__line"
        onClick={() => {
          // Nothing to read yet: the tap was for writing, so it gets the field.
          // Opened synchronously and focused inside the same tap, because iOS
          // raises the keyboard only for a focus it can trace to a finger.
          flushSync(() => setOpen(true));
          if (count === 0) field.current?.focus();
        }}
      >
        {count === 0 ? t('talk.add') : `${count} ${tp('talk.count', count)}`}
        {talk.unseen > 0 && <span className="talk__new" aria-label={t('talk.new')} />}
      </button>
    );
  }

  return (
    <div className="talk">
      {/* The name only where it changes. Three notes in a row from the same
          person used to carry the same label three times, which is noise the
          moment the thread is used the way it is meant to be — several short
          things, one after another, rather than one speech each. */}
      {talk.notes.map((note, index) => {
        const turn = note.author !== talk.notes[index - 1]?.author;
        const classes = ['talk__note'];
        if (!turn) classes.push('talk__note--same');
        if (note.author === 'them' && note.createdAt > seenBefore) classes.push('talk__note--new');
        if (note.createdAt > shownAt) classes.push('talk__note--fresh');
        return (
          <p className={classes.join(' ')} key={note.id}>
            {turn && <span className="talk__who">{note.author === 'me' ? yourName : partnerName}</span>}
            {note.text}
          </p>
        );
      })}

      <div className="talk__compose">
        <textarea
          ref={field}
          className="talk__field"
          rows={1}
          value={draft}
          maxLength={MAX_NOTE_TEXT}
          enterKeyHint="send"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={key}
          placeholder={t('talk.placeholder')}
          aria-label={t('talk.add')}
        />
        {/* Only when there is something to send: an arrow beside an empty field
            is a button that does nothing, and the field alone reads as a line. */}
        {draft.trim().length > 0 && (
          <button className="talk__send" onClick={commit} aria-label={t('answer.send')}>
            <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
              <path
                d="M10 15.5V4.5M5 9.5l5-5 5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
