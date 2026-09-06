/**
 * Ryadom — reference sync server.
 *
 * Deliberately dependency-free Node: nothing to audit, nothing to update, and it
 * runs on any VPS with a Node runtime. It also serves the built app from ../dist
 * when that exists, so the whole thing lives behind a single hostname. That is
 * the point: one name to keep resolvable and reachable, no third-party CDN, no
 * analytics host, no font host, no auth provider — nothing that can be blocked
 * or can decide on its own to stop serving one of the two countries.
 *
 * Storage is a JSON file. Two people writing one answer a day will not outgrow
 * it; swap in Postgres the day that stops being true.
 *
 *   PAIR_SECRET=<long random string> node server/index.js
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rename, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { push, vapidKeys } from './push.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);
// Loopback by default: in the recommended setup a TLS terminator sits in front,
// and the Node process has no business being reachable from the open internet.
// Set HOST=0.0.0.0 when running in a container that publishes the port itself.
const HOST = process.env.HOST ?? '127.0.0.1';
/**
 * One passphrase per side, which is what makes a side a fact rather than a claim.
 *
 * With a single shared secret the member had to be taken from a header, so
 * anyone holding it could say "I am the other one" and read that person's answer
 * without ever writing their own — defeating the whole lock-in. Derived from
 * which secret matched, that is not possible.
 *
 * PAIR_SECRET still works as a fallback for both sides so an existing
 * deployment keeps running; in that mode the header is honoured again, because
 * the secrets cannot tell the two apart. The startup warning says so.
 */
const SECRETS = {
  a: process.env.PAIR_SECRET_A ?? process.env.PAIR_SECRET ?? '',
  b: process.env.PAIR_SECRET_B ?? process.env.PAIR_SECRET ?? '',
};
const SIDES_DISTINCT = SECRETS.a !== '' && SECRETS.b !== '' && SECRETS.a !== SECRETS.b;
const DATA_DIR = process.env.DATA_DIR ?? join(HERE, 'data');
const DATA_FILE = join(DATA_DIR, 'answers.json');
const STATIC_DIR = process.env.STATIC_DIR ?? join(HERE, '..', 'dist');
// Same-origin deployment needs no CORS at all; set this only if the app is
// served from a different host than the API.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '';
// The only origin the page is allowed to call out to. Change it in step with
// VITE_WEATHER_BASE_URL if you point the app at your own Open-Meteo instance.
const WEATHER_ORIGIN = process.env.WEATHER_ORIGIN ?? 'https://api.open-meteo.com';

if (!SECRETS.a || !SECRETS.b) {
  console.error('Set PAIR_SECRET_A and PAIR_SECRET_B (or PAIR_SECRET for both). Refusing to start.');
  process.exit(1);
}

if (!SIDES_DISTINCT) {
  console.warn(
    'Both sides share one passphrase, so which side a request comes from is taken from a header ' +
      'rather than proven. Anyone holding it can read the other side without answering first. ' +
      'Set PAIR_SECRET_A (Hamburg) and PAIR_SECRET_B (Kaliningrad) to separate values.',
  );
}

// A warning, not a refusal. How much passphrase is enough is the owners' call —
// they know who might come looking — and a server that will not start is a worse
// outcome than a short passphrase they chose on purpose. Said once, at startup,
// so the trade-off is on the record rather than forgotten.
for (const [side, value] of Object.entries(SECRETS)) {
  if (value.length >= 16) continue;
  console.warn(
    `The passphrase for side ${side} is ${value.length} characters. Short passphrases are guessable: ` +
      'the address of this app is not secret, and rate limiting buys time rather than safety. ' +
      'Sixteen or more, ideally several words, if you want the lock to carry the weight.',
  );
}

const MEMBERS = new Set(['a', 'b']);
const MAX_BODY_BYTES = 8 * 1024;
const MAX_TEXT_CHARS = 4000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The two languages the app speaks, and the ids the devices make for a question. */
const LANGS = new Set(['en', 'ru']);
const QUESTION_ID_RE = /^p-[A-Za-z0-9_-]{1,64}$/;
const MAX_QUESTION_CHARS = 300;
const MAX_QUESTIONS = 200;

