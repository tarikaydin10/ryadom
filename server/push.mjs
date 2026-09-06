/**
 * Web Push, by hand.
 *
 * The one notification worth having in this app is "the other one has written",
 * and until now the only way to find that out was to open the app and look. On
 * a thousand-kilometre gap that is the difference between a conversation and a
 * pair of monologues.
 *
 * Written out rather than pulled from npm, for the same reason as everything
 * else in this directory (ADR-0004): the server has no dependencies, nothing to
 * audit and nothing to update. What is here is two specifications and no more —
 * VAPID (RFC 8292) to say who is sending, and aes128gcm (RFC 8291) to encrypt
 * the payload for one subscription. Both are small when you only need one
 * direction of them.
 *
 * The push service — Apple's, for an iPhone — sees ciphertext and an endpoint.
 * It never sees what was written, and it cannot: the keys belong to the
 * subscription, which belongs to the phone.
 */
import { createECDH, createPrivateKey, createCipheriv, hkdfSync, randomBytes, sign } from 'node:crypto';

const b64url = (buffer) => Buffer.from(buffer).toString('base64url');

/**
 * The pair's own signing key, made once and kept with their data.
 *
 * It could have been an environment variable, and then enabling notifications
 * would have meant an SSH session, a generated key and a restart — which is
 * exactly the kind of step that does not happen. It lives in the store instead:
 * generated on first use, stable afterwards, and if it is ever lost both phones
 * simply subscribe again.
 */
export function vapidKeys(store) {
  if (!store.push) store.push = { keys: null, subscriptions: { a: [], b: [] } };
  if (!store.push.keys) {
    const curve = createECDH('prime256v1');
    curve.generateKeys();
    store.push.keys = {
      publicKey: b64url(curve.getPublicKey()),
      privateKey: b64url(curve.getPrivateKey()),
      createdAt: Date.now(),
    };
    return { keys: store.push.keys, made: true };
  }
  return { keys: store.push.keys, made: false };
}

/** The private key as something `sign` will accept: a JWK built from raw bytes. */
function signingKey(keys) {
  const publicKey = Buffer.from(keys.publicKey, 'base64url');
  return createPrivateKey({
    format: 'jwk',
    key: {
      kty: 'EC',
      crv: 'P-256',
      // The uncompressed point is 0x04 || x || y.
      x: b64url(publicKey.subarray(1, 33)),
      y: b64url(publicKey.subarray(33, 65)),
      d: keys.privateKey,
    },
  });
}

/**
 * "This push is from us, and here is where to complain."
 *
 * A JWT for the push service's own origin, signed with the pair's key, valid
 * for a few hours. The subject is a URL rather than a mailbox on purpose: there
 * is no address to publish for a private app, and the spec allows either.
 */
function authorization(endpoint, keys) {
  const audience = new URL(endpoint).origin;
  const header = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = b64url(
    JSON.stringify({
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 6 * 60 * 60,
      sub: process.env.VAPID_SUBJECT ?? 'https://github.com/tarikaydin10/ryadom',
    }),
  );
  const signed = `${header}.${claims}`;
  // Raw r‖s, which is what JOSE wants; Node's default is DER.
  const signature = sign('sha256', Buffer.from(signed), { key: signingKey(keys), dsaEncoding: 'ieee-p1363' });
  return `vapid t=${signed}.${b64url(signature)}, k=${keys.publicKey}`;
}

/**
 * Encrypt one message for one subscription (RFC 8291, aes128gcm).
 *
 * Every step here exists to make the ciphertext readable by exactly one phone:
 * a throwaway key pair, a shared secret with the subscription's public key, and
 * the subscription's own auth secret mixed in so that a push service holding
 * the public key alone still has nothing.
 */
function encrypt(subscription, plaintext) {
  const userPublic = Buffer.from(subscription.keys.p256dh, 'base64url');
  const authSecret = Buffer.from(subscription.keys.auth, 'base64url');

  const server = createECDH('prime256v1');
  server.generateKeys();
  const serverPublic = server.getPublicKey();
  const shared = server.computeSecret(userPublic);

  const keyInfo = Buffer.concat([Buffer.from('WebPush: info\0'), userPublic, serverPublic]);
  const ikm = Buffer.from(hkdfSync('sha256', shared, authSecret, keyInfo, 32));

  const salt = randomBytes(16);
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));

  const cipher = createCipheriv('aes-128-gcm', cek, nonce);
  // One record, so the padding delimiter is 0x02 — "this is the last".
  const body = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(plaintext), Buffer.from([0x02])])), cipher.final()]);

  const header = Buffer.alloc(5);
  header.writeUInt32BE(4096, 0);
  header.writeUInt8(serverPublic.length, 4);
  return Buffer.concat([salt, header, serverPublic, body, cipher.getAuthTag()]);
}

/**
 * Send one notification. Returns 'ok', 'gone' or 'failed'.
 *
 * 'gone' is the only answer that changes anything on our side: a 404 or 410
 * means that subscription will never work again — the app was deleted, or the
 * phone was reset — and keeping it would mean retrying it forever.
 */
export async function push(subscription, payload, keys) {
  let response;
  try {
    response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        Authorization: authorization(subscription.endpoint, keys),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '86400',
        Urgency: 'normal',
      },
      body: encrypt(subscription, JSON.stringify(payload)),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    // No connection, a timeout, a push service having a bad day. The app is not
    // worse off than before notifications existed.
    return 'failed';
  }
  if (response.status === 404 || response.status === 410) return 'gone';
  return response.ok ? 'ok' : 'failed';
}
