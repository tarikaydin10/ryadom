import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { getPair } from '../data/pair';
import { saveQuestion } from '../data/questions';

interface Props {
  /** Called once the question is in the store — for the caller to close or thank. */
  onAdded?(): void;
  /** Focus the field as soon as it appears: it was opened by a tap that meant it. */
  autoFocus?: boolean;
}

/**
 * One field, and the other language behind a line.
 *
 * Each of you writes in your own language. The translation is optional and
 * says so by being out of sight until asked for: two tall empty boxes read as
 * a form, one reads as a place to say something. When it is left empty the
 * other side reads the sentence as it was written, which is honest and is
 * one sentence.
 *
 * Used twice — under the day's question on Today, where the wish to ask
 * arrives, and at the foot of the chronicle beside the list — so that the two
 * do not drift apart.
 */
export function QuestionForm({ onAdded, autoFocus = false }: Props) {
  const { t, locale, other } = useI18n();
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [second, setSecond] = useState(false);
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) field.current?.focus();
  }, [autoFocus]);

  const member = getPair()?.member ?? 'a';

  const add = () => {
    const written = text.trim();
    if (!written || busy) return;
    setBusy(true);
    const translated = translation.trim();
    void saveQuestion({
      author: member,
      lang: locale,
      text: written,
      translation: translated ? { lang: other, text: translated, by: 'author' } : null,
    })
      .then(() => {
        setText('');
        setTranslation('');
        setSecond(false);
        onAdded?.();
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className="ask">
      <textarea
        ref={field}
        className="field__input questions__editor"
        value={text}
        lang={locale}
        placeholder={t('questions.placeholder')}
        aria-label={t('questions.yours')}
        onChange={(event) => setText(event.target.value)}
      />
      {second ? (
        <textarea
          className="field__input questions__editor"
          value={translation}
          lang={other}
          placeholder={t('questions.translationHint')}
          aria-label={t('questions.translation')}
          onChange={(event) => setTranslation(event.target.value)}
        />
      ) : (
        <button className="ask__more" onClick={() => setSecond(true)}>
          {t('questions.addOther')}
        </button>
      )}
      <div className="answer__actions">
        <button className="button" onClick={add} disabled={busy || text.trim().length === 0}>
          {t('questions.save')}
        </button>
      </div>
    </div>
  );
}
