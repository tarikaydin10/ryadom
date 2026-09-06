/**
 * Every user-facing string lives here, in English and Russian.
 *
 * The one deliberate exception is city names: "Hamburg" and "Калининград" each
 * stay in their own language whatever the interface language is (see
 * `src/content/cities.ts`). They are the two fixed points of the app and the
 * design names each city the way its own people write it.
 *
 * `en` is the source of truth for the shape; `ru` is type-checked against it,
 * so a missing or misspelled key is a build error, not a blank label.
 */

export type Plural = { one: string; few: string; many: string; other: string };

export const en = {
  tabs: { today: 'Today', map: 'Map', chronicle: 'Chronicle', us: 'Us' },

  sky: {
    // Deliberately genderless and name-free: the same build runs on both
    // phones, so "she"/"он" would be wrong on one of them half the time.
    status: {
      bothNight: 'Night for both of you',
      bothDay: 'Daylight for both of you',
      bothTwilight: 'Twilight for both of you',
      // Morning: one side is waiting for light. Evening: one side has lost it.
      partnerFirst: 'There is light there, none with you yet',
      youFirst: 'You have light, they do not yet',
      partnerLast: 'They still have light, you do not',
      youLast: 'You still have light, they do not',
    },
    sunrise: 'sunrise',
    sunset: 'sunset',
    polarDay: 'sun stays up',
    polarNight: 'sun stays down',
    now: 'now',
    backToNow: 'back to now',
    // The rail's name for anyone who cannot see it. It names the three ways in,
    // because a slider that is only reachable by thumb is reachable by one
    // person in the pair on a good day.
    railLabel: 'Time — drag, tap or use the arrow keys to travel',
    label: 'Sky above both cities',
  },

  weather: {
    unavailable: 'weather unavailable',
    stale: 'last update {time}',
    conditions: {
      clear: 'clear',
      mostlyClear: 'mostly clear',
      cloudy: 'cloudy',
      overcast: 'overcast',
      fog: 'fog',
      drizzle: 'drizzle',
      rain: 'rain',
      freezingRain: 'freezing rain',
      snow: 'snow',
      showers: 'showers',
      snowShowers: 'snow showers',
      thunderstorm: 'thunderstorm',
    },
  },

  question: {
    kickerPlain: 'Today',
    loading: 'Loading the question …',
    // A day can hold more than one question now: the next one opens once you
    // have both answered the last. The kicker says which kind of moment this
    // is, so the second question does not read as the first one repeating.
    kickerMore: 'One more',
    dayFull: 'That is the day. Tomorrow there is more.',
    nextWhenBoth: 'The next question opens once you have both answered.',
    askedBy: '{name} asked this',
    askedByYou: 'Your question',
    machine: 'translated by machine',
    // The way to your own questions, from the place where wanting to ask one
    // actually happens.
    askSomething: 'Ask something of your own →',
  },

  answer: {
    you: 'You',
    placeholder: 'Tap to write …',
    placeholderUrgent: 'Tap to unlock their answer …',
    hidden: 'Visible once you have written.',
    notYet: 'Has not written yet.',
    waiting: 'Waiting for their answer.',
    send: 'Send',
    cancel: 'Cancel',
    edit: 'Edit',
    pending: 'saved on this device',
    synced: 'sent',
    writtenAt: 'wrote at {time}',
  },

  countdown: {
    kicker: 'Reunion',
    // The number is rendered separately, so these are the unit alone.
    days: { one: 'day', few: 'days', many: 'days', other: 'days' } as Plural,
    today: 'today',
    tomorrow: 'tomorrow',
    // Who moves, not just where. The direction is the emotionally distinct part
    // and each phone knows its own side, so each reads its own sentence.
    arrives: '{name} arrives on {date}',
    youTravel: 'You travel to {city} on {date}',
    // Once it is today or tomorrow the date says nothing the count has not
    // already said, so the sentence drops it.
    arrivesSoon: '{name} arrives',
    youTravelSoon: 'You travel to {city}',
    unset: 'No reunion date yet',
    // The empty slot's own label. An instruction, not a description: with no
    // date set there is nothing to read here and only something to do.
    set: 'Set the date',
  },

  net: {
    offline: 'Offline · your answers are saved on this device',
    syncing: 'Syncing …',
    syncFailed: 'Not synced yet — will retry',
    lastSync: 'Last sync {time}',
    never: 'never',
    localOnly: 'Local only — no sync server configured',
  },

  settings: {
    title: 'Us',
    language: 'Language',
    system: 'System',
    english: 'English',
    russian: 'Русский',
    names: 'Names',
    yourName: 'Your name',
    partnerName: 'Their name',
    reunion: 'Next reunion',
    reunionCity: 'City',
    sides: 'Sides',
    yourCity: 'You are in',
    storage: 'Data',
    pendingItems: '{count} change(s) waiting to sync',
    syncNow: 'Sync now',
    save: 'Save',
    saved: 'Saved',
    notSet: 'not set',
    device: 'This device',
    forget: 'Forget this device',
    forgetHint: 'Removes the passphrase from this device. Your answers stay on the server.',
    dayBoundary: 'The shared day starts at midnight in {tz}, so you both get the same question at the same moment.',
    // Reached by tapping the heading five times. The wording assumes the reader
    // is looking at a phone that is currently drawing itself wrong.
    diagnostics: 'Diagnostics',
    diagnosticsHint: 'What this phone measures right now. Copy it and send it over when the bar sits in the wrong place.',
    copy: 'Copy',
    copied: 'Copied',
  },

  lock: {
    intro: 'A private page for two. Enter the shared passphrase once — this device will not ask again.',
    side: 'Which side is this device?',
    passphrase: 'Passphrase',
    unlock: 'Unlock',
    checking: 'Checking …',
    wrong: 'That passphrase does not match.',
    offline: 'No connection, so the passphrase cannot be checked right now. Try again once you are online.',
    caveat: 'A lock, not encryption: whoever holds this phone unlocked can read the answers.',
  },

  chronicle: {
    empty: 'Nothing written down yet. Whatever you answer today will be here tomorrow.',
  },

  questions: {
    title: 'Questions of your own',
    intro: 'Write one and it is asked in the next round — yours come before the built-in ones.',
    add: 'A new question',
    yours: 'Your question',
    placeholder: 'What do you want to ask?',
    // Optional, and said so plainly: an empty second field means the other side
    // reads the sentence in the language it was written in, which is honest.
    translation: 'The same question in the other language',
    translationHint: 'Optional — leave it empty and it stays as you wrote it.',
    save: 'Add',
    list: 'Written by the two of you',
    // Says what the emptiness means, rather than only that it is empty: until
    // one of you writes one, the day's questions come out of the table.
    empty: 'Neither of you has written one yet — until then the questions come from the built-in list.',
    waiting: 'waiting to be asked',
    asked: 'asked on {date}',
    remove: 'Take it back',
  },

  soon: {
    map: 'The map comes later.',
  },
} as const;