/**
 * A translation is optional, and it says where it came from — a person who
 * typed it or a machine that guessed it. Anything else in that field is
 * dropped rather than believed.
 */
function readTranslation(value) {
  if (!value || typeof value !== 'object') return null;
  const text = typeof value.text === 'string' ? value.text.trim() : '';
  if (!text || text.length > MAX_QUESTION_CHARS || !LANGS.has(value.lang)) return null;
  return { lang: value.lang, text, by: value.by === 'machine' ? 'machine' : 'author' };
}

/* ---------------------------------------------------------------- storage */

let store = { days: {}, questions: [], settings: null };
let writeChain = Promise.resolve();

async function loadStore() {
  try {
    store = JSON.parse(await readFile(DATA_FILE, 'utf8'));
    store.days ??= {};
    store.questions ??= [];
    store.settings ??= null;
    store.push ??= { keys: null, subscriptions: { a: [], b: [] } };
    store.push.subscriptions ??= { a: [], b: [] };
  } catch {
    store = { days: {}, questions: [], settings: null, push: { keys: null, subscriptions: { a: [], b: [] } } };
  }
}

/**
 * A day used to be one question and two answers. It is a list of rounds now.
 *
 * Everything already written belongs to round zero — that is what a day was
 * when it was written — so the answers move across untouched and only the shape
 * around them changes. The file as it stood is written next to itself first,
 * because this runs unattended on a deploy and the only copy of what two people
 * wrote to each other is not a thing to rewrite without a way back.
 */
async function toRounds() {
  const stale = Object.entries(store.days).filter(([, day]) => day && !Array.isArray(day.rounds));
  if (stale.length === 0) return;

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(join(DATA_DIR, 'answers.before-rounds.json'), JSON.stringify(store, null, 2), 'utf8');

  for (const [date, day] of stale) {
    const round = { question: { kind: 'bundled' }, openedAt: 0 };
    const written = [day.a?.createdAt, day.b?.createdAt].filter((at) => Number.isFinite(at));
    round.openedAt = written.length > 0 ? Math.min(...written) : 0;
    if (day.a) round.a = day.a;
    if (day.b) round.b = day.b;
    store.days[date] = { rounds: [round] };
  }

  await persist();
  console.log(`rounds: migrated ${stale.length} day(s): ${stale.map(([date]) => date).join(', ')}`);
}

/**
 * One-off, for the launch: the test answers go, the settings stay.
 *
 * Done here rather than by hand because nobody but this process may write the
 * data directory — the deploy user cannot, and SSH is not always to hand. The
 * marker in the store makes it run exactly once; every later start is a no-op.
 * What is removed is written next to the file first, so nothing is gone for
 * good. Delete this block once the log has shown it ran (docs/tech-debt.md).
 */
const LAUNCH_RESET = 'launch-2026-09-06';

async function launchReset() {
  if (store.launchReset === LAUNCH_RESET) return;
  const days = Object.keys(store.days);
  if (days.length > 0) {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(join(DATA_DIR, `answers.before-${LAUNCH_RESET}.json`), JSON.stringify(store, null, 2), 'utf8');
  }
  store.days = {};
  store.launchReset = LAUNCH_RESET;
  await persist();
  console.log(`launch reset: removed ${days.length} day(s)${days.length ? ': ' + days.join(', ') : ''}`);
}

