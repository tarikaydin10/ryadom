import { fetchPushKey, putPushSubscription, syncEnabled } from './api';
import type { Locale } from '../i18n';

/**
 * Notifications, from this device's side.
 *
 * The one thing worth being told about is that the other one has written —
 * until now the only way to find out was to open the app and look, which on a
 * thousand-kilometre gap turns a conversation into two monologues.
 *
 * What arrives says nothing about what was written; the lock-in is not
 * negotiable and a notification is not a way around it. See ADR-0013, and
 * `server/push.mjs` for the other half.
 */

export type PushStatus =
  /** No push here: a browser tab on iOS, an old phone, or no server at all. */
  | 'unsupported'
  /** Possible, not asked for. */
  | 'off'
  | 'on'
  /** Refused once, and only the phone's own settings can undo that. */
  | 'denied';

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    syncEnabled()
  );
}

/** The subscription key, as the browser wants it: raw bytes, not base64url. */
function decodeKey(key: string): Uint8Array {
  const padded = key.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(key.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const sameKey = (subscription: PushSubscription, key: Uint8Array): boolean => {
  const applied = subscription.options.applicationServerKey;
  if (!applied) return false;
  const bytes = new Uint8Array(applied);
  return bytes.length === key.length && bytes.every((byte, index) => byte === key[index]);
};

export async function pushStatus(): Promise<PushStatus> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? 'on' : 'off';
}

/**
 * Ask, subscribe, and tell the server where to knock.
 *
 * The permission prompt has to come from a tap — iOS refuses it otherwise, and
 * silently — which is why this is only ever called from a button.
 */
export async function enablePush(lang: Locale): Promise<PushStatus> {
  if (!pushSupported()) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';

  // `ready` never resolves when nothing is registered — which is exactly the
  // case in development, where the worker is not built. Without the race the
  // switch would sit there spinning for ever rather than saying no.
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 5000)),
  ]);
  if (!registration) return 'unsupported';
  const key = decodeKey((await fetchPushKey()).key);

  let subscription = await registration.pushManager.getSubscription();
  // A subscription made for a different signing key is not a subscription any
  // more: the push service would take our messages and never deliver them. It
  // happens if the server's keys are ever regenerated, and it is invisible
  // without this check.
  if (subscription && !sameKey(subscription, key)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({
    // Every push shows something. Not a choice — iOS withdraws permission from
    // an app that pushes silently, and it is the right rule anyway.
    userVisibleOnly: true,
    applicationServerKey: key as BufferSource,
  });

  const json = subscription.toJSON();
  await putPushSubscription({
    endpoint: subscription.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
    // The device's language, so the sentence arrives in the one its owner reads.
    lang,
  });
  return 'on';
}

/** Off means off on the server too, or it keeps sending into a dead endpoint. */
export async function disablePush(): Promise<PushStatus> {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await putPushSubscription({ endpoint: subscription.endpoint, remove: true }).catch(() => undefined);
    await subscription.unsubscribe();
  }
  return pushSupported() ? 'off' : 'unsupported';
}
