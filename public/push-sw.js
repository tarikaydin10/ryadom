/**
 * The notification half of the service worker.
 *
 * Imported by the generated worker rather than replacing it: the caching
 * strategy in `vite.config.ts` is the one thing keeping the app usable offline
 * (ADR-0007), and this has no business rewriting it. Two listeners, no state.
 *
 * What arrives here is already decrypted by the browser — the push service saw
 * only ciphertext — and it says nothing about what anybody wrote. It is a nudge
 * with a title and a sentence; the app itself is where the words are, behind
 * the lock-in.
 */

self.addEventListener('push', (event) => {
  const payload = (() => {
    try {
      return event.data ? event.data.json() : {};
    } catch {
      // A push with no payload, or one from something else entirely. Silence is
      // not an option on iOS — a push that shows nothing costs the app its
      // permission — so it still says something true.
      return {};
    }
  })();

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Ryadom', {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      // One notification per kind of news: a second nudge replaces the first
      // rather than stacking, and the phone stays quiet about the same fact.
      tag: payload.kind || 'ryadom',
      renotify: true,
      data: { url: '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Already open somewhere: bring that one forward rather than starting a
      // second copy of an app that is meant to be one screen.
      for (const client of open) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow('/');
    })(),
  );
});