/** Serialised, atomic writes: a crash mid-save must not truncate the file. */
function persist() {
  writeChain = writeChain.then(async () => {
    await mkdir(DATA_DIR, { recursive: true });
    const temporary = `${DATA_FILE}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(store, null, 2), 'utf8');
    await rename(temporary, DATA_FILE);
  });
  return writeChain;
}

/* ------------------------------------------------------------------- auth */

function constantTimeEquals(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) {
    // Still compare, so the reply time does not leak the length.
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

// The passphrase is the only credential, so make guessing expensive.
const attempts = new Map();
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 20;

function throttled(ip) {
  const record = attempts.get(ip);
  if (!record) return false;
  if (Date.now() - record.since > ATTEMPT_WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

/**
 * A second brake, counted globally rather than per address.
 *
 * The per-IP limit assumes the attacker has one address, which is a poor
 * assumption. This one costs nothing to the two people who use this: unlocking
 * happens twice in the life of a deployment, once per phone, so a run of
 * failures is never legitimate traffic. Each failure makes the *next* wrong
 * answer slower for everybody, and an attacker can rotate addresses but cannot
 * rotate the clock.
 *
 * A delay rather than a lockout, deliberately: a hard lock would let a stranger
 * shut the two of you out of your own page by guessing badly on purpose.
 *
 * This buys time against a guessable passphrase. It does not make one safe —
 * only a passphrase that is not in a word list does that.
 */
let globalFailures = 0;
let globalWindowStart = Date.now();
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;
// Generous, because a short passphrase is allowed and this is what stands
// between one and a word list. It costs the two real users nothing: they unlock
// once per device, and the first couple of failures still answer instantly.
const MAX_DELAY_MS = 60000;

function failureDelayMs() {
  if (Date.now() - globalWindowStart > GLOBAL_WINDOW_MS) {
    globalFailures = 0;
    globalWindowStart = Date.now();
  }
  // First couple of failures answer instantly — that is a typo, not an attack.
  return Math.min(Math.max(0, globalFailures - 2) * 1500, MAX_DELAY_MS);
}

const sleep = (ms) => (ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve());

function noteFailure(ip) {
  globalFailures++;
  const record = attempts.get(ip);
  if (!record || Date.now() - record.since > ATTEMPT_WINDOW_MS) {
    attempts.set(ip, { count: 1, since: Date.now() });
  } else {
    record.count++;
  }
}

/**
 * Header values are ISO-8859-1, so a passphrase with any character outside that
 * range cannot travel raw — the browser refuses to send it at all. The client
 * encodes the UTF-8 bytes and marks them with a `b64:` prefix; anything without
 * the prefix is taken literally, so a client from before this change still works.
 */
function decodeSecret(raw) {
  if (!raw.startsWith('b64:')) return raw;
  try {
    return Buffer.from(raw.slice(4), 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function authenticate(req) {
  const secret = decodeSecret(String(req.headers['x-pair-secret'] ?? ''));
  // Both are always compared, so the reply time does not say which one matched.
  const matchesA = constantTimeEquals(secret, SECRETS.a);
  const matchesB = constantTimeEquals(secret, SECRETS.b);
  if (!matchesA && !matchesB) return null;

  if (SIDES_DISTINCT) return matchesA ? 'a' : 'b';

  // Shared passphrase: the secret cannot tell the sides apart, so fall back to
  // what the client says it is. Warned about at startup.
  const claimed = String(req.headers['x-pair-member'] ?? 'a');
  return MEMBERS.has(claimed) ? claimed : 'a';
}

/* ------------------------------------------------------------------ shape */

const otherMember = (member) => (member === 'a' ? 'b' : 'a');

/**
 * How many questions one day may hold.
 *
 * Not a throttle — a shape. One a day was too few to say anything back to;
 * unlimited would be a chat with a question on top, and they have a chat. Three
 * is a day that can go on when both of you are here and still ends.
 */
const MAX_ROUNDS = 3;

/** A day nobody has written in yet: the question of the day, and nothing else. */
const firstRound = () => ({ question: { kind: 'bundled' }, openedAt: 0 });

const roundsFor = (date) => {
  const rounds = store.days[date]?.rounds;
  return Array.isArray(rounds) && rounds.length > 0 ? rounds : [firstRound()];
};

const bothAnswered = (round) => Boolean(round && round.a && round.b);

/**
 * The next round is earned, not scheduled.
 *
 * It opens the moment both of you have answered the one before — which is a
 * fact only this process holds, and the reason rounds past the first are a
 * server's business at all. The question is chosen and frozen here too, so two
 * phones cannot end up answering different things.
 */
function openRounds(date, day) {
  while (day.rounds.length < MAX_ROUNDS && bothAnswered(day.rounds[day.rounds.length - 1])) {
    day.rounds.push({ question: nextQuestion(date), openedAt: Date.now() });
  }
}

/**
 * The day it is, in the calendar the two of them share (ADR-0005).
 *
 * The server had no idea what "today" was until now — every route took the date
 * from the client. It needs one for exactly one purpose: deciding whether a
 * request may open a round. A poll of yesterday must not spend one of your own
 * questions on a day nobody is looking at any more.
 */
const PAIR_TIMEZONE = 'Europe/Berlin';
const pairDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: PAIR_TIMEZONE }).format(new Date());

/**
 * Catch up a day whose next round was earned but never opened.
 *
 * Rounds normally open on the write that completes one, which covers every
 * ordinary day. It does not cover the day rounds arrived: both of them had
 * already answered before the deploy, the migration turned that into round
 * zero, and nothing wrote again — so the day sat there, complete and closed,
 * with the new question waiting behind a write that had already happened. The
 * same gap would follow any write that got as far as memory and not as far as
 * the file.
 *
 * So a look at today is also a chance to settle it. Only today, and only a day
 * that already exists: a read never invents a day.
 */
async function settle(date) {
  if (date !== pairDay()) return;
  const day = store.days[date];
  if (!day || !Array.isArray(day.rounds) || day.rounds.length === 0) return;
  const before = day.rounds.length;
  openRounds(date, day);
  if (day.rounds.length !== before) await persist();
}

/** Yours before mine: a question one of you wrote is asked before the table's. */
function nextQuestion(date) {
  const own = store.questions
    .filter((question) => !question.deleted && question.usedOn === null)
    .sort((left, right) => left.createdAt - right.createdAt || (left.id < right.id ? -1 : 1))[0];
  if (!own) return { kind: 'bundled' };
  own.usedOn = date;
  return { kind: 'pool', id: own.id };
}

/**
 * The lock-in rule, enforced here rather than in the client.
 *
 * Until you have written, their text does not leave this process — the response
 * carries only the fact that they answered and when. A client-side blur would
 * put the words on the other phone and merely hide them; this does not.
 */
function roundResponse(round, slot, member) {
  const mine = round[member] ?? null;
  const theirs = round[otherMember(member)] ?? null;

  const partner = {
    answered: Boolean(theirs),
    answeredAt: theirs ? theirs.createdAt : null,
  };
  if (mine && theirs) {
    partner.text = theirs.text;
    partner.updatedAt = theirs.updatedAt;
  }

  return {
    slot,
    question: questionResponse(round.question),
    you: mine ? { text: mine.text, updatedAt: mine.updatedAt } : null,
    partner,
  };
}

/**
 * A bundled round names no question: both phones derive it from the date and
 * the slot, which is what lets the first round of a day be read with no server
 * in reach. One of your own travels in full — nothing else could show it.
 */
function questionResponse(question) {
  if (question?.kind !== 'pool') return { kind: 'bundled' };
  const own = store.questions.find((candidate) => candidate.id === question.id);
  return own ? { kind: 'pool', question: own } : { kind: 'bundled' };
}

function dayResponse(date, member) {
  const rounds = roundsFor(date).map((round, slot) => roundResponse(round, slot, member));
  // Round zero also travels under the names it had before rounds existed. A
  // phone that has not picked up the new bundle keeps answering the question of
  // the day and notices nothing; the deploy is not a moment anybody has to
  // stand still for.
  return { date, rounds, you: rounds[0].you, partner: rounds[0].partner };
}

/* ------------------------------------------------------------------- push */

/**
 * What a notification says.
 *
 * Two sentences, and neither of them contains anything that was written. The
 * lock-in is the point of this app: a notification quoting an answer would put
 * her words on his lock screen before he had written his own, which is exactly
 * what this process refuses to do everywhere else.
 *
 * No names either, and no verbs that would have to agree with a gender. The
 * same build runs on both phones and «ответила» is wrong on one of them half
 * the time — the same reason the sky's status lines are written as they are.
 */
const NOTIFICATIONS = {
  en: {
    answered: { title: 'Ryadom', body: 'An answer arrived — your turn.' },
    unlocked: { title: 'Ryadom', body: 'The answer is open, and there is a new question.' },
  },
  ru: {
    answered: { title: 'Рядом', body: 'Пришёл ответ — твоя очередь.' },
    unlocked: { title: 'Рядом', body: 'Ответ открыт, и есть новый вопрос.' },
  },
};

/**
 * Tell one side that something happened on the other.
 *
 * Never awaited by a request: the person who just wrote should not wait for
 * Apple. A subscription the push service calls gone is dropped — the app was
 * deleted or the phone was wiped, and it will never work again.
 */
async function notify(member, kind) {
  const box = store.push?.subscriptions?.[member];
  if (!Array.isArray(box) || box.length === 0) return;
  const { keys, made } = vapidKeys(store);
  if (made) await persist();

  let dropped = false;
  for (const subscription of [...box]) {
    const text = NOTIFICATIONS[subscription.lang === 'ru' ? 'ru' : 'en'][kind];
    const result = await push(subscription, { kind, ...text }, keys);
    if (result !== 'gone') continue;
    const at = box.indexOf(subscription);
    if (at >= 0) box.splice(at, 1);
    dropped = true;
  }
  if (dropped) await persist();
}

/* ------------------------------------------------------------------- http */

function send(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex, nofollow',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    ...corsHeaders(),
    ...extraHeaders,
  });
  res.end(payload);
}

function corsHeaders() {
  if (!ALLOWED_ORIGIN) return {};
  return {
    'access-control-allow-origin': ALLOWED_ORIGIN,
    'access-control-allow-headers': 'content-type, x-pair-member, x-pair-secret',
    'access-control-allow-methods': 'GET, PUT, OPTIONS',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * What the page is allowed to do, stated as narrowly as the app actually needs.
 *
 * Everything is served from this origin, so the only outbound connection the
 * page may make is the weather endpoint. `style-src` needs 'unsafe-inline'
 * because the sky is drawn with computed inline styles; nothing else is relaxed.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' ${WEATHER_ORIGIN}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
].join('; ');

const SECURITY_HEADERS = {
  'content-security-policy': CSP,
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-robots-tag': 'noindex, nofollow',
  'permissions-policy': 'geolocation=(), microphone=(), camera=(), interest-cohort=()',
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
};

/** Static hosting for the built app, so the deployment is a single origin. */
async function serveStatic(req, res, pathname) {
  const relative = normalize(pathname === '/' ? '/index.html' : pathname).replace(/^(\.\.[/\\])+/, '');
  let file = join(STATIC_DIR, relative);
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = join(file, 'index.html');
  } catch {
    // Unknown path: hand back the shell and let the app route it.
    file = join(STATIC_DIR, 'index.html');
  }
  try {
    await stat(file);
  } catch {
    send(res, 404, { error: 'not found' });
    return;
  }
  const ext = extname(file);
  // The service worker and the shell must never be pinned by an intermediary;
  // hashed assets can be cached forever.
  const immutable = /\/assets\//.test(file);
  res.writeHead(200, {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    ...SECURITY_HEADERS,
  });
  createReadStream(file).pipe(res);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const ip = req.socket.remoteAddress ?? 'unknown';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (!url.pathname.startsWith('/api/')) {
    await serveStatic(req, res, url.pathname);
    return;
  }

  if (throttled(ip)) {
    send(res, 429, { error: 'too many attempts' }, { 'retry-after': '600' });
    return;
  }

  const member = authenticate(req);
  if (!member) {
    noteFailure(ip);
    await sleep(failureDelayMs());
    send(res, 401, { error: 'unauthorized' });
    return;
  }

  // A cheap endpoint whose only job is to tell the unlock screen that the
  // passphrase is right — and which side it belongs to.
  if (url.pathname === '/api/session' && req.method === 'GET') {
    send(res, 200, { ok: true, member });
    return;
  }

  /**
   * Names, dates and the reunion belong to the two of you, not to whichever
   * device happened to type them. They were per-device, which meant a reunion
   * set on a phone was invisible everywhere else.
   */
  if (url.pathname === '/api/settings') {
    if (req.method === 'GET') {
      send(res, 200, store.settings ?? { settings: null, updatedAt: 0 });
      return;
    }
    if (req.method === 'PUT') {
      let body;
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        send(res, 400, { error: 'bad body' });
        return;
      }
      if (!body || typeof body.settings !== 'object' || body.settings === null) {
        send(res, 400, { error: 'bad settings' });
        return;
      }
      const updatedAt = Number.isFinite(body.updatedAt) ? Number(body.updatedAt) : Date.now();
      // Last write wins, and a slow retry never overwrites a newer edit.
      if (!store.settings || store.settings.updatedAt <= updatedAt) {
        store.settings = { settings: body.settings, updatedAt };
        await persist();
      }
      send(res, 200, store.settings);
      return;
    }
    send(res, 405, { error: 'method not allowed' });
    return;
  }

  /**
   * Notifications: the key to subscribe with, and the subscriptions themselves.
   *
   * A GET hands out the public half of the pair's signing key — the phone needs
   * it to ask its own push service for a subscription. A PUT stores what comes
   * back, or takes it away again with { remove: true }, which keeps this to the
   * two methods everything else here uses.
   */
  if (url.pathname === '/api/push') {
    if (req.method === 'GET') {
      const { keys, made } = vapidKeys(store);
      if (made) await persist();
      send(res, 200, { key: keys.publicKey });
      return;
    }
    if (req.method === 'PUT') {
      let body;
      try {
        body = JSON.parse(await readBody(req));
      } catch {
        send(res, 400, { error: 'bad body' });
        return;
      }
      const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';
      // Only ever an https push endpoint: this is a URL the server will POST to
      // later, and it arrives from a client.
      if (!endpoint || endpoint.length > 1000 || !endpoint.startsWith('https://')) {
        send(res, 400, { error: 'bad endpoint' });
        return;
      }
      const box = (store.push.subscriptions[member] ??= []);
      const at = box.findIndex((subscription) => subscription.endpoint === endpoint);

      if (body.remove === true) {
        if (at >= 0) {
          box.splice(at, 1);
          await persist();
        }
        send(res, 200, { ok: true, subscribed: false });
        return;
      }

      const p256dh = typeof body?.keys?.p256dh === 'string' ? body.keys.p256dh : '';
      const auth = typeof body?.keys?.auth === 'string' ? body.keys.auth : '';
      if (!p256dh || !auth) {
        send(res, 400, { error: 'bad keys' });
        return;
      }
      const subscription = {
        endpoint,
        keys: { p256dh, auth },
        lang: body?.lang === 'ru' ? 'ru' : 'en',
        updatedAt: Date.now(),
      };
      // One entry per endpoint: a phone that re-subscribes replaces itself
      // rather than piling up, which is how one device ends up buzzing four
      // times.
      if (at >= 0) box[at] = { ...box[at], ...subscription };
      else box.push(subscription);
      // Two people with a phone and maybe a tablet each. The cap only exists so
      // a bug cannot grow the file without end.
      if (box.length > 8) box.shift();
      await persist();
      send(res, 200, { ok: true, subscribed: true });
      return;
    }
    send(res, 405, { error: 'method not allowed' });
    return;
  }

  /**
   * The questions the two of you write yourselves.
   *
   * Whole list on every call, read or write: there are dozens of these at most,
   * each is one sentence, and a client that always gets everything can never be
   * half-converged. The author is the passphrase that was used, never a claim
   * in the body — the same rule that makes a side a fact everywhere else here.
   */
  if (url.pathname === '/api/questions' && req.method === 'GET') {
    send(res, 200, { questions: store.questions });
    return;
  }

  const questionMatch = /^\/api\/questions\/([^/]+)$/.exec(url.pathname);
  if (questionMatch) {
    if (req.method !== 'PUT') {
      send(res, 405, { error: 'method not allowed' });
      return;
    }
    const id = decodeURIComponent(questionMatch[1]);
    if (!QUESTION_ID_RE.test(id)) {
      send(res, 400, { error: 'bad id' });
      return;
    }
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      send(res, 400, { error: 'bad body' });
      return;
    }

    const lang = LANGS.has(body?.lang) ? body.lang : null;
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const deleted = body?.deleted === true;
    if (!lang || (!deleted && (!text || text.length > MAX_QUESTION_CHARS))) {
      send(res, 400, { error: 'bad question' });
      return;
    }
    const updatedAt = Number.isFinite(body?.updatedAt) ? Number(body.updatedAt) : Date.now();
    const existing = store.questions.find((question) => question.id === id);

    if (existing && existing.author !== member) {
      send(res, 403, { error: 'not yours' });
      return;
    }
    // A question that has been asked is part of a day, and days are not edited.
    if (existing?.usedOn && deleted) {
      send(res, 409, { error: 'already asked' });
      return;
    }
    if (!existing && store.questions.filter((question) => !question.deleted).length >= MAX_QUESTIONS) {
      send(res, 409, { error: 'too many questions' });
      return;
    }

    if (existing) {
      if (existing.updatedAt <= updatedAt) {
        if (!deleted) existing.text = text;
        existing.lang = lang;
        existing.translation = readTranslation(body?.translation);
        existing.deleted = deleted;
        existing.updatedAt = updatedAt;
      }
    } else {
      store.questions.push({
        id,
        author: member,
        lang,
        text,
        translation: readTranslation(body?.translation),
        createdAt: Number.isFinite(body?.createdAt) ? Number(body.createdAt) : Date.now(),
        updatedAt,
        usedOn: null,
        deleted,
      });
    }
    await persist();
    send(res, 200, { questions: store.questions });
    return;
  }

  const match = /^\/api\/days\/([^/]+)(\/answer)?$/.exec(url.pathname);
  if (!match) {
    send(res, 404, { error: 'not found' });
    return;
  }

  const date = decodeURIComponent(match[1]);
  if (!DATE_RE.test(date)) {
    send(res, 400, { error: 'bad date' });
    return;
  }

  if (!match[2] && req.method === 'GET') {
    await settle(date);
    send(res, 200, dayResponse(date, member));
    return;
  }

  if (match[2] && req.method === 'PUT') {
    let body;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      send(res, 400, { error: 'bad body' });
      return;
    }
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    if (!text || text.length > MAX_TEXT_CHARS) {
      send(res, 400, { error: 'bad text' });
      return;
    }
    const updatedAt = Number.isFinite(body?.updatedAt) ? Number(body.updatedAt) : Date.now();

    // No slot is round zero: that is what every request from the bundle before
    // rounds looks like, and it is exactly what it means.
    const slot = Number.isInteger(body?.slot) ? Number(body.slot) : 0;

    const day = store.days[date] ?? { rounds: [firstRound()] };
    if (!Array.isArray(day.rounds) || day.rounds.length === 0) day.rounds = [firstRound()];
    if (slot < 0 || slot >= day.rounds.length) {
      // A round nobody has opened. The answer stays where it was written — the
      // device keeps its own copy — but it does not get to invent a round here.
      send(res, 409, { error: 'round not open' });
      return;
    }

    const round = day.rounds[slot];
    const existing = round[member];
    // Only the first answer to a round is news. An edit is somebody choosing a
    // better word, and a phone that buzzes for that is a phone you turn off.
    const first = !existing;
    const theyHadAnswered = Boolean(round[otherMember(member)]);
    // Last write wins, but never let a slow retry overwrite a newer edit.
    if (!existing || existing.updatedAt <= updatedAt) {
      round[member] = {
        text,
        questionId: typeof body?.questionId === 'string' ? body.questionId : '',
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt,
      };
      store.days[date] = day;
      openRounds(date, day);
      await persist();
      // Not awaited: whoever just wrote should not wait for Apple. If they had
      // already answered this round, their own answer has just come unlocked and
      // a new question is open — different news from a nudge.
      if (first && date === pairDay()) {
        void notify(otherMember(member), theyHadAnswered ? 'unlocked' : 'answered').catch(() => undefined);
      }
    }
    send(res, 200, dayResponse(date, member));
    return;
  }

  send(res, 405, { error: 'method not allowed' });
});

await loadStore();
await launchReset();
await toRounds();
server.listen(PORT, HOST, () => console.log(`ryadom server on ${HOST}:${PORT}`));
