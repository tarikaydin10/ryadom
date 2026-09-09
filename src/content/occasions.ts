import * as SunCalc from 'suncalc';
import { CITIES } from './cities';
import { DAY_MS, dateKeyToMs, startOfPairDay } from '../lib/day';
import type { Question } from './questions';

/**
 * Questions that come from the sky.
 *
 * The app already knows more about the day than any list of questions does:
 * when the moon is full over both cities, which evening is the first the sun
 * sets before six in Hamburg, the night the clocks in Hamburg move and the
 * hour between the two of you appears or goes. On such a day the question of
 * the day is about it. Nobody else can ask these, because nobody else has the
 * sky built in.
 *
 * Every rule here is a function of the date alone — SunCalc and a time zone
 * table, both of which the two phones share — so both derive the same
 * question with no server in reach, which is the promise round zero makes
 * (ADR-0012). Weather is deliberately absent: two phones fetch two forecasts
 * at two moments, and a question the two of you are not both being asked is
 * worse than no question. If rain over both cities is ever to ask something,
 * the server has to be the one to see the rain.
 *
 * A day with an occasion has its question of the day; a day with a question
 * of your own waiting keeps that (ADR-0016) and the sky waits for the next
 * occasion. Ids start with `o-` so the server can tell them from the table's
 * and from yours.
 */

const HOUR_MS = 60 * 60 * 1000;

/** Sunrise and sunset on a date, for a city, as instants — or null in the polar cases. */
function sunTimes(date: string, city: keyof typeof CITIES): { rise: number; set: number } | null {
  const { lat, lon } = CITIES[city];
  const times = SunCalc.getTimes(new Date(dateKeyToMs(date)), lat, lon);
  const rise = times.sunrise?.getTime();
  const set = times.sunset?.getTime();
  if (!rise || !set || Number.isNaN(rise) || Number.isNaN(set)) return null;
  return { rise, set };
}

const dayLength = (date: string): number | null => {
  const times = sunTimes(date, 'hamburg');
  return times ? times.set - times.rise : null;
};

const shift = (date: string, days: number): string => {
  const d = new Date(dateKeyToMs(date) + days * DAY_MS);
  return d.toISOString().slice(0, 10);
};

/** Wall-clock hour (with minutes as a fraction) of an instant in a city. */
function localHour(ms: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date(ms))
    .reduce<Record<string, string>>((acc, part) => ({ ...acc, [part.type]: part.value }), {});
  return Number(parts.hour) + Number(parts.minute) / 60;
}

/** A city's offset from UTC at an instant, in hours. */
function offsetHours(ms: number, tz: string): number {
  const name = new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'longOffset' })
    .formatToParts(new Date(ms))
    .find((part) => part.type === 'timeZoneName')?.value;
  const match = name ? /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name) : null;
  if (!match) return 0;
  return (match[1] === '-' ? -1 : 1) * (Number(match[2]) + Number(match[3] ?? 0) / 60);
}

/** How many hours the clocks of the two cities differ at local noon of a date. */
function clockGap(date: string): number {
  const noon = dateKeyToMs(date);
  return Math.abs(offsetHours(noon, CITIES.kaliningrad.tz) - offsetHours(noon, CITIES.hamburg.tz));
}

/** The moon's phase (0 new, 0.5 full, 1 new again) at an instant. */
const phaseAt = (ms: number): number => SunCalc.getMoonIllumination(new Date(ms)).phase;

/** The first day a condition holds, out of a run of days that do not. */
const first = (date: string, holds: (date: string) => boolean): boolean => holds(date) && !holds(shift(date, -1));

interface Rule {
  question: Question;
  holds(date: string): boolean;
}

/**
 * In order of precedence: the rarer the event, the earlier it stands. Two on
 * one day is a once-in-years coincidence, and the rarer one wins it.
 */
