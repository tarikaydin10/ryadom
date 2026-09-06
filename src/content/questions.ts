import { dateKeyToMs } from '../lib/day';
import type { Locale } from '../i18n';

/**
 * The questions ship with the app.
 *
 * They could have come from the server, but then the most important element of
 * the home screen would be the one thing that fails without a connection. Bundled,
 * the question of the day is always there — on a plane, in a dead spot, on a
 * phone that has not synced in a week. Both devices derive the same question from
 * the same shared date key, so the two of them are never answering different
 * questions.
 */
export interface Question {
  id: string;
  en: string;
  ru: string;
}

export const QUESTIONS: Question[] = [
  { id: 'q001', en: 'What made you laugh today?', ru: 'Что тебя сегодня рассмешило?' },
  { id: 'q002', en: 'What did the sky look like where you are?', ru: 'Какое сегодня у тебя было небо?' },
  { id: 'q003', en: 'What small thing went right today?', ru: 'Что маленькое сегодня получилось?' },
  { id: 'q004', en: 'Who did you talk to today that you did not expect to?', ru: 'С кем ты сегодня неожиданно поговорил(а)?' },
  { id: 'q005', en: 'What are you putting off?', ru: 'Что ты откладываешь?' },
  { id: 'q006', en: 'What did you eat that was worth it?', ru: 'Что ты сегодня ел(а), и это стоило того?' },
  { id: 'q007', en: 'What song stayed with you today?', ru: 'Какая песня осталась с тобой сегодня?' },
  { id: 'q008', en: 'Where did you walk today?', ru: 'Где ты сегодня гулял(а)?' },
  { id: 'q009', en: 'What do you want to show me when we are in the same room?', ru: 'Что ты хочешь мне показать, когда мы будем в одной комнате?' },
  { id: 'q010', en: 'What was the first thing you thought about this morning?', ru: 'О чём ты подумал(а) утром первым делом?' },
  { id: 'q011', en: 'What are you tired of?', ru: 'От чего ты устал(а)?' },
  { id: 'q012', en: 'What did you notice today that you usually walk past?', ru: 'Что ты сегодня заметил(а), мимо чего обычно проходишь?' },
  { id: 'q013', en: 'What would you do with a free afternoon tomorrow?', ru: 'Что бы ты сделал(а) со свободным завтрашним днём?' },
  { id: 'q014', en: 'What did someone say to you today that stuck?', ru: 'Чьи слова сегодня у тебя остались в голове?' },
  { id: 'q015', en: 'What smells like home to you right now?', ru: 'Что для тебя сейчас пахнет домом?' },
  { id: 'q016', en: 'What are you looking forward to this week?', ru: 'Чего ты ждёшь на этой неделе?' },
  { id: 'q017', en: 'What was hard today?', ru: 'Что сегодня было трудно?' },
  { id: 'q018', en: 'What did you learn this week?', ru: 'Что ты узнал(а) на этой неделе?' },
  { id: 'q019', en: 'What do you miss that is not a person?', ru: 'По чему ты скучаешь, если не считать людей?' },
  { id: 'q020', en: 'What would you like me to ask you more often?', ru: 'О чём мне стоит спрашивать тебя чаще?' },
  { id: 'q021', en: 'What is the last thing you took a photo of?', ru: 'Что ты фотографировал(а) в последний раз?' },
  { id: 'q022', en: 'What were you wrong about lately?', ru: 'В чём ты недавно ошибался(ась)?' },
  { id: 'q023', en: 'What does your window show right now?', ru: 'Что сейчас видно из твоего окна?' },
  { id: 'q024', en: 'What are you proud of that nobody noticed?', ru: 'Чем ты гордишься, хотя никто не заметил?' },
  { id: 'q025', en: 'What would make tomorrow easier?', ru: 'Что сделало бы завтрашний день легче?' },
  { id: 'q026', en: 'What do you want to do first when we meet?', ru: 'Что ты хочешь сделать первым, когда мы встретимся?' },
  { id: 'q027', en: 'What did you postpone that you should just do?', ru: 'Что ты откладываешь, хотя стоило бы просто сделать?' },
  { id: 'q028', en: 'What was quiet and good today?', ru: 'Что сегодня было тихим и хорошим?' },
  { id: 'q029', en: 'Who do you owe a message?', ru: 'Кому ты должен(а) написать?' },
  { id: 'q030', en: 'What are you reading or watching?', ru: 'Что ты сейчас читаешь или смотришь?' },
  { id: 'q031', en: 'What did the weather do to your mood today?', ru: 'Как погода сегодня повлияла на твоё настроение?' },
  { id: 'q032', en: 'What is one thing you would change about today?', ru: 'Что бы ты изменил(а) в сегодняшнем дне?' },
  { id: 'q033', en: 'What did you buy or almost buy?', ru: 'Что ты купил(а) или почти купил(а)?' },
  { id: 'q034', en: 'What made you impatient today?', ru: 'Что сегодня выводило тебя из терпения?' },
  { id: 'q035', en: 'Which room in your day was the best one?', ru: 'В какой комнате сегодня было лучше всего?' },
  { id: 'q036', en: 'What do you want to remember from this month?', ru: 'Что ты хочешь запомнить из этого месяца?' },
  { id: 'q037', en: 'What did you do just for yourself today?', ru: 'Что ты сегодня сделал(а) только для себя?' },
  { id: 'q038', en: 'What is on your desk right now?', ru: 'Что сейчас лежит у тебя на столе?' },
  { id: 'q039', en: 'When did you last feel completely calm?', ru: 'Когда ты в последний раз был(а) совершенно спокоен (спокойна)?' },
  { id: 'q040', en: 'What are you avoiding thinking about?', ru: 'О чём ты стараешься не думать?' },
  { id: 'q041', en: 'What was the best five minutes of today?', ru: 'Какие пять минут сегодня были лучшими?' },
  { id: 'q042', en: 'What would you cook for me tonight?', ru: 'Что бы ты приготовил(а) для меня сегодня вечером?' },
  { id: 'q043', en: 'What did you almost say today and did not?', ru: 'Что ты сегодня почти сказал(а), но не сказал(а)?' },
  { id: 'q044', en: 'What is getting better?', ru: 'Что становится лучше?' },
  { id: 'q045', en: 'What sound do you hear most often where you live?', ru: 'Какой звук ты чаще всего слышишь там, где живёшь?' },
  { id: 'q046', en: 'What do you want more of next week?', ru: 'Чего ты хочешь больше на следующей неделе?' },
  { id: 'q047', en: 'Who did you think about today?', ru: 'О ком ты сегодня думал(а)?' },
  { id: 'q048', en: 'What is the smallest thing that would make you happy tomorrow?', ru: 'Какая самая маленькая вещь порадовала бы тебя завтра?' },
  { id: 'q049', en: 'What did you say no to recently?', ru: 'Чему ты недавно сказал(а) «нет»?' },
  { id: 'q050', en: 'What feels unfinished right now?', ru: 'Что сейчас кажется незаконченным?' },
  { id: 'q051', en: 'What was the last kind thing someone did for you?', ru: 'Что доброго для тебя недавно сделали?' },
  { id: 'q052', en: 'What are you carrying around that you could put down?', ru: 'Что ты носишь с собой, хотя мог(ла) бы отпустить?' },
  { id: 'q053', en: 'What do you wish I understood better?', ru: 'Что бы ты хотел(а), чтобы я понимал(а) лучше?' },
  { id: 'q054', en: 'What was today in three words?', ru: 'Каким был сегодняшний день в трёх словах?' },
  { id: 'q055', en: 'What place do you want us to see together?', ru: 'Какое место ты хочешь увидеть вместе?' },
  { id: 'q056', en: 'What made the distance smaller today?', ru: 'Что сегодня сделало расстояние меньше?' },
  // --- From here on: added 2026-09-06 for three rounds a day. The first 56
  // above are asked in that order for every day before the epoch below and
  // must not be moved; everything after is reached only through the new
  // formula, so order here is free.
  { id: 'q057', en: 'What did you do with your hands today?', ru: 'Что ты сегодня делал(а) руками?' },
  { id: 'q058', en: 'What did you overhear today?', ru: 'Что ты сегодня случайно подслушал(а)?' },
  { id: 'q059', en: 'Which street do you know best right now?', ru: 'Какую улицу ты сейчас знаешь лучше всего?' },
  { id: 'q060', en: 'What did you throw away today?', ru: 'Что ты сегодня выбросил(а)?' },
  { id: 'q061', en: 'What are you wearing that you like?', ru: 'Что на тебе сейчас такое, что тебе нравится?' },
  { id: 'q062', en: 'What was the last thing that surprised you?', ru: 'Что тебя удивило в последний раз?' },
  { id: 'q063', en: 'What would you tell yourself a year ago?', ru: 'Что бы ты сказал(а) себе год назад?' },
  { id: 'q064', en: 'What time of day is yours?', ru: 'Какое время суток — твоё?' },
  { id: 'q065', en: 'What did you fix today, or try to?', ru: 'Что ты сегодня починил(а) — или пытался(ась)?' },
  { id: 'q066', en: 'Where were you standing when you last thought of me?', ru: 'Где ты стоял(а), когда в последний раз думал(а) обо мне?' },
  { id: 'q067', en: 'What is the best thing in your fridge?', ru: 'Что самое лучшее сейчас в твоём холодильнике?' },
  { id: 'q068', en: 'Which word have you been using too much?', ru: 'Какое слово ты последнее время повторяешь слишком часто?' },
  { id: 'q069', en: 'What did you want to be at ten?', ru: 'Кем ты хотел(а) стать в десять лет?' },
  { id: 'q070', en: 'What would you put in a letter you never sent?', ru: 'Что бы ты написал(а) в письме, которое так и не отправил(а)?' },
  { id: 'q071', en: 'What did the light do at your window this evening?', ru: 'Каким был свет в твоём окне сегодня вечером?' },
  { id: 'q072', en: 'What are you better at than you admit?', ru: 'Что у тебя получается лучше, чем ты признаёшь?' },
  { id: 'q073', en: 'What made you stop and look today?', ru: 'Что сегодня заставило тебя остановиться и посмотреть?' },
  { id: 'q074', en: 'Who taught you something without meaning to?', ru: 'Кто научил тебя чему-то, сам(а) того не заметив?' },
  { id: 'q075', en: 'What do you keep in your pocket or bag that you never use?', ru: 'Что ты носишь в кармане или сумке и никогда не используешь?' },
  { id: 'q076', en: 'What did you cook or eat that reminded you of someone?', ru: 'Что из еды сегодня напомнило тебе о ком-то?' },
  { id: 'q077', en: 'What have you stopped doing that you used to love?', ru: 'Что ты перестал(а) делать из того, что когда-то любил(а)?' },
  { id: 'q078', en: 'What sound would you like to send me right now?', ru: 'Какой звук ты бы хотел(а) отправить мне прямо сейчас?' },
  { id: 'q079', en: 'What would our day look like if we had it here, together?', ru: 'Каким был бы этот день, если бы мы провели его здесь, вдвоём?' },
  { id: 'q080', en: 'What is the oldest thing you own?', ru: 'Какая самая старая вещь у тебя есть?' },
  { id: 'q081', en: 'What did you do slowly today?', ru: 'Что ты сегодня делал(а) медленно?' },
  { id: 'q082', en: 'What did you decide today?', ru: 'Что ты сегодня решил(а)?' },
  { id: 'q083', en: 'What do you want to ask me and have not?', ru: 'О чём ты хочешь меня спросить, но ещё не спросил(а)?' },
  { id: 'q084', en: 'What did you look up today?', ru: 'Что ты сегодня искал(а) в интернете?' },
  { id: 'q085', en: 'What do you hear when it is completely quiet where you are?', ru: 'Что ты слышишь, когда у тебя совсем тихо?' },
  { id: 'q086', en: 'Which of your habits would surprise me?', ru: 'Какая из твоих привычек меня бы удивила?' },
  { id: 'q087', en: 'What did you finish today?', ru: 'Что ты сегодня закончил(а)?' },
  { id: 'q088', en: 'What did you start today?', ru: 'Что ты сегодня начал(а)?' },
  { id: 'q089', en: 'What is the view from your favourite seat?', ru: 'Что видно с твоего любимого места?' },
  { id: 'q090', en: 'What would you like to be asked about your day?', ru: 'О чём бы ты хотел(а), чтобы тебя спросили про твой день?' },
  { id: 'q091', en: 'What do you do when you cannot sleep?', ru: 'Что ты делаешь, когда не можешь уснуть?' },
  { id: 'q092', en: 'What is the last thing you said out loud today?', ru: 'Что ты сегодня сказал(а) вслух последним?' },
  { id: 'q093', en: 'What is growing near you right now?', ru: 'Что сейчас растёт рядом с тобой?' },
  { id: 'q094', en: 'What did you carry home today?', ru: 'Что ты сегодня принёс(ла) домой?' },
  { id: 'q095', en: 'What was the coldest and the warmest moment of today?', ru: 'Какой момент сегодня был самым холодным, а какой — самым тёплым?' },
  { id: 'q096', en: 'What made you feel far away today?', ru: 'Из-за чего ты сегодня чувствовал(а) себя далеко?' },
  { id: 'q097', en: 'What made you feel close today?', ru: 'Из-за чего ты сегодня чувствовал(а) себя близко?' },
  { id: 'q098', en: 'What are you saving for later?', ru: 'Что ты бережёшь на потом?' },
  { id: 'q099', en: 'What did you say yes to today?', ru: 'Чему ты сегодня сказал(а) «да»?' },
  { id: 'q100', en: 'Which door did you walk through most often today?', ru: 'Через какую дверь ты сегодня проходил(а) чаще всего?' },
  { id: 'q101', en: 'What did you notice about your own city today that a visitor would?', ru: 'Что ты сегодня заметил(а) в своём городе, что заметил бы приезжий?' },
  { id: 'q102', en: 'What do you want to tell me before you forget it?', ru: 'Что ты хочешь мне рассказать, пока не забыл(а)?' },
  { id: 'q103', en: 'What did you do for the first time recently?', ru: 'Что ты недавно сделал(а) впервые?' },
  { id: 'q104', en: 'What is the last thing you wrote by hand?', ru: 'Что ты в последний раз написал(а) от руки?' },
  { id: 'q105', en: 'What do you want to keep exactly as it is?', ru: 'Что ты хочешь сохранить ровно таким, как есть?' },
  { id: 'q106', en: 'What took longer than it should have today?', ru: 'Что сегодня заняло больше времени, чем должно было?' },
  { id: 'q107', en: 'Where did you sit down today, and why there?', ru: 'Где ты сегодня присел(а) — и почему именно там?' },
  { id: 'q108', en: 'What did you disagree with today?', ru: 'С чем ты сегодня был(а) не согласен (не согласна)?' },
  { id: 'q109', en: 'What would you like to learn to make?', ru: 'Что бы ты хотел(а) научиться делать своими руками?' },
  { id: 'q110', en: 'What do you look at while you wait?', ru: 'На что ты смотришь, пока ждёшь?' },
  { id: 'q111', en: 'Which meal today would you have shared with me?', ru: 'Какой из сегодняшних приёмов пищи ты бы разделил(а) со мной?' },
  { id: 'q112', en: 'What did you leave behind today?', ru: 'Что ты сегодня оставил(а) позади?' },
  { id: 'q113', en: 'What made you soft today?', ru: 'Что сегодня тебя смягчило?' },
  { id: 'q114', en: 'What made you sharp today?', ru: 'Что сегодня сделало тебя резче?' },
  { id: 'q115', en: 'What did you want to photograph but did not?', ru: 'Что ты хотел(а) сфотографировать, но не стал(а)?' },
  { id: 'q116', en: 'What do you do differently when nobody is watching?', ru: 'Что ты делаешь иначе, когда никто не смотрит?' },
  { id: 'q117', en: 'What did you think about on the way home?', ru: 'О чём ты думал(а) по дороге домой?' },
  { id: 'q118', en: 'Which of today\'s hours would you give away?', ru: 'Какой час сегодняшнего дня ты бы отдал(а)?' },
  { id: 'q119', en: 'Which of today\'s hours would you keep?', ru: 'Какой час сегодняшнего дня ты бы оставил(а) себе?' },
  { id: 'q120', en: 'What did you get wrong on purpose?', ru: 'Что ты сделал(а) неправильно нарочно?' },
  { id: 'q121', en: 'What is the last thing that made you say “oh”?', ru: 'Что в последний раз заставило тебя сказать «о»?' },
  { id: 'q122', en: 'Where in your city would you take me first?', ru: 'Куда в своём городе ты бы повёл (повела) меня в первую очередь?' },
  { id: 'q123', en: 'What do you want the weather to do tomorrow?', ru: 'Какой погоды ты хочешь завтра?' },
  { id: 'q124', en: 'What did you count today?', ru: 'Что ты сегодня считал(а)?' },
  { id: 'q125', en: 'What did you forget and then remember?', ru: 'Что ты забыл(а), а потом вспомнил(а)?' },
  { id: 'q126', en: 'What could you talk about for an hour?', ru: 'О чём ты мог(ла) бы говорить целый час?' },
  { id: 'q127', en: 'What are you not good at and fine with?', ru: 'Что у тебя не получается — и тебя это не беспокоит?' },
  { id: 'q128', en: 'What did you hold today that was warm?', ru: 'Что тёплое ты сегодня держал(а) в руках?' },
  { id: 'q129', en: 'What was the last thing you laughed at alone?', ru: 'Над чем ты в последний раз смеялся(ась) в одиночестве?' },
  { id: 'q130', en: 'What did you not buy today?', ru: 'Что ты сегодня не купил(а)?' },
  { id: 'q131', en: 'What is the best thing about where you live?', ru: 'Что самое хорошее в месте, где ты живёшь?' },
  { id: 'q132', en: 'What is the worst thing about where you live?', ru: 'Что самое плохое в месте, где ты живёшь?' },
  { id: 'q133', en: 'What are you reading on your phone too much?', ru: 'Что ты слишком много читаешь в телефоне?' },
  { id: 'q134', en: 'What would you like to do with your hands more?', ru: 'Что бы ты хотел(а) чаще делать руками?' },
  { id: 'q135', en: 'What did you hear on the stairs, in the corridor, in the street?', ru: 'Что ты слышал(а) на лестнице, в коридоре, на улице?' },
  { id: 'q136', en: 'What made you homesick today, if anything?', ru: 'Что сегодня заставило тебя скучать по дому, если было такое?' },
  { id: 'q137', en: 'Which of my habits do you think about?', ru: 'О какой из моих привычек ты думаешь?' },
  { id: 'q138', en: 'What did you do that was pointless and good?', ru: 'Что ты сделал(а) бессмысленного и хорошего?' },
  { id: 'q139', en: 'What do you want to do less of?', ru: 'Чего ты хочешь делать меньше?' },
  { id: 'q140', en: 'What did the morning smell like?', ru: 'Чем пахло утро?' },
  { id: 'q141', en: 'What did you carry in your head all day?', ru: 'Что ты носил(а) в голове весь день?' },
  { id: 'q142', en: 'What did somebody give you recently?', ru: 'Что тебе недавно подарили или дали?' },
  { id: 'q143', en: 'What did you give somebody recently?', ru: 'Что ты недавно подарил(а) или дал(а) кому-то?' },
  { id: 'q144', en: 'Where would you like to wake up tomorrow?', ru: 'Где бы ты хотел(а) проснуться завтра?' },
  { id: 'q145', en: 'What did you say today that you had never said before?', ru: 'Что ты сегодня сказал(а) такого, чего никогда раньше не говорил(а)?' },
  { id: 'q146', en: 'What is your body telling you today?', ru: 'Что тебе сегодня говорит твоё тело?' },
  { id: 'q147', en: 'What kind of tired are you?', ru: 'Какая у тебя сегодня усталость?' },
  { id: 'q148', en: 'What is one thing you would fix in your flat?', ru: 'Что бы ты исправил(а) в своей квартире?' },
  { id: 'q149', en: 'What did you catch yourself doing?', ru: 'На чём ты сегодня себя поймал(а)?' },
  { id: 'q150', en: 'What is easy for you that is hard for others?', ru: 'Что тебе легко даётся из того, что другим трудно?' },
  { id: 'q151', en: 'What is the last thing you memorised?', ru: 'Что ты в последний раз выучил(а) наизусть?' },
  { id: 'q152', en: 'What do you want us to argue about, eventually?', ru: 'О чём ты хочешь, чтобы мы когда-нибудь поспорили?' },
  { id: 'q153', en: 'What did you do today that I would have liked to watch?', ru: 'Что ты сегодня делал(а) такого, на что я бы хотел(а) посмотреть?' },
  { id: 'q154', en: 'What did the day taste like?', ru: 'Каким был этот день на вкус?' },
  { id: 'q155', en: 'What did you keep quiet about today?', ru: 'О чём ты сегодня промолчал(а)?' },
  { id: 'q156', en: 'What did you wait for today?', ru: 'Чего ты сегодня ждал(а)?' },
  { id: 'q157', en: 'What did you spend too long choosing?', ru: 'Что ты слишком долго выбирал(а)?' },
  { id: 'q158', en: 'What have you kept from being a child?', ru: 'Что ты сохранил(а) с детства?' },
  { id: 'q159', en: 'What is in the corner of your room?', ru: 'Что стоит в углу твоей комнаты?' },
  { id: 'q160', en: 'What is the first thing you would show me on your street?', ru: 'Что ты первым делом показал(а) бы мне на своей улице?' },
  { id: 'q161', en: 'What did you do because you had to?', ru: 'Что ты сегодня сделал(а), потому что было нужно?' },
  { id: 'q162', en: 'What did you do because you wanted to?', ru: 'Что ты сегодня сделал(а), потому что хотелось?' },
  { id: 'q163', en: 'What was the last thing you sang?', ru: 'Что ты в последний раз пел(а)?' },
  { id: 'q164', en: 'What are you hoping nobody asks you?', ru: 'О чём ты надеешься, что тебя никто не спросит?' },
  { id: 'q165', en: 'What made today different from yesterday?', ru: 'Чем сегодняшний день отличался от вчерашнего?' },
  { id: 'q166', en: 'What is the most useful thing you own?', ru: 'Какая самая полезная вещь у тебя есть?' },
  { id: 'q167', en: 'What is the most useless thing you own and love?', ru: 'Какая самая бесполезная вещь у тебя есть — и ты её любишь?' },
  { id: 'q168', en: 'What do you want to hear me say more often?', ru: 'Что ты хочешь слышать от меня чаще?' },
  { id: 'q169', en: 'What was the last kind thing you did and did not mention?', ru: 'Что доброго ты недавно сделал(а) и никому не сказал(а)?' },
  { id: 'q170', en: 'What would a stranger have noticed about you today?', ru: 'Что бы сегодня заметил в тебе незнакомый человек?' },
  { id: 'q171', en: 'What did you leave unsaid in a message?', ru: 'Что ты недоговорил(а) в сообщении?' },
  { id: 'q172', en: 'Which noise from your city would you miss?', ru: 'По какому звуку своего города ты бы скучал(а)?' },
  { id: 'q173', en: 'What did you spend money on that was worth it?', ru: 'На что ты потратил(а) деньги, и это того стоило?' },
  { id: 'q174', en: 'What are you slowly getting used to?', ru: 'К чему ты постепенно привыкаешь?' },
  { id: 'q175', en: 'What did you feel in your shoulders today?', ru: 'Что ты сегодня чувствовал(а) в плечах?' },
  { id: 'q176', en: 'What do you want to be true by winter?', ru: 'Что ты хочешь, чтобы стало правдой к зиме?' },
  { id: 'q177', en: 'What did you do today that your parents would not understand?', ru: 'Что ты сегодня делал(а) такого, чего не поняли бы твои родители?' },
  { id: 'q178', en: 'What did you clean today?', ru: 'Что ты сегодня убрал(а) или почистил(а)?' },
  { id: 'q179', en: 'What would you like to do with a whole day and no phone?', ru: 'Что бы ты делал(а) целый день без телефона?' },
  { id: 'q180', en: 'What do you dislike that everyone else likes?', ru: 'Что тебе не нравится из того, что нравится всем?' },
  { id: 'q181', en: 'What do you like that nobody else seems to?', ru: 'Что тебе нравится из того, что, кажется, никому больше не нравится?' },
  { id: 'q182', en: 'What did you nearly forget to do today?', ru: 'Что ты сегодня чуть не забыл(а) сделать?' },
  { id: 'q183', en: 'What did you see out of a moving window today?', ru: 'Что ты сегодня видел(а) из окна в движении?' },
  { id: 'q184', en: 'What is your favourite thing to do in the dark?', ru: 'Что ты больше всего любишь делать в темноте?' },
  { id: 'q185', en: 'What are you allowed to be bad at?', ru: 'В чём тебе можно быть плохим (плохой)?' },
  { id: 'q186', en: 'What is the best thing someone said about you this year?', ru: 'Что самое хорошее о тебе сказали в этом году?' },
  { id: 'q187', en: 'What is the next thing you are going to eat?', ru: 'Что ты будешь есть следующим?' },
  { id: 'q188', en: 'What are you curious about lately?', ru: 'Что тебе в последнее время любопытно?' },
  { id: 'q189', en: 'Where in your day is there room for me?', ru: 'Где в твоём дне есть место для меня?' },
  { id: 'q190', en: 'What do you do the same way every day?', ru: 'Что ты каждый день делаешь одинаково?' },
  { id: 'q191', en: 'What did today ask of you?', ru: 'Чего от тебя потребовал этот день?' },
  { id: 'q192', en: 'What did you give today?', ru: 'Что ты сегодня отдал(а)?' },
  { id: 'q193', en: 'What did you take today?', ru: 'Что ты сегодня взял(а)?' },
  { id: 'q194', en: 'What do you want to remember about this week in ten years?', ru: 'Что из этой недели ты хочешь помнить через десять лет?' },
  { id: 'q195', en: 'What did you put back?', ru: 'Что ты положил(а) обратно?' },
  { id: 'q196', en: 'Which light do you turn on first when you come home?', ru: 'Какой свет ты включаешь первым, когда приходишь домой?' },
  { id: 'q197', en: 'What did you think was going to happen today, and what did?', ru: 'Что, как ты думал(а), случится сегодня — и что случилось?' },
  { id: 'q198', en: 'What do you want the last thing you do today to be?', ru: 'Каким ты хочешь, чтобы было последнее дело сегодня?' },
  { id: 'q199', en: 'What would you like to be doing right now instead of this?', ru: 'Что бы ты хотел(а) делать прямо сейчас вместо этого?' },
  { id: 'q200', en: 'What made the distance bigger today?', ru: 'Что сегодня сделало расстояние больше?' },
];

