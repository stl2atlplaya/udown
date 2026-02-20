// uDown Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle push notifications
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
          { action: 'no', title: '✗ Not tonight' }
        ]
      : [],
    tag: type === 'daily' ? 'daily-prompt' : 'match-result',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks & action buttons
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { action } = event;
  const { type } = event.notification.data;

  if (type === 'daily' && (action === 'yes' || action === 'no')) {
    // Direct action from notification tray — post to API
    event.waitUntil(
      fetch('/api/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ response: action }),
      }).then(() => {
        return self.registration.showNotification(
          action === 'yes' ? 'Got it 👀' : 'No worries.',
          {
            body: action === 'yes'
              ? 'Waiting to hear from your partner...'
              : 'We\'ll check again tomorrow.',
            icon: '/icon-192.png',
            tag: 'response-confirm',
          }
        );
      })
    );
  } else {
    // Open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/');
      })
    );
  }
});
