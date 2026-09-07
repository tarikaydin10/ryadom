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
    // When the next question comes is the one thing the page cannot show, so
    // it is said under every open round: it is not a time, it is the two of
    // you. The second line is for when they have written and you have not —
    // then the wait is yours alone, and the sentence says what one tap buys.
    nextWhenBoth: 'The next question opens once you have both answered.',
    nextWhenYou: 'Write, and the answer opens — and with it the next question.',
    // The third round is the last one; saying so up front spares the wait for
    // a fourth question that is not coming.
    lastOfDay: 'The last one for today.',
    askedBy: '{name} asked this',
    askedByYou: 'Your question',
    machine: 'translated by machine',
    // The way to your own questions, from the place where wanting to ask one
    // actually happens.
    askSomething: 'Ask something of your own',
    // After adding one, for a few seconds: what happens to it now.
    added: 'Added. It is asked in the next round that opens.',
    // What is waiting in the pool. Hers is a fact, not a sentence — the
    // sentence stays on the server until its round.
    theirsWaiting: '{name} has a question waiting for you. It comes in the next round.',
    yoursWaiting: 'Yours waiting for a round: {count}',
  },

  answer: {
    you: 'You',
    placeholder: 'Tap to write …',
    placeholderUrgent: 'Tap to unlock their answer …',
    hidden: 'Visible once you have written.',
    notYet: 'Has not written yet.',
    send: 'Send',
    cancel: 'Cancel',
    edit: 'Edit',
    pending: 'saved on this device',
    // Between Send and the server's answer, when hers is waiting behind it:
    // what the send is about to buy, said while it is being bought.
    opening: 'Sending — their answer opens next.',
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
    // With an hour set, once the day is this close, the hour is the news.
    arrivesSoonAt: '{name} arrives at {time}',
    youTravelSoonAt: 'You travel to {city}, arriving at {time}',
    arrivalTime: 'Arrival, local time (optional)',
    // The day has passed and nothing new is booked: the count turns round.
    since: 'Since {city}, {date}',
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
    // The paper dims after dusk in your city. A device preference: whether to
    // read on dark paper at night is about the eyes holding this phone.
    paper: 'Paper',
    paperHint: 'After dusk where you are, the page dims to a warm dark. Pin it light if you would rather not.',
    paperSun: 'Follows the sun',
    paperLight: 'Always light',
    names: 'Names',
    // The pair's own days. On the day, the question of the day is about it.
    dates: 'Your days',
    datesHint: 'On a birthday, on your day, and on the eve of a reunion, the question of the day is about it.',
    birthday: 'Birthday · {name}',
    anniversary: 'Your day',
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
    notifications: 'Notifications',
    // Says what arrives and, just as importantly, what does not: the lock-in is
    // the app's promise and a notification must not be the way around it.
    pushOffHint: 'A quiet word when the other one has written. Never what they wrote — that stays behind your own answer.',
    pushOnHint: 'On for this device. Turning it off here stops it for this device only.',
    pushDeniedHint: 'Refused once, and only the phone can undo that: Settings → Notifications → Ryadom.',
    pushUnsupportedHint: 'Only in the app on your home screen. Add it there first, then open this screen again.',
    pushOn: 'Turn on',
    pushOff: 'Turn off',
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
    // A round you missed is not closed for good. Writing late buys the right
    // to read what they wrote; it does not open another round — the day is over.
    writeLate: 'Write now — their answer opens.',
    writeLateAlone: 'Write now.',
    // Shown under an answer that was written on a later day than the question.
    // Honesty about when, never a reproach.
    late: 'written later, on {date}',
    // The count of rounds both of you finished. It only ever grows; a missed
    // day changes it by nothing. That is the whole difference from a streak.
    count: {
      one: 'question answered by both of you',
      few: 'questions answered by both of you',
      many: 'questions answered by both of you',
      other: 'questions answered by both of you',
    } as Plural,
    since: 'since {date}',
    // Said once, on the round numbers, as a word rather than a firework.
    milestone: 'A milestone.',
    // A finished round from at least a week ago, put in front of you again.
    found: 'Found again',
    foundKicker: 'Found again · {date}',
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
    // The second field is behind this line rather than on the page: one box
    // is a place to say something, two are a form.
    addOther: 'Add it in the other language too',
    // Hers, not yet asked. Listed as existing, never as a sentence.
    sealed: '{name} has one waiting — you will read it when it is asked.',
    save: 'Add',
    list: 'Written by the two of you',
    // Says what the emptiness means, rather than only that it is empty: until
    // one of you writes one, the day's questions come out of the table.
    empty: 'Neither of you has written one yet — until then the questions come from the built-in list.',
    waiting: 'waiting to be asked',
    asked: 'asked on {date}',
    remove: 'Take it back',
  },

  export: {
    title: 'Export',
    hint: 'Everything on this device as two files — a text you can read anywhere, and the same as JSON. Your side of the record: a round you never answered stays closed here too.',
    button: 'Export everything',
    working: 'Gathering …',
    shared: 'Handed over.',
    downloaded: 'Downloaded.',
    failed: 'That did not work. Try again in a moment.',
    // Inside the text file.
    fileTitle: 'Everything written, exported',
    notWritten: 'not written',
    locked: 'closed — write yours to open it',
  },

  map: {
    label: 'The Baltic between both cities, with the night where it is',
    km: '{km} km',
    distance: 'As the crow flies',
    kmUnit: 'kilometres between you',
    light: 'Light',
    minEarlier: 'min earlier in {city}',
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
    nextWhenYou: 'Напиши — и ответ откроется, а с ним и следующий вопрос.',
    lastOfDay: 'Последний на сегодня.',
    askedBy: 'Спрашивает {name}',
    askedByYou: 'Твой вопрос',
    machine: 'машинный перевод',
    askSomething: 'Спросить о своём',
    added: 'Добавлено. Спросим в следующем раунде.',
    theirsWaiting: '{name} спрашивает — вопрос откроется в следующем раунде.',
    yoursWaiting: 'Твоих в очереди: {count}',
  },

  answer: {
    you: 'Ты',
    placeholder: 'Нажми, чтобы написать …',
    placeholderUrgent: 'Нажми, чтобы открыть ответ …',
    hidden: 'Появится, когда ты напишешь.',
    notYet: 'Ещё не написал(а).',
    send: 'Отправить',
    cancel: 'Отмена',
    edit: 'Изменить',
    pending: 'сохранено на этом устройстве',
    opening: 'Отправляем — и ответ откроется.',
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
    arrivesSoonAt: '{name} приезжает в {time}',
    youTravelSoonAt: 'Ты едешь в {city}, прибытие в {time}',
    arrivalTime: 'Прибытие, по местному времени (необязательно)',
    since: 'После встречи в {city}, {date}',
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
    paper: 'Бумага',
    paperHint: 'После заката у тебя страница темнеет — тёплым, не чёрным. Если не хочется, оставь светлой.',
    paperSun: 'Как солнце',
    paperLight: 'Всегда светлая',
    names: 'Имена',
    dates: 'Ваши даты',
    datesHint: 'В день рождения, в ваш день и накануне встречи вопрос дня будет об этом.',
    birthday: 'День рождения · {name}',
    anniversary: 'Ваш день',
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
    notifications: 'Уведомления',
    pushOffHint: 'Тихая весточка, когда другой написал. Никогда — сам ответ: он остаётся за твоим.',
    pushOnHint: 'Включено на этом устройстве. Выключение здесь касается только его.',
    pushDeniedHint: 'Один раз отказано, и вернуть это может только телефон: Настройки → Уведомления → «Рядом».',
    pushUnsupportedHint: 'Только в приложении с домашнего экрана. Добавь его туда и открой этот экран снова.',
    pushOn: 'Включить',
    pushOff: 'Выключить',
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
    writeLate: 'Написать сейчас — и ответ откроется.',
    writeLateAlone: 'Написать сейчас.',
    late: 'написано позже, {date}',
    count: {
      one: 'вопрос, на который ответили оба',
      few: 'вопроса, на которые ответили оба',
      many: 'вопросов, на которые ответили оба',
      other: 'вопроса, на которые ответили оба',
    },
    since: 'с {date}',
    milestone: 'Веха.',
    found: 'Нашлось снова',
    foundKicker: 'Нашлось снова · {date}',
  },

  questions: {
    title: 'Ваши собственные вопросы',
    intro: 'Напиши свой — его зададут в следующем раунде: ваши идут раньше встроенных.',
    add: 'Новый вопрос',
    yours: 'Твой вопрос',
    placeholder: 'О чём ты хочешь спросить?',
    translation: 'Тот же вопрос на другом языке',
    translationHint: 'Необязательно — оставь пустым, и он останется как написан.',
    addOther: 'Добавить и на другом языке',
    sealed: '{name} спрашивает — прочитаешь, когда придёт очередь.',
    save: 'Добавить',
    list: 'Написанное вами',
    empty: 'Никто из вас ещё не написал — пока их нет, вопросы приходят из встроенного списка.',
    waiting: 'ждёт своей очереди',
    asked: 'задан {date}',
    remove: 'Забрать назад',
  },

  export: {
    title: 'Экспорт',
    hint: 'Всё, что есть на этом устройстве, двумя файлами — текст, который откроется где угодно, и то же самое в JSON. Твоя сторона записи: раунд, на который ты не ответил(а), закрыт и здесь.',
    button: 'Экспортировать всё',
    working: 'Собираем …',
    shared: 'Передано.',
    downloaded: 'Скачано.',
    failed: 'Не получилось. Попробуй ещё раз чуть позже.',
    fileTitle: 'Всё написанное, экспорт',
    notWritten: 'не написано',
    locked: 'закрыто — напиши свой ответ, и откроется',
  },

  map: {
    label: 'Балтика между двумя городами, и ночь там, где она сейчас',
    km: '{km} км',
    distance: 'По прямой',
    kmUnit: 'километров между вами',
    light: 'Свет',
    minEarlier: 'мин раньше в {city}',
  },
};

export type Strings = typeof en;
export type Locale = 'en' | 'ru';

export const DICTIONARIES: Record<Locale, DeepStringShape<Strings>> = { en, ru };