const RULES: Rule[] = [
  {
    question: {
      id: 'o-longest-day',
      en: 'The longest day of the year. What will you do with the extra light?',
      ru: 'Самый длинный день в году. На что ты потратишь лишний свет?',
    },
    holds: (date) => {
      const [before, now, after] = [dayLength(shift(date, -1)), dayLength(date), dayLength(shift(date, 1))];
      return now !== null && before !== null && after !== null && now > before && now >= after && now > 15 * HOUR_MS;
    },
  },
  {
    question: {
      id: 'o-shortest-day',
      en: 'The shortest day of the year. From tomorrow the light comes back — what do you want it to find you doing?',
      ru: 'Самый короткий день в году. С завтрашнего дня света прибавится — за чем ты хочешь, чтобы он тебя застал?',
    },
    holds: (date) => {
      const [before, now, after] = [dayLength(shift(date, -1)), dayLength(date), dayLength(shift(date, 1))];
      return now !== null && before !== null && after !== null && now < before && now <= after && now < 9 * HOUR_MS;
    },
  },
  {
    // Day and night as the two of you see them — sunrise to sunset — not the
    // astronomer's instant, which falls a few days off this one.
    question: {
      id: 'o-equinox-spring',
      en: 'Day and night are the same length today, for both of you. What is finally in balance for you?',
      ru: 'Сегодня день и ночь равны — у вас обоих. Что у тебя наконец пришло в равновесие?',
    },
    holds: (date) => crossesTwelveHours(date) && (dayLength(date) ?? 0) > (dayLength(shift(date, -3)) ?? 0),
  },
  {
    question: {
      id: 'o-equinox-autumn',
      en: 'From tonight the nights are longer than the days. What do you want to keep warm through the winter?',
      ru: 'С этой ночи ночи длиннее дней. Что ты хочешь сберечь тёплым до весны?',
    },
    holds: (date) => crossesTwelveHours(date) && (dayLength(date) ?? 0) < (dayLength(shift(date, -3)) ?? 0),
  },
  {
    // Kaliningrad keeps one clock all year; Hamburg moves. The hour between
    // the two of you appears on an October night and goes on a March night.
    question: {
      id: 'o-clocks-apart',
      en: 'From tonight your clocks are an hour apart again. What will you do with the hour Hamburg got back?',
      ru: 'С этой ночи между вашими часами снова час разницы. На что уйдёт час, который в Hamburg вернули?',
    },
    holds: (date) => clockGap(date) < clockGap(shift(date, 1)),
  },
  {
    question: {
      id: 'o-clocks-together',
      en: 'From tonight your clocks say the same time. What would you do at the same minute, in both cities?',
      ru: 'С этой ночи ваши часы показывают одно и то же. Что бы вы сделали в одну и ту же минуту — в обоих городах?',
    },
    holds: (date) => clockGap(date) > clockGap(shift(date, 1)),
  },
  {
    // Thirteen a year, and the one event in the list the two of them can
    // both actually go and look at — so the wording turns with the lunation,
    // and the same moon is not asked the same thing all year.
    question: {
      id: 'o-full-moon',
      en: 'The moon is full tonight over both of you. Where will you look at it from?',
      ru: 'Сегодня над вами обоими полная луна. Откуда ты будешь на неё смотреть?',
    },
    holds: (date) => {
      const start = startOfPairDay(dateKeyToMs(date));
      return phaseAt(start) < 0.5 && phaseAt(start + DAY_MS) >= 0.5;
    },
  },
  {
    question: {
      id: 'o-sunset-before-six',
      en: 'From today the sun sets before six in Hamburg. What do your evenings become in the dark half of the year?',
      ru: 'С сегодняшнего дня в Hamburg солнце садится раньше шести. Какими становятся твои вечера в тёмную половину года?',
    },
    holds: (date) => first(date, (d) => setsBefore(d, 18) && (dayLength(d) ?? 0) < (dayLength(shift(d, -3)) ?? 0)),
  },
  {
    question: {
      id: 'o-sunset-after-nine',
      en: 'From today the sun sets after nine in Hamburg. What do you do with a long evening?',
      ru: 'С сегодняшнего дня в Hamburg солнце садится после девяти. Что ты делаешь с длинным вечером?',
    },
    holds: (date) => first(date, (d) => !setsBefore(d, 21) && (dayLength(d) ?? 0) > (dayLength(shift(d, -3)) ?? 0)),
  },
];

/** True when day length passes twelve hours between this date and the next, or did between the last and this. */
function crossesTwelveHours(date: string): boolean {
  const here = dayLength(date);
  if (here === null) return false;
  const diff = here - 12 * HOUR_MS;
  const side = (d: string) => {
    const length = dayLength(d);
    return length === null ? null : length - 12 * HOUR_MS;
  };
  const before = side(shift(date, -1));
  const after = side(shift(date, 1));
  // The crossing lies between two days; it belongs to the one nearer twelve.
  if (before !== null && Math.sign(before) !== Math.sign(diff) && Math.abs(diff) <= Math.abs(before)) return true;
  if (after !== null && Math.sign(after) !== Math.sign(diff) && Math.abs(diff) < Math.abs(after)) return true;
  return false;
}

