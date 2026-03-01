// uDown Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, type } = data;

  const options = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: type === 'match' ? [200, 100, 200, 100, 200] : [200],
    data: { type, url: '/' },
    actions: type === 'daily'
      ? [
          { action: 'yes', title: '✓ Yeah' },
          { action: 'snooze', title: '⏱ 1 hour' },
        ]
      : [],
    tag: type === 'daily' ? 'daily-prompt' : 'match-result',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { action } = event;
  const { type } = event.notification.data;

  if (type === 'daily' && action === 'yes') {
    // Get userId from IndexedDB or open the app
    event.waitUntil(
      getStoredUserId().then(userId => {
        if (userId) {
          return fetch('/api/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userId, response: 'yes' }),
          }).then(() => {
            return self.registration.showNotification('Got it 👀', {
              body: "Waiting to hear from your partner...",
              icon: '/icon-192.png',
              tag: 'response-confirm',
            });
          });
        } else {
          return openApp();
        }
      })
    );
  } else if (type === 'daily' && action === 'snooze') {
    event.waitUntil(
      getStoredUserId().then(userId => {
        if (userId) {
          return fetch('/api/remind', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          }).then(() => {
            return self.registration.showNotification("Got it. See you in an hour. 🌙", {
              body: "We'll check back in around then.",
              icon: '/icon-192.png',
              tag: 'snooze-confirm',
            });
          });
        }
      })
    );
  } else {
    event.waitUntil(openApp());
  }
});

function openApp() {
  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    if (clientList.length > 0) return clientList[0].focus();
    return clients.openWindow('/');
  });
}

function getStoredUserId() {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('udown', 1);
      request.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('user')) return resolve(null);
        const tx = db.transaction('user', 'readonly');
        const store = tx.objectStore('user');
        const get = store.get('userId');
        get.onsuccess = () => resolve(get.result || null);
        get.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