/**
 * The table had 56 questions until 2026-09-06, and every day before the epoch
 * below was asked from those 56 by the old formula. That formula is kept for
 * those days: the chronicle stores the id of what was answered, but Today does
 * not, and a phone that opens on the morning after a deploy must find the same
 * question it saw the night before. Growing the table is the one change that
 * would silently move every past day, so the past is pinned to its own rule.
 */
const OLD_COUNT = 56;
const OLD_SLOT_STRIDE = 17;

/**
 * The day the whole table came into use — the day after it was deployed, so
 * that no day already shown on a phone changes under it.
 */
const EPOCH = '2026-09-07';
const EPOCH_DAYS = Math.floor(dateKeyToMs(EPOCH) / 86400000);

/**
 * Three rounds a day walk the table in one sequence — day 0 takes positions 0,
 * 1, 2; day 1 takes 3, 4, 5 — but through a stride coprime with its length, so
 * neighbouring rounds are not neighbouring questions (the table has runs of
 * related ones) and no question comes round again until every one has been
 * asked: 200 questions, three a day, is sixty-six days without a repeat. A
 * day that never reaches its third round simply leaves that one unasked.
 */
const STRIDE = 37;

/**
 * Deterministic and stable: the same date and round give the same question on
 * both phones, without either of them asking a server.
 */
export function questionFor(date: string, slot = 0): Question {
  const days = Math.floor(dateKeyToMs(date) / 86400000);
  if (days < EPOCH_DAYS) {
    const index = (((days + slot * OLD_SLOT_STRIDE) % OLD_COUNT) + OLD_COUNT) % OLD_COUNT;
    return QUESTIONS[index] ?? QUESTIONS[0]!;
  }
  const n = QUESTIONS.length;
  const position = (days - EPOCH_DAYS) * 3 + slot;
  const index = (((position * STRIDE) % n) + n) % n;
  return QUESTIONS[index] ?? QUESTIONS[0]!;
}

export function questionText(question: Question, locale: Locale): string {
  return locale === 'ru' ? question.ru : question.en;
}
