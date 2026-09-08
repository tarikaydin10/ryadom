import { memo, useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { CITIES, otherCity, type CityId } from '../content/cities';
import { dayAndMonth } from '../lib/format';
import { dateKey, dateKeyToMs, isValidDateKey } from '../lib/day';
import { daysUntil, displayName, reunionMoment, reunionProgress, sidesFor } from '../data/settings';
import { useSettings } from '../data/settings-context';
import { getPair } from '../data/pair';

/**
 * The reunion: the way there, and a way to look at that day.
 *
 * It used to be a quiet line that became a card within a month. Now it is a
 * card whenever a date exists, because a date is the thing the whole wait
 * points at, and it does two things a line could not:
 *
 * It shows the way. A thin line from the traveller's city to the other, and
 * a dot on it as far along as the wait is — the same fraction that moves the
 * traveller on the map (`reunionProgress`). Every day it is a little
 * further, which is the one honest thing to say about waiting, and the one
 * a number cannot.
 *
 * It goes there. A tap winds the sky to the hour of arrival on that day,
 * however far away: the light over both cities, the moon that night, the
 * sunset she will be looking at. The rail brings you back. Editing moved off
 * the tap to a small word of its own, because looking is the commoner wish.
 *
 * Without a date there is nothing to look at and everything to do, so the
 * card is the quiet line it was, and the tap opens the editor.
 */

interface Props {
  /** The moment the sky is showing — to know when it is showing that day. */
  shownMs: number;
  /** Wind the sky to a moment, past the fortnight the rail allows. */
  onJump(ms: number): void;
}

export const CountdownCard = memo(function CountdownCard({ shownMs, onJump }: Props) {
  const { t, tp, locale } = useI18n();
  const { settings, update } = useSettings();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(settings.reunion.date ?? '');
  const [city, setCity] = useState<CityId>(settings.reunion.city);
  const [time, setTime] = useState(settings.reunion.time ?? '');

  useEffect(() => {
    setDate(settings.reunion.date ?? '');
    setCity(settings.reunion.city);
    setTime(settings.reunion.time ?? '');
  }, [settings.reunion.date, settings.reunion.city, settings.reunion.time]);

  /**
   * The start of the wait is the day the date was set. Stamped here rather
   * than typed: nobody should have to say when they started waiting. A date
   * from before the stamp existed gets today, which makes its line start
   * now — honest enough, and it moves from tomorrow.
   */
  useEffect(() => {
    if (!settings.reunion.date || settings.reunion.since) return;
    void update({ ...settings, reunion: { ...settings.reunion, since: dateKey() } });
  }, [settings, update]);

  const commit = () => {
    const next = date && isValidDateKey(date) ? date : null;
    void update({
      ...settings,
      reunion: {
        date: next,
        city,
        time: /^\d{2}:\d{2}$/.test(time) ? time : null,
        // A new date is a new wait; the same date keeps its start.
        since: next === settings.reunion.date ? settings.reunion.since : next ? dateKey() : null,
      },
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="countdown countdown--editing">
        <span className="countdown__kicker">{t('settings.reunion')}</span>
        <input
          className="field__input"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          autoFocus
        />
        {/* The hour of arrival, in the reunion city's own time. Optional: a
            date is a plan, an hour is a ticket. */}
        <label className="countdown__time">
          <span className="field__label">{t('countdown.arrivalTime')}</span>
          <input className="field__input" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </label>
        <div className="segment">
          {(Object.keys(CITIES) as CityId[]).map((id) => (
            <button
              key={id}
              className={id === city ? 'segment__item segment__item--active' : 'segment__item'}
              onClick={() => setCity(id)}
            >
              {CITIES[id].label}
            </button>
          ))}
        </div>
        <div className="answer__actions">
          <button className="button" onClick={commit}>
            {t('settings.save')}
          </button>
          <button className="button button--ghost" onClick={() => setEditing(false)}>
            {t('answer.cancel')}
          </button>
        </div>
      </div>
    );
  }

  const { date: reunionDate, city: reunionCity, time: reunionTime } = settings.reunion;
  const days = reunionDate ? daysUntil(reunionDate) : null;
  /**
   * The day has passed and nothing new is booked: the card turns round and
   * counts the other way. "Twelve days since Hamburg" keeps the time you had
   * on the screen instead of a "today" that stayed true for a month, and it
   * is the quietest possible way of asking for the next date.
   */
  const since = days !== null && days < 0;

  // Which of you travels is derived, not stored: the reunion city is one of the
  // two, and each device knows which side it is standing on.
  const sides = sidesFor(getPair()?.member ?? 'a', settings);
  const moment = reunionMoment(settings.reunion);
  const progress = reunionProgress(settings.reunion, shownMs);
  // Showing that day: the sky is wound to within a few hours of the arrival.
  const there = moment !== null && Math.abs(shownMs - moment) < 6 * 60 * 60 * 1000 && !since;

  const sentence = (): string => {
    if (!reunionDate) return t('countdown.unset');
    const when = dayAndMonth(dateKeyToMs(reunionDate), locale);
    const cityLabel = CITIES[reunionCity].label;
    if (since) return t('countdown.since', { city: cityLabel, date: when });
    const imminent = days !== null && days <= 1;
    const name = displayName(sides.partnerName, locale);
    const at = reunionTime ?? '';
    if (reunionCity === sides.yours) {
      if (imminent) return at ? t('countdown.arrivesSoonAt', { name, time: at }) : t('countdown.arrivesSoon', { name });
      return at ? t('countdown.arrivesAt', { name, date: when, time: at }) : t('countdown.arrives', { name, date: when });
    }
    /* The city keeps its own name here too, inside either language. */
    if (imminent) return at ? t('countdown.youTravelSoonAt', { city: cityLabel, time: at }) : t('countdown.youTravelSoon', { city: cityLabel });
    return at ? t('countdown.youTravelAt', { city: cityLabel, date: when, time: at }) : t('countdown.youTravel', { city: cityLabel, date: when });
  };

  // No date: the quiet line, and the tap is the way to set one.
  if (!reunionDate || days === null) {
    return (
      <button className="countdown" onClick={() => setEditing(true)}>
        <span className="countdown__where">{sentence()}</span>
        <span className="countdown__action">{t('countdown.set')}</span>
      </button>
    );
  }

  const count = since ? -days : days;
  const origin = otherCity(reunionCity);

  return (
    <div className={there ? 'countdown countdown--card countdown--there' : 'countdown countdown--card'}>
      {/* The tap: that day, in the sky. Everything that reads is inside it;
          only the small word to change the date sits outside. */}
      <button
        className="countdown__look"
        onClick={() => {
          if (moment !== null && !since) onJump(moment);
        }}
      >
        <span className="countdown__kicker">
          {there ? t('countdown.there') : since ? t('countdown.kickerSince') : t('countdown.kicker')}
          {' · '}
          {CITIES[reunionCity].label}
        </span>

        <span className="countdown__row">
          <span className="countdown__count">
            {count <= 0 && !since ? (
              <span className="countdown__word">{t('countdown.today')}</span>
            ) : count === 1 && !since ? (
              <span className="countdown__word">{t('countdown.tomorrow')}</span>
            ) : (
              <>
                <span className="countdown__number">{count}</span>
                {/* Russian needs день / дня / дней — Intl.PluralRules picks the form. */}
                <span className="countdown__unit">{tp('countdown.days', count)}</span>
              </>
            )}
          </span>
          <span className="countdown__where">{sentence()}</span>
        </span>

        {/* The way there: the traveller's city to the other, and the dot as
            far along as the wait is. The same fraction as on the map. */}
        {progress !== null && !since && (
          <span className="countdown__way" aria-hidden="true">
            <span className="countdown__end">{CITIES[origin].label}</span>
            <span className="countdown__track">
              <span className="countdown__done" style={{ width: `${Math.round(progress * 100)}%` }} />
              <span className="countdown__dot" style={{ left: `${Math.round(progress * 100)}%` }} />
            </span>
            <span className="countdown__end countdown__end--to">{CITIES[reunionCity].label}</span>
          </span>
        )}
        {!since && <span className="countdown__hint">{there ? t('countdown.backHint') : t('countdown.lookHint')}</span>}
      </button>

      <button className="countdown__change" onClick={() => setEditing(true)}>
        {t('countdown.change')}
      </button>
    </div>
  );
});
