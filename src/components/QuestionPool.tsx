import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { useSettings } from '../data/settings-context';
import { getPair } from '../data/pair';
import { displayName, sidesFor } from '../data/settings';
import { getQuestions, type QuestionRecord } from '../data/db';
import { removeQuestion, saveQuestion } from '../data/questions';
import { subscribeSync } from '../data/sync';
import { dayAndMonth } from '../lib/format';
import { dateKeyToMs } from '../lib/day';

/**
 * The questions the two of you write yourselves.
 *
 * This is the answer to the oldest complaint about the app: that only it got to
 * ask. A question written here is asked before any of the bundled ones, in the
 * next round that opens — no date to choose, because choosing a date turns a
 * thought into an appointment and the surprise is half of it.
 *
 * Each of you writes in your own language. There is no translation here that
 * nobody typed: the second field is optional and, when it is left empty, the
 * other side simply reads the sentence as it was written. That is honest, and
 * it is one sentence.
 *
 * Lives at the foot of the chronicle, because that is where the questions asked
 * so far are: the ones you write are the same subject, seen from the other end.
 */
export function QuestionPool() {
  const { t, locale, other } = useI18n();
  const { settings } = useSettings();
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [busy, setBusy] = useState(false);

  const member = getPair()?.member ?? 'a';
  const sides = sidesFor(member, settings);
  const partnerName = displayName(sides.partnerName, locale);
  const yourName = displayName(sides.yourName, locale);

  const refresh = () => void getQuestions().then(setQuestions);
  useEffect(refresh, []);
  useEffect(() => subscribeSync(() => refresh()), []);

  const add = () => {
    const written = text.trim();
    if (!written || busy) return;
    setBusy(true);
    const second = translation.trim();
    void saveQuestion({
      author: member,
      lang: locale,
      text: written,
      translation: second ? { lang: other, text: second, by: 'author' } : null,
    })
      .then(() => {
        setText('');
        setTranslation('');
        refresh();
      })
      .finally(() => setBusy(false));
  };

  const drop = (id: string) => {
    void removeQuestion(id).then(refresh);
  };

  // Newest first: the list is a place to check what is still coming, and what
  // was written last is what somebody is most likely looking for.
  const mine = questions.filter((question) => !question.deleted).sort((left, right) => right.createdAt - left.createdAt);

  return (
    <>
      <div className="section" id="questions">
        <span className="section__title">{t('questions.title')}</span>
        <p className="hint">{t('questions.intro')}</p>
        <div className="field">
          <label className="field__label" htmlFor="question-text">
            {t('questions.yours')}
          </label>
          <textarea
            id="question-text"
            className="field__input questions__editor"
            value={text}
            lang={locale}
            placeholder={t('questions.placeholder')}
            onChange={(event) => setText(event.target.value)}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="question-translation">
            {t('questions.translation')}
          </label>
          <textarea
            id="question-translation"
            className="field__input questions__editor"
            value={translation}
            lang={other}
            placeholder={t('questions.translationHint')}
            onChange={(event) => setTranslation(event.target.value)}
          />
        </div>
        <button className="button" onClick={add} disabled={busy || text.trim().length === 0}>
          {t('questions.save')}
        </button>
      </div>

      <div className="section">
        <span className="section__title">{t('questions.list')}</span>
        {mine.length === 0 && <p className="hint">{t('questions.empty')}</p>}
        {mine.map((question) => (
          <div className="questions__item" key={question.id}>
            <span className="questions__text" lang={question.lang}>
              {question.text}
            </span>
            {question.translation && (
              <span className="questions__second" lang={question.translation.lang}>
                {question.translation.text}
              </span>
            )}
            <span className="questions__meta">
              {question.author === member ? yourName : partnerName}
              {' · '}
              {question.usedOn ? t('questions.asked', { date: dayAndMonth(dateKeyToMs(question.usedOn), locale) }) : t('questions.waiting')}
            </span>
            {question.author === member && question.usedOn === null && (
              <button className="button button--ghost questions__drop" onClick={() => drop(question.id)}>
                {t('questions.remove')}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
