// Service Worker for Offline & Background Web Push Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Background Push Events
self.addEventListener('push', (event) => {
  let data = { title: 'InstaBoost Update', body: 'You have a new notification!', icon: '/icon.png', url: '/' };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon.png',
    badge: '/icon.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Open App' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.host) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Monetag Verification & Ad Service Worker
self.options = {
    "domain": "5gvci.com",
    "zoneId": 11560400
};
self.lary = "";
try {
  importScripts('https://5gvci.com/act/files/service-worker.min.js?r=sw');
} catch (e) {
  console.error('Monetag sw load error:', e);
}