type DeepStringShape<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends Plural ? Plural : DeepStringShape<T[K]>;
};

export const ru: DeepStringShape<typeof en> = {
  tabs: { today: 'Сегодня', map: 'Карта', chronicle: 'Хроника', us: 'Мы' },

  sky: {
    status: {
      bothNight: 'У вас обоих ночь',
      bothDay: 'У вас обоих светло',
      bothTwilight: 'У вас обоих сумерки',
      partnerFirst: 'Там уже светло, у тебя ещё нет',
      youFirst: 'У тебя уже светло, там ещё нет',
      partnerLast: 'Там ещё светло, у тебя уже нет',
      youLast: 'У тебя ещё светло, там уже нет',
    },
    sunrise: 'восход',
    sunset: 'закат',
    polarDay: 'солнце не заходит',
    polarNight: 'солнце не восходит',
    now: 'сейчас',
    backToNow: 'вернуться к сейчас',
    railLabel: 'Время — тяни, нажимай или листай стрелками',
    label: 'Небо над обоими городами',
  },

  weather: {
    unavailable: 'погода недоступна',
    stale: 'обновлено {time}',
    conditions: {
      clear: 'ясно',
      mostlyClear: 'малооблачно',
      cloudy: 'облачно',
      overcast: 'пасмурно',
      fog: 'туман',
      drizzle: 'морось',
      rain: 'дождь',
      freezingRain: 'ледяной дождь',
      snow: 'снег',
      showers: 'ливень',
      snowShowers: 'снегопад',
      thunderstorm: 'гроза',
    },
  },

  question: {
    kickerPlain: 'Сегодня',
    loading: 'Загружаем вопрос …',
    kickerMore: 'Ещё вопрос',
    dayFull: 'На сегодня всё. Завтра будет ещё.',
    nextWhenBoth: 'Следующий вопрос откроется, когда ответите оба.',
    askedBy: 'Спрашивает {name}',
    askedByYou: 'Твой вопрос',
    machine: 'машинный перевод',
    askSomething: 'Спросить о своём →',
  },

  answer: {
    you: 'Ты',
    placeholder: 'Нажми, чтобы написать …',
    placeholderUrgent: 'Нажми, чтобы открыть ответ …',
    hidden: 'Появится, когда ты напишешь.',
    notYet: 'Ещё не написал(а).',
    waiting: 'Ждём ответ.',
    send: 'Отправить',
    cancel: 'Отмена',
    edit: 'Изменить',
    pending: 'сохранено на этом устройстве',
    synced: 'отправлено',
    writtenAt: 'написано в {time}',
  },

  countdown: {
    kicker: 'Встреча',
    days: { one: 'день', few: 'дня', many: 'дней', other: 'дня' },
    today: 'сегодня',
    tomorrow: 'завтра',
    arrives: '{name} приезжает {date}',
    youTravel: 'Ты едешь в {city} {date}',
    arrivesSoon: '{name} приезжает',
    youTravelSoon: 'Ты едешь в {city}',
    unset: 'Встреча ещё не назначена',
    set: 'Назначить дату',
  },

  net: {
    offline: 'Офлайн · ответы сохраняются на устройстве',
    syncing: 'Синхронизация …',
    syncFailed: 'Пока не синхронизировано — попробуем ещё раз',
    lastSync: 'Синхронизация {time}',
    never: 'никогда',
    localOnly: 'Только локально — сервер не настроен',
  },

  settings: {
    title: 'Мы',
    language: 'Язык',
    system: 'Системный',
    english: 'English',
    russian: 'Русский',
    names: 'Имена',
    yourName: 'Твоё имя',
    partnerName: 'Её или его имя',
    reunion: 'Следующая встреча',
    reunionCity: 'Город',
    sides: 'Стороны',
    yourCity: 'Ты в городе',
    storage: 'Данные',
    pendingItems: 'Ждут отправки: {count}',
    syncNow: 'Синхронизировать',
    save: 'Сохранить',
    saved: 'Сохранено',
    notSet: 'не выбрано',
    device: 'Это устройство',
    forget: 'Забыть это устройство',
    forgetHint: 'Пароль удалится с устройства. Ответы останутся на сервере.',
    dayBoundary: 'Общий день начинается в полночь по зоне {tz} — так вопрос у вас обоих меняется одновременно.',
    diagnostics: 'Диагностика',
    diagnosticsHint: 'Что этот телефон измеряет прямо сейчас. Скопируй и пришли, если полоса стоит не на месте.',
    copy: 'Скопировать',
    copied: 'Скопировано',
  },

  lock: {
    intro: 'Личная страница на двоих. Введи общий пароль один раз — больше это устройство не спросит.',
    side: 'Какая сторона это устройство?',
    passphrase: 'Пароль',
    unlock: 'Войти',
    checking: 'Проверяем …',
    wrong: 'Пароль не подходит.',
    offline: 'Нет связи, пароль сейчас не проверить. Попробуй, когда появится интернет.',
    caveat: 'Это замок, а не шифрование: кто держит разблокированный телефон, тот читает ответы.',
  },

  chronicle: {
    empty: 'Пока ничего не записано. То, что вы ответите сегодня, будет здесь завтра.',
  },

  questions: {
    title: 'Ваши собственные вопросы',
    intro: 'Напиши свой — его зададут в следующем раунде: ваши идут раньше встроенных.',
    add: 'Новый вопрос',
    yours: 'Твой вопрос',
    placeholder: 'О чём ты хочешь спросить?',
    translation: 'Тот же вопрос на другом языке',
    translationHint: 'Необязательно — оставь пустым, и он останется как написан.',
    save: 'Добавить',
    list: 'Написанное вами',
    empty: 'Никто из вас ещё не написал — пока их нет, вопросы приходят из встроенного списка.',
    waiting: 'ждёт своей очереди',
    asked: 'задан {date}',
    remove: 'Забрать назад',
  },

  soon: {
    map: 'Карта появится позже.',
  },
};

export type Strings = typeof en;
export type Locale = 'en' | 'ru';

export const DICTIONARIES: Record<Locale, DeepStringShape<Strings>> = { en, ru };
