const CACHE_NAME = 'wellness-check-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/App.css'
];

// Install service worker
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Fetch from cache, fallback to network
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});

// Activate - clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Push Notification Handling
self.addEventListener('push', (e) => {
  const data = e.data?.json();
  if (!data) return;

  const options = {
    body: data.body || 'Wellness Check notification',
    icon: '/vite.svg',
    badge: '/vite.svg',
    data: data
  };

  e.waitUntil(
    self.registration.showNotification(data.title || 'Wellness Check', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  
  if (e.action) {
    // Handle action buttons if needed
    return;
  }

  e.waitUntil(
    clients.openWindow('/')
  );
});

// Push subscription creation
self.addEventListener('pushsubscriptionchange', (e) => {
  e.waitUntil(
    clients.matchAll({ includeUncontrolled: true }).then((clientsArr) => {
      const sendSubscription = (subscription: PushSubscription) => {
        fetch('/api/notifications/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ subscription })
        });
      };

      if (e.newSubscription) {
        sendSubscription(e.newSubscription);
      }
    })
  );
});
