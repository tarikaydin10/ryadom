import { useEffect, useState } from 'react';
import { useI18n, type LocalePreference } from '../i18n';
import { useSettings } from '../data/settings-context';
import { clearPair, getPair } from '../data/pair';
import { cityOf, displayName, sidesFor } from '../data/settings';
import { sendNote, syncConfigured } from '../data/api';
import { syncNow } from '../data/sync';
import { useSyncStatus } from '../lib/hooks';
import { CITIES, type CityId } from '../content/cities';
import { timeOfDay } from '../lib/format';
import type { Settings } from '../data/settings';
import { Diagnostics } from '../components/Diagnostics';
import { disablePush, enablePush, pushStatus, type PushStatus } from '../data/push';
import { setPaperPreference, usePaperPreference, type PaperPreference } from '../lib/paper';
import { buildExport, shareExport, type ShareOutcome } from '../data/export';

/**
 * Settings, and only settings.
 *
 * The reunion used to live here and no longer does — it is content, not a
 * preference, and it is edited on the card that shows it. What remains is what
 * actually belongs in a menu: the language, who is called what, and the state of
 * the connection. There is no side chooser either: which city you are follows
 * from the passphrase you unlocked with.
 */
export function Us() {
  const { t, locale, preference, setPreference } = useI18n();
  const { settings, update } = useSettings();
  const sync = useSyncStatus();
  const pair = getPair();
  const [draft, setDraft] = useState<Settings>(settings);
  const [saved, setSaved] = useState(false);
  /**
   * Saved as it is typed, a moment after the last keystroke.
   *
   * The language and the notifications took effect on the tap; the names
   * needed a button at the foot of the page, which half the time was never
   * pressed. Now a change is written once typing pauses, and the "saved"
   * under the field says that it was. Compared as text so that the courier's
   * copy of the same settings coming back does not count as an edit.
   */
  useEffect(() => {
    const same = JSON.stringify({ names: draft.names, dates: draft.dates }) === JSON.stringify({ names: settings.names, dates: settings.dates });
    if (same) return;
    const timer = window.setTimeout(() => void update({ ...settings, names: draft.names, dates: draft.dates }).then(() => setSaved(true)), 700);
    return () => window.clearTimeout(timer);
  }, [draft, settings, update]);
  useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 2500);
    return () => window.clearTimeout(timer);
  }, [saved]);
  /**
   * The way into the diagnosis: five taps on the heading.
   *
   * Hidden, because it is a block of numbers and this screen is otherwise part
   * of the picture. Not hidden hard, because whoever needs it is holding a
   * misbehaving phone in another country (TD-05).
   */
  const [taps, setTaps] = useState(0);

  /**
   * Notifications are a property of this device, not of the pair: each phone
   * subscribes for itself, and the server knows only where to knock.
   */
  const [push, setPush] = useState<PushStatus>('unsupported');
  const [pushBusy, setPushBusy] = useState(false);
  useEffect(() => {
    void pushStatus().then(setPush);
  }, []);

  const togglePush = () => {
    setPushBusy(true);
    const next = push === 'on' ? disablePush() : enablePush(locale);
    void next
      .then(setPush)
      // A refusal, a browser that only pretended to support it, a server that
      // did not answer: whatever it was, the switch has to end up telling the
      // truth rather than staying mid-flight.
      .catch(() => void pushStatus().then(setPush))
      .finally(() => setPushBusy(false));
  };

  useEffect(() => setDraft(settings), [settings]);

  /**
   * A word to her phone, in your own words — "new update, have a look".
   *
   * Only on side A: a maintainer's tool, and the server refuses it for B.
   * It is not an answer and not one of the app's two sentences; it is a note,
   * and what the line under it says is how many of her devices took it.
   */
  const [note, setNote] = useState('');
  const [noteState, setNoteState] = useState<{ kind: 'idle' | 'sending' | 'failed' } | { kind: 'sent'; count: number }>({ kind: 'idle' });
  const partnerName = displayName(sidesFor(pair?.member ?? 'a', settings).partnerName, locale);
  const send = () => {
    const text = note.trim();
    if (!text) return;
    setNoteState({ kind: 'sending' });
    void sendNote(text)
      .then((result) => {
        setNoteState({ kind: 'sent', count: result.sent });
        setNote('');
      })
      .catch(() => setNoteState({ kind: 'failed' }));
  };
  const noteLine =
    noteState.kind === 'sending'
      ? t('note.sending')
      : noteState.kind === 'failed'
        ? t('note.failed')
        : noteState.kind === 'sent'
          ? noteState.count === 0
            ? t('note.noDevice', { name: partnerName })
            : t('note.sent', { count: noteState.count })
          : null;

  /**
   * The way out: everything on this device as two files, through the share
   * sheet. See `data/export.ts` for why the device builds them.
   */
  const [exporting, setExporting] = useState<'idle' | 'working' | ShareOutcome | 'failed'>('idle');
  const exportAll = () => {
    setExporting('working');
    void buildExport(locale)
      .then(shareExport)
      .then(setExporting)
      .catch(() => setExporting('failed'));
  };
  const exportLine =
    exporting === 'working'
      ? t('export.working')
      : exporting === 'shared'
        ? t('export.shared')
        : exporting === 'downloaded'
          ? t('export.downloaded')
          : exporting === 'failed'
            ? t('export.failed')
            : null;

  const patch = (next: Partial<Settings>) => {
    setDraft((current) => ({ ...current, ...next }));
    setSaved(false);
  };

  const paper = usePaperPreference();
  const papers: { id: PaperPreference; label: string }[] = [
    { id: 'sun', label: t('settings.paperSun') },
    { id: 'light', label: t('settings.paperLight') },
  ];

  const languages: { id: LocalePreference; label: string }[] = [
    { id: 'system', label: t('settings.system') },
    { id: 'en', label: t('settings.english') },
    { id: 'ru', label: t('settings.russian') },
  ];

  // Forgetting the device is the one thing on this screen that cannot be taken
  // back from here — the passphrase has to be typed again, on a phone that
  // may be in another country. It used to happen on a single tap of a button
  // drawn exactly like "Sync now". Now the first tap arms it and says so, and
  // only a second tap within a few seconds does it.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  const pushHint =
    push === 'on'
      ? t('settings.pushOnHint')
      : push === 'denied'
        ? t('settings.pushDeniedHint')
        : push === 'unsupported'
          ? t('settings.pushUnsupportedHint')
          : t('settings.pushOffHint');

  /*
   * Grouped the way every settings screen people already know is grouped: a
   * label over a card of rows, a line of explanation under it, the most used
   * things first. It used to be eight sections of equal weight down one long
   * column, every action a ghost button of the same size — so "Sync now" and
   * "Forget this device" looked like the same kind of thing, and the switch
   * for notifications was a button whose label said the opposite of the state.
   */
  return (
    <div className="screen">
      <h1 className="screen__title" onClick={() => setTaps((count) => count + 1)}>
        {t('settings.title')}
      </h1>

      {/* No title over this one: the row says it, and a label over a card
          whose only row repeats the label is the same word twice. */}
      <section className="group">
        <div className="group__card">
          <div className="row">
            <span className="row__label">{t('settings.notifications')}</span>
            <button
              className="switch"
              role="switch"
              aria-checked={push === 'on'}
              aria-label={t('settings.notifications')}
              disabled={pushBusy || (push !== 'on' && push !== 'off')}
              onClick={togglePush}
            />
          </div>
        </div>
        <p className="group__foot">{pushHint}</p>
      </section>

      <section className="group">
        {/* "Saved" rides on the title line rather than under the card, where it
            held a line of empty space for the moments it was not showing. */}
        <span className="group__title">
          {t('settings.names')}
          <span className={saved ? 'us__saved us__saved--on' : 'us__saved'}>{t('settings.saved')}</span>
        </span>
        <div className="group__card">
          {/* Keyed by city, not by "you" and "them": both phones read the same
              settings, and each of you is "you" on your own. Two spellings each,
              because a name can be written in both alphabets without being
              translated — shown in whichever matches the interface language. */}
          {(Object.keys(CITIES) as CityId[]).map((id) => (
            <div className="row row--stack" key={id}>
              <span className="field__label">
                {CITIES[id].label}
                {pair && id === cityOf(pair.member) ? ` · ${t('answer.you')}` : ''}
              </span>
              <div className="field__row">
                <input
                  className="field__input"
                  value={draft.names[id].latin}
                  onChange={(e) =>
                    patch({ names: { ...draft.names, [id]: { ...draft.names[id], latin: e.target.value } } })
                  }
                  placeholder={id === 'hamburg' ? 'Tarik' : 'Mila'}
                  lang="en"
                />
                <input
                  className="field__input"
                  value={draft.names[id].cyrillic}
                  onChange={(e) =>
                    patch({ names: { ...draft.names, [id]: { ...draft.names[id], cyrillic: e.target.value } } })
                  }
                  placeholder={id === 'hamburg' ? 'Тарык' : 'Мила'}
                  lang="ru"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The days the two of you have. Shared like the names; on the day, the
          question of the day is about it (the server freezes it on round
          zero — see `specialQuestion`). */}
      <section className="group">
        <span className="group__title">{t('settings.dates')}</span>
        <div className="group__card">
          {(Object.keys(CITIES) as CityId[]).map((id) => (
            <label className="row row--stack" key={id}>
              <span className="field__label">{t('settings.birthday', { name: draft.names[id].latin || CITIES[id].label })}</span>
              <input
                className="field__input"
                type="date"
                value={draft.dates.birthdays[id] ?? ''}
                onChange={(e) =>
                  patch({ dates: { ...draft.dates, birthdays: { ...draft.dates.birthdays, [id]: e.target.value || null } } })
                }
              />
            </label>
          ))}
          <label className="row row--stack">
            <span className="field__label">{t('settings.anniversary')}</span>
            <input
              className="field__input"
              type="date"
              value={draft.dates.anniversary ?? ''}
              onChange={(e) => patch({ dates: { ...draft.dates, anniversary: e.target.value || null } })}
            />
          </label>
        </div>
        <p className="group__foot">{t('settings.datesHint')}</p>
      </section>

      <section className="group">
        <span className="group__title">{t('settings.language')}</span>
        <div className="group__card">
          <div className="row">
            <div className="segment segment--fill">
              {languages.map((option) => (
                <button
                  key={option.id}
                  className={option.id === preference ? 'segment__item segment__item--active' : 'segment__item'}
                  onClick={() => setPreference(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="group">
        <span className="group__title">{t('settings.paper')}</span>
        <div className="group__card">
          <div className="row">
            <div className="segment segment--fill">
              {papers.map((option) => (
                <button
                  key={option.id}
                  className={option.id === paper ? 'segment__item segment__item--active' : 'segment__item'}
                  onClick={() => setPaperPreference(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="group__foot">{t('settings.paperHint')}</p>
      </section>

      {pair?.member === 'a' && syncConfigured && (
        <section className="group">
          <span className="group__title">{t('note.title', { name: partnerName })}</span>
          <div className="group__card">
            <div className="row">
              <input
                className="field__input"
                value={note}
                maxLength={140}
                placeholder={t('note.placeholder')}
                enterKeyHint="send"
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') send();
                }}
              />
              <button
                className="row__action"
                disabled={noteState.kind === 'sending' || note.trim() === ''}
                onClick={send}
              >
                {t('note.send')}
              </button>
            </div>
          </div>
          <p className="group__foot">{noteLine ?? t('note.hint')}</p>
        </section>
      )}

      <section className="group">
        <span className="group__title">{t('settings.storage')}</span>
        <div className="group__card">
          <div className="row">
            <span className="row__value">
              {!syncConfigured
                ? t('net.localOnly')
                : sync.lastSyncAt
                  ? t('net.lastSync', { time: timeOfDay(sync.lastSyncAt, locale) })
                  : t('net.lastSync', { time: t('net.never') })}
              {sync.pending > 0 && (
                <>
                  <br />
                  {t('settings.pendingItems', { count: sync.pending })}
                </>
              )}
            </span>
            {syncConfigured && (
              <button className="row__action" onClick={() => void syncNow()}>
                {t('settings.syncNow')}
              </button>
            )}
          </div>
          <div className="row">
            <button className="row__action" disabled={exporting === 'working'} onClick={exportAll}>
              {t('export.button')}
            </button>
          </div>
        </div>
        <p className="group__foot">{exportLine ?? t('export.hint')}</p>
      </section>

      {pair && (
        <section className="group">
          <span className="group__title">{t('settings.device')}</span>
          <div className="group__card">
            <div className="row">
              <span className="row__label">{CITIES[cityOf(pair.member)].label}</span>
            </div>
            <button
              className={armed ? 'row row__danger row__danger--armed' : 'row row__danger'}
              onClick={() => (armed ? clearPair() : setArmed(true))}
            >
              {armed ? t('settings.forgetConfirm') : t('settings.forget')}
            </button>
          </div>
          <p className="group__foot">{t('settings.forgetHint')}</p>
        </section>
      )}

      {taps >= 5 && <Diagnostics />}
    </div>
  );
}
