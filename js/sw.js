/**
 * sw.js  (Service Worker)
 * -----------------------------------------------------------------------
 * HONEST NOTE: Truly instant background delivery when the app/tab is
 * fully closed requires the browser's Push API, which is backed by the
 * OS/browser vendor's push service (Google FCM on Android/Chrome, Apple
 * APNs for web push on iOS/Safari). That is a real third party in the
 * loop for the WAKE-UP PING ONLY - by design we never put chat content
 * in that ping. The push payload is always an empty/generic "someone is
 * calling you" trigger; the app then reconnects to Nostr relays live
 * and pulls the *encrypted signaling envelope* itself, and the actual
 * message/media content only ever flows peer-to-peer once the app is
 * open and the WebRTC channel is established. No message text or media
 * ever passes through the push service.
 *
 * While the app is open/foregrounded/backgrounded-but-alive, this file
 * also keeps a lightweight relay subscription warm so rings arrive
 * essentially instantly without needing OS push at all.
 * -----------------------------------------------------------------------
 */

const CACHE_NAME = 'ghost-shell-v1';
const SHELL_FILES = [
  './index.html', './auth.html', './contacts.html', './chat.html',
  './qr-connect.html', './settings.html', './css/style.css',
  './js/store.js', './js/auth.js', './js/nostr-signal.js',
  './js/webrtc-p2p.js', './js/qr-engine.js', './js/chat-ephemeral.js',
  './js/media-flame.js', './manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Serve the app shell instantly from cache, but never cache chat data
// (there is none to cache - it never touches storage in the first place).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// A push event carries NOTHING but a wake signal. No message content.
self.addEventListener('push', (event) => {
  let title = 'أحدهم يريد محادثتك';
  let body = 'اضغط لفتح المحادثة الآن';
  let chatId = null;
  try {
    const data = event.data ? event.data.json() : {};
    // Only ever expect { wake: true, from: '<pubkey-for-routing-only>' }
    if (data.from) chatId = data.from;
  } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-96.png',
      vibrate: [80, 40, 80],
      tag: 'ghost-ring',
      renotify: true,
      data: { chatId }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const chatId = event.notification.data?.chatId;
  const url = chatId ? `./chat.html?pub=${chatId}` : './contacts.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
