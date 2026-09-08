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

  return (
    <div className="screen">
      <h1 className="screen__title" onClick={() => setTaps((count) => count + 1)}>
        {t('settings.title')}
      </h1>

      <div className="section">
        <span className="section__title">{t('settings.language')}</span>
        <div className="segment">
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

      <div className="section">
        <span className="section__title">{t('settings.paper')}</span>
        <p className="hint">{t('settings.paperHint')}</p>
        <div className="segment">
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

      <div className="section">
        <span className="section__title">{t('settings.names')}</span>
        {/* Keyed by city, not by "you" and "them": both phones read the same
            settings, and each of you is "you" on your own. Two spellings each,
            because a name can be written in both alphabets without being
            translated — shown in whichever matches the interface language. */}
        {(Object.keys(CITIES) as CityId[]).map((id) => (
          <div className="field" key={id}>
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
        <span className={saved ? 'answer__foot us__saved us__saved--on' : 'answer__foot us__saved'}>{t('settings.saved')}</span>
      </div>

      {/* The days the two of you have. Shared like the names; on the day, the
          question of the day is about it (the server freezes it on round
          zero — see `specialQuestion`). */}
      <div className="section">
        <span className="section__title">{t('settings.dates')}</span>
        <p className="hint">{t('settings.datesHint')}</p>
        {(Object.keys(CITIES) as CityId[]).map((id) => (
          <div className="field" key={id}>
            <span className="field__label">{t('settings.birthday', { name: draft.names[id].latin || CITIES[id].label })}</span>
            <input
              className="field__input"
              type="date"
              value={draft.dates.birthdays[id] ?? ''}
              onChange={(e) =>
                patch({ dates: { ...draft.dates, birthdays: { ...draft.dates.birthdays, [id]: e.target.value || null } } })
              }
            />
          </div>
        ))}
        <div className="field">
          <span className="field__label">{t('settings.anniversary')}</span>
          <input
            className="field__input"
            type="date"
            value={draft.dates.anniversary ?? ''}
            onChange={(e) => patch({ dates: { ...draft.dates, anniversary: e.target.value || null } })}
          />
        </div>
      </div>

      <div className="section">
        <span className="section__title">{t('settings.storage')}</span>
        <p className="hint">
          {!syncConfigured
            ? t('net.localOnly')
            : sync.lastSyncAt
              ? t('net.lastSync', { time: timeOfDay(sync.lastSyncAt, locale) })
              : t('net.lastSync', { time: t('net.never') })}
        </p>
        {sync.pending > 0 && <p className="hint">{t('settings.pendingItems', { count: sync.pending })}</p>}
        {syncConfigured && (
          <button className="button button--ghost" style={{ alignSelf: 'flex-start' }} onClick={() => void syncNow()}>
            {t('settings.syncNow')}
          </button>
        )}
      </div>

      <div className="section">
        <span className="section__title">{t('export.title')}</span>
        <p className="hint">{t('export.hint')}</p>
        <div className="answer__actions">
          <button className="button button--ghost" disabled={exporting === 'working'} onClick={exportAll}>
            {t('export.button')}
          </button>
          {exportLine && <span className="answer__foot">{exportLine}</span>}
        </div>
      </div>

      <div className="section">
        <span className="section__title">{t('settings.notifications')}</span>
        <p className="hint">
          {push === 'on'
            ? t('settings.pushOnHint')
            : push === 'denied'
              ? t('settings.pushDeniedHint')
              : push === 'unsupported'
                ? t('settings.pushUnsupportedHint')
                : t('settings.pushOffHint')}
        </p>
        {(push === 'on' || push === 'off') && (
          <button
            className="button button--ghost"
            style={{ alignSelf: 'flex-start' }}
            disabled={pushBusy}
            onClick={togglePush}
          >
            {push === 'on' ? t('settings.pushOff') : t('settings.pushOn')}
          </button>
        )}
      </div>

      {pair?.member === 'a' && syncConfigured && (
        <div className="section">
          <span className="section__title">{t('note.title', { name: partnerName })}</span>
          <p className="hint">{t('note.hint')}</p>
          <input
            className="field__input"
            value={note}
            maxLength={140}
            placeholder={t('note.placeholder')}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
          />
          <div className="answer__actions">
            <button className="button" disabled={noteState.kind === 'sending' || note.trim() === ''} onClick={send}>
              {t('note.send')}
            </button>
            {noteLine && <span className="answer__foot">{noteLine}</span>}
          </div>
        </div>
      )}

      {pair && (
        <div className="section">
          <span className="section__title">{t('settings.device')}</span>
          <p className="hint">{CITIES[cityOf(pair.member)].label}</p>
          <p className="hint">{t('settings.forgetHint')}</p>
          <button className="button button--ghost" style={{ alignSelf: 'flex-start' }} onClick={clearPair}>
            {t('settings.forget')}
          </button>
        </div>
      )}

      {taps >= 5 && <Diagnostics />}
    </div>
  );
}