/** Whether the sun sets in Hamburg before a given local hour on a date. */
function setsBefore(date: string, hour: number): boolean {
  const times = sunTimes(date, 'hamburg');
  return times !== null && localHour(times.set, CITIES.hamburg.tz) < hour;
}

const FULL_MOON_WORDINGS: Pick<Question, 'en' | 'ru'>[] = [
  {
    en: 'The moon is full tonight over both of you. Where will you look at it from?',
    ru: 'Сегодня над вами обоими полная луна. Откуда ты будешь на неё смотреть?',
  },
  {
    en: 'Full moon tonight, the same one over both cities. If it carried messages, what would you give it?',
    ru: 'Сегодня полнолуние, одно на оба города. Если бы луна передавала письма, что бы ты ей доверил(а)?',
  },
  {
    en: 'The moon is full again tonight. What has changed since the last one?',
    ru: 'Сегодня луна снова полная. Что изменилось с прошлого полнолуния?',
  },
];

/** Roughly which lunation a date falls in — enough to turn the wording. */
const LUNATION_DAYS = 29.530589;

/**
 * The pair's own days, asked by id.
 *
 * A birthday, the anniversary, the eve of a reunion: none of these can be
 * derived from the date alone, because they live in the settings, and two
 * phones with two states of the settings would derive two questions. So the
 * server, which holds the settings the two of them share, freezes the id on
 * round zero the way it freezes one of yours (`settle`), and the phone only
 * has to know the words for it. The name is filled in here, in the spelling
 * of each language, from the settings the phone has.
 */
const SPECIAL: Record<string, Pick<Question, 'en' | 'ru'>> = {
  'o-birthday-hamburg': {
    en: 'It is {name}’s birthday. What do you wish for the year ahead — for the two of you?',
    ru: '{name} — с днём рождения. Чего ты желаешь на год вперёд, вам обоим?',
  },
  'o-birthday-kaliningrad': {
    en: 'It is {name}’s birthday. What do you wish for the year ahead — for the two of you?',
    ru: '{name} — с днём рождения. Чего ты желаешь на год вперёд, вам обоим?',
  },
  'o-anniversary': {
    en: 'A year more, today. What do you know now that you did not a year ago?',
    ru: 'Сегодня ещё один год. Что ты знаешь теперь, чего не знал(а) год назад?',
  },
  'o-eve': {
    en: 'Tomorrow you are in the same room. What is the first thing you will say?',
    ru: 'Завтра вы в одной комнате. Что ты скажешь первым делом?',
  },
};

/** The city a special id belongs to, for the name in it. */
const cityIn = (id: string): 'hamburg' | 'kaliningrad' | null =>
  id === 'o-birthday-hamburg' ? 'hamburg' : id === 'o-birthday-kaliningrad' ? 'kaliningrad' : null;

/**
 * The words for an id the server froze on a round — one of the pair's own
 * days, or one of the sky's, which the server may name too. Null for an id
 * this build does not know, in which case the round falls back to the table
 * and the next update of the app will know it.
 */
export function occasionById(id: string, names: { en: string; ru: string } | ((city: 'hamburg' | 'kaliningrad') => { en: string; ru: string })): Question | null {
  const special = SPECIAL[id];
  if (special) {
    const city = cityIn(id);
    const name = city ? (typeof names === 'function' ? names(city) : names) : { en: '', ru: '' };
    return { id, en: special.en.replace('{name}', name.en), ru: special.ru.replace('{name}', name.ru) };
  }
  const rule = RULES.find((candidate) => candidate.question.id === id);
  return rule ? rule.question : null;
}

/** The sky's question for a date, if the sky has one. */
export function occasionFor(date: string): Question | null {
  for (const rule of RULES) {
    if (!rule.holds(date)) continue;
    if (rule.question.id !== 'o-full-moon') return rule.question;
    const lunation = Math.floor(dateKeyToMs(date) / DAY_MS / LUNATION_DAYS);
    const wording = FULL_MOON_WORDINGS[lunation % FULL_MOON_WORDINGS.length] ?? FULL_MOON_WORDINGS[0]!;
    return { ...rule.question, ...wording };
  }
  return null;
}

/** Whether an id names one of these — the server needs to know too. */
export const isOccasionId = (id: string): boolean => id.startsWith('o-');
