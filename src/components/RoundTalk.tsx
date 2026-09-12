import { useEffect, useRef, useState } from 'react';
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
   * How loudly the folded line asks to be used. On today's round it is an
   * invitation, in the colour every control here has; in the chronicle, where
   * the same line would repeat under a hundred past days, it is a fact about
   * the round and set like one.
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
 * Folded to a single line, always, unless something in it is new to this
 * device. That is the whole of what keeps it from becoming a chat with a
 * question on top: the page below the answers stays one quiet line, the thread
 * is a thing you open on purpose, and there is no notion of whose turn it is
 * in here — nobody owes anybody a reply under a question they have both
 * already answered.
 */
export function RoundTalk({ date, slot, talk, yourName, partnerName, tone, onWritten }: Props) {
  const { t, tp } = useI18n();
  // Something written since this device last looked opens the thread by itself;
  // news you have to go and find is news badly told.
  const [open, setOpen] = useState(talk.unseen > 0);
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const editor = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    if (writing) editor.current?.focus();
  }, [writing]);

  const commit = () => {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    void addNote(date, slot, text).then(onWritten).finally(() => {
      setSaving(false);
      setWriting(false);
      setDraft('');
    });
  };

  const count = talk.notes.length;

  if (!open) {
    return (
      <button
        className={tone === 'quiet' ? 'talk__line talk__line--quiet' : 'talk__line'}
        onClick={() => setOpen(true)}
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
      {talk.notes.map((note, index) => (
        <p className={note.author === talk.notes[index - 1]?.author ? 'talk__note talk__note--same' : 'talk__note'} key={note.id}>
          {note.author !== talk.notes[index - 1]?.author && (
            <span className="talk__who">{note.author === 'me' ? yourName : partnerName}</span>
          )}
          {note.text}
        </p>
      ))}

      {writing ? (
        <div className="talk__editing">
          <textarea
            ref={editor}
            className="answer__editor talk__editor"
            value={draft}
            maxLength={MAX_NOTE_TEXT}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('talk.placeholder')}
            aria-label={t('talk.add')}
          />
          <div className="answer__actions">
            <button className="button" onClick={commit} disabled={saving || draft.trim().length === 0}>
              {t('answer.send')}
            </button>
            <button className="button button--ghost" onClick={() => setWriting(false)}>
              {t('answer.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="talk__foot">
          <button className="talk__line" onClick={() => setWriting(true)}>
            {t('talk.add')}
          </button>
          {count > 0 && (
            <button className="talk__line talk__line--quiet" onClick={() => setOpen(false)}>
              {t('talk.hide')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
