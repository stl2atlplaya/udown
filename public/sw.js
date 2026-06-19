self.addEventListener('push', function(event) {
  if (!event.data) return
  let data = {}
  try { data = event.data.json() } catch(e) { data = { title: 'uDown', body: event.data.text() } }

  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.type || 'udown',
    renotify: true,
    data: { type: data.type, url: '/' },
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(data.title || 'uDown', options))
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(clients.matchAll({ type: 'window' }).then(clientList => {
    for (const client of clientList) {
      if (client.url === '/' && 'focus' in client) return client.focus()
    }
    if (clients.openWindow) return clients.openWindow('/')
  }))
})
