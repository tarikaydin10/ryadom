import { memo, useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { CITIES, type CityId } from '../content/cities';
import { dayAndMonth } from '../lib/format';
import { dateKeyToMs, isValidDateKey } from '../lib/day';
import { daysUntil, displayName, sidesFor } from '../data/settings';
import { useSettings } from '../data/settings-context';
import { getPair } from '../data/pair';

/**
 * The reunion, edited where it is read.
 *
 * It used to live in the settings screen, which was the wrong home twice over:
 * it is not a preference but a fact that changes whenever a flight moves, and a
 * card reading "not set" that does nothing when tapped is a dead end. Content
 * belongs to be edited where you look at it.
 *
 * It also used to be a black slab, permanently the loudest object on a warm
 * paper screen — and its most common state, by far, is that no date is booked
 * yet. So the biggest thing on the page was a prompt to do something. Its
 * weight now follows its meaning: a quiet line for a date that is months away
 * or not yet chosen, and a card once it is close enough to be an event. That
 * the card is there at all is then information, readable across a room.
 */

/** Where the reunion stops being a fact and starts being an event. */
const NEAR_DAYS = 30;

export const CountdownCard = memo(function CountdownCard() {
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

  const commit = () => {
    void update({
      ...settings,
      reunion: {
        date: date && isValidDateKey(date) ? date : null,
        city,
        time: /^\d{2}:\d{2}$/.test(time) ? time : null,
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
            date is a plan, an hour is a ticket, and the map only moves the
            traveller along the line once there is one. */}
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
  const near = days !== null && days >= 0 && days <= NEAR_DAYS;
  /**
   * The day has passed and nothing new is booked: the card turns round and
   * counts the other way. "Twelve days since Hamburg" keeps the time you had
   * on the screen instead of a "today" that stayed true for a month, and it
   * is the quietest possible way of asking for the next date — the number
   * goes up until somebody replaces it.
   */
  const since = days !== null && days < 0;

  // Which of you travels is derived, not stored: the reunion city is one of the
  // two, and each device knows which side it is standing on.
  const sides = sidesFor(getPair()?.member ?? 'a', settings);

  const sentence = (): string => {
    if (!reunionDate) return t('countdown.unset');
    const when = dayAndMonth(dateKeyToMs(reunionDate), locale);
    const city = CITIES[reunionCity].label;
    if (since) return t('countdown.since', { city, date: when });
    const imminent = days !== null && days <= 1;
    const name = displayName(sides.partnerName, locale);
    // With an hour set, the hour is the news once the day is this close; before
    // that the date is, and the hour would only lengthen the line.
    const at = reunionTime ?? '';
    if (reunionCity === sides.yours) {
      if (imminent) return at ? t('countdown.arrivesSoonAt', { name, time: at }) : t('countdown.arrivesSoon', { name });
      return t('countdown.arrives', { name, date: when });
    }
    /* The city keeps its own name here too, inside either language. */
    if (imminent) return at ? t('countdown.youTravelSoonAt', { city, time: at }) : t('countdown.youTravelSoon', { city });
    return t('countdown.youTravel', { city, date: when });
  };

  return (
    <button className={near ? 'countdown countdown--near' : 'countdown'} onClick={() => setEditing(true)}>
      <span className="countdown__where">{sentence()}</span>

      {/* Two states, two different things to ask of the reader. With no date
          there is nothing to read and everything to do, so the right-hand slot
          holds an empty control waiting to be filled — a chip, not a field:
          this is a value you set, and it should not be mistaken for the answer
          card, which is a page you write on. With a date it is a fact to be
          read, and all it owes the reader is a quiet sign that it can still be
          changed. */}
      {days === null ? (
        <span className="countdown__action">{t('countdown.set')}</span>
      ) : (
        <span className="countdown__count">
          {since ? (
            <>
              <span className="countdown__number">{-days}</span>
              <span className="countdown__unit">{tp('countdown.days', -days)}</span>
            </>
          ) : days <= 0 ? (
            <span className="countdown__word">{t('countdown.today')}</span>
          ) : days === 1 ? (
            <span className="countdown__word">{t('countdown.tomorrow')}</span>
          ) : (
            <>
              <span className="countdown__number">{days}</span>
              {/* Russian needs день / дня / дней — Intl.PluralRules picks the form. */}
              <span className="countdown__unit">{tp('countdown.days', days)}</span>
            </>
          )}
          <svg className="countdown__more" width="6" height="10" viewBox="0 0 6 10" fill="none" aria-hidden="true">
            <path d="M1 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  );
});
