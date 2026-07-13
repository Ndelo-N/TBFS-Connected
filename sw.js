const CACHE_NAME = 'tbfs-loan-manager-v44'; // v1.9.0 - Security remediation: vendored libs, sanitize, cloud-backup
const urlsToCache = [
  './',
  './index.html',                    // Dashboard (refactored)
  './calculator.html',               // Loan Calculator
  './active-loans.html',             // Active Loans Management
  './stockvel.html',                 // Stockvel Members
  './clients.html',                  // Client Database
  './reports.html',                  // Business Reports
  './loan-income-calculator.html',   // Income Table Calculator
  './settings.html',                 // Settings & Backup
  './offline.html',                  // Offline Fallback Page
  './splash.html',                   // Splash/Loading Screen
  './shared/app-state.js?v=44',      // Shared: State Management
  './shared/navigation.js?v=44',     // Shared: Navigation
  './shared/calculations.js?v=44',   // Shared: Calculations
  './shared/styles.css',             // Shared: Styles
  './shared/sw-register.js?v=44',    // Shared: SW Registration
  './shared/sanitize.js?v=44',       // Shared: HTML escaping (F-04)
  './shared/cloud-backup.js?v=44',   // Shared: Cloud backup (F-12)
  './manifest.json',                 // PWA Manifest
  './vendor/jspdf.umd.min.js',       // Vendored (F-10)
  './vendor/xlsx.full.min.js',       // Vendored, 0.20.3 (F-10)
  './vendor/chart.umd.min.js',       // Vendored (F-10)
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './TBFS_Logo.png'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.error('Service Worker: Cache install failed', error);
      })
  );
});

// Fetch event - network-first for HTML, cache-first for assets
self.addEventListener('fetch', function(event) {
  // Skip non-HTTP(S) requests (chrome-extension, etc.)
  var url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }
  
  // For HTML documents, use network-first strategy to always get fresh code
  if (event.request.destination === 'document' || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          // Cache the fresh response
          if (response && response.status === 200) {
            var responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              })
              .catch(function() {
                // Silently handle cache errors
              });
          }
          return response;
        })
        .catch(function() {
          // Network failed - try cache, then offline page
          return caches.match(event.request).then(function(response) {
            return response || caches.match('./offline.html');
          });
        })
    );
    return;
  }
  
  // For everything else (CSS, JS, images), use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(function(response) {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone and cache the response
          var responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            })
            .catch(function() {
              // Silently handle cache errors (e.g., quota exceeded)
            });

          return response;
        }).catch(function() {
          // Asset not in cache and network failed
          return undefined;
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
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
    }).then(function() {
      // Claim all clients immediately so the new SW controls all open pages
      return self.clients.claim();
    })
  );
});

// Listen for skip waiting message from the app
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push notifications
self.addEventListener('push', function(event) {
  var options = {
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
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// Background Sync - triggered when connectivity returns after offline queuing
self.addEventListener('sync', function(event) {
  if (event.tag === 'cloud-backup-sync') {
    event.waitUntil(
      notifyClientsToSync('cloud-backup')
    );
  }
});

// Periodic Background Sync - auto-check for pending backups on schedule
self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'periodic-cloud-backup') {
    event.waitUntil(
      notifyClientsToSync('periodic-backup')
    );
  }
});

/**
 * Notify all open client windows to perform a sync operation.
 * The SW can't access localStorage directly, so it delegates to clients.
 */
function notifyClientsToSync(type) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: false })
    .then(function(clientList) {
      clientList.forEach(function(client) {
        client.postMessage({
          type: 'SYNC_REQUESTED',
          syncType: type,
          timestamp: Date.now()
        });
      });
    });
}
