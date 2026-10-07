import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { useSettings } from '../data/settings-context';
import { getPair } from '../data/pair';
import { displayName, sidesFor } from '../data/settings';
import { getQuestions, type QuestionRecord } from '../data/db';
import { removeQuestion } from '../data/questions';
import { QuestionForm } from './QuestionForm';
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
 * Each of you writes in your own language — the form is `QuestionForm`, shared
 * with Today. What is listed under it is what is still coming and what has
 * been asked. Hers, not yet asked, are listed as existing and nothing more:
 * the sentence stays on the server until its round (ADR-0012 called the
 * surprise half the value, and for a day this list gave it away).
 *
 * Lives in the chronicle, as its second half: the questions asked so far are
 * there, and the ones you write are the same subject seen from the other end.
 * Split into what is still coming and what has been asked, because which of
 * the two a question is in is the one thing anybody comes here to check.
 */
export function QuestionPool() {
  const { t, locale } = useI18n();
  const { settings } = useSettings();
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);

  const member = getPair()?.member ?? 'a';
  const sides = sidesFor(member, settings);
  const partnerName = displayName(sides.partnerName, locale);
  const yourName = displayName(sides.yourName, locale);

  const refresh = () => void getQuestions().then(setQuestions);
  useEffect(refresh, []);
  useEffect(() => subscribeSync(() => refresh()), []);

  const drop = (id: string) => {
    void removeQuestion(id).then(refresh);
  };

  // Newest first: the list is a place to check what is still coming, and what
  // was written last is what somebody is most likely looking for.
  const listed = questions.filter((question) => !question.deleted).sort((left, right) => right.createdAt - left.createdAt);
  const upcoming = listed.filter((question) => question.usedOn === null);
  const asked = listed.filter((question) => question.usedOn !== null);

  const item = (question: QuestionRecord) => (
    <div className="row row--stack questions__item" key={question.id}>
      {/* Hers, not yet asked: the sentence is not on this device — the server
          keeps it until the round that asks it (see `sealed`). What is listed
          is that it exists, which is the whole of the anticipation and none of
          the surprise. */}
      {question.sealed ? (
        <span className="questions__text questions__text--sealed">{t('questions.sealed', { name: partnerName })}</span>
      ) : (
        <span className="questions__text" lang={question.lang}>
          {question.text}
        </span>
      )}
      {question.translation && (
        <span className="questions__second" lang={question.translation.lang}>
          {question.translation.text}
        </span>
      )}
      <span className="questions__meta">
        {question.author === member ? yourName : partnerName}
        {question.usedOn && ` · ${t('questions.asked', { date: dayAndMonth(dateKeyToMs(question.usedOn), locale) })}`}
        {question.author === member && question.usedOn === null && (
          <button className="row__action questions__drop" onClick={() => drop(question.id)}>
            {t('questions.remove')}
          </button>
        )}
      </span>
    </div>
  );

  return (
    <>
      <section className="group" id="questions">
        <span className="group__title">{t('questions.title')}</span>
        <div className="group__card">
          <div className="row row--stack">
            <QuestionForm onAdded={refresh} />
          </div>
        </div>
        <p className="group__foot">{t('questions.intro')}</p>
      </section>

      <section className="group">
        <span className="group__title">{t('questions.upcoming')}</span>
        {upcoming.length > 0 ? (
          <div className="group__card">{upcoming.map(item)}</div>
        ) : (
          <p className="group__foot">{t('questions.empty')}</p>
        )}
      </section>

      {asked.length > 0 && (
        <section className="group">
          <span className="group__title">{t('questions.askedList')}</span>
          <div className="group__card">{asked.map(item)}</div>
        </section>
      )}
    </>
  );
}
