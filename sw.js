const CACHE_NAME = 'tbfs-loan-manager-v11'; // Increment when updating
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './TBFS_Logo.png'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  console.log('Service Worker: Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.log('Service Worker: Cache failed', error);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', function(event) {
  console.log('Service Worker: Fetch event for', event.request.url);
  
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        if (response) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return response;
        }
        
        console.log('Service Worker: Fetching from network', event.request.url);
        return fetch(event.request).then(function(response) {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(function() {
          // If both cache and network fail, show offline page
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Activate event');
  
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Listen for skip waiting message
self.addEventListener('message', function(event) {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Skip waiting');
    self.skipWaiting();
  }
});

// Background sync for offline data
self.addEventListener('sync', function(event) {
  console.log('Service Worker: Background sync');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Sync any pending data when back online
      syncPendingData()
    );
  }
});

// Push notifications
self.addEventListener('push', function(event) {
  console.log('Service Worker: Push event');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from TBFS',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: './icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: './icons/icon-96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('TBFS Loan Manager', options)
  );
});

// Notification click
self.addEventListener('notificationclick', function(event) {
  console.log('Service Worker: Notification click');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// Helper function for background sync
function syncPendingData() {
  // This would sync any pending loan data, payments, etc.
  // when the device comes back online
  return Promise.resolve();
}
