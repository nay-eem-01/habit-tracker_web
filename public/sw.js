// DevHabit's service worker: shows reminders sent by web push. No offline cache: the app needs the API anyway.

self.addEventListener('push', (event) => {
  // the server sends {title, body, url}; anything else still shows something rather than nothing
  let message = {}
  try {
    message = event.data ? event.data.json() : {}
  } catch {
    message = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(message.title || 'DevHabit', {
      body: message.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: message.url || '/' },
    }),
  )
})

// a tap opens the app at the message's page, reusing an open tab when there is one
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => {
      const tab = tabs.find((client) => new URL(client.url).origin === self.location.origin)
      if (tab) return tab.focus().then(() => tab.navigate(url))
      return self.clients.openWindow(url)
    }),
  )
})
