const CACHE_NAME = 'tbfs-loan-manager-v68'; // manageLoanClientPortal keeps account-priority resolve
const urlsToCache = [
  './',
  './index.html',                    // manageLoanClientPortal keeps account-priority resolve
  './calculator.html',               // manageLoanClientPortal keeps account-priority resolve
  './active-loans.html',             // manageLoanClientPortal keeps account-priority resolve
  './stockvel.html',                 // manageLoanClientPortal keeps account-priority resolve
  './clients.html',                  // manageLoanClientPortal keeps account-priority resolve
  './client-relationship.html',      // manageLoanClientPortal keeps account-priority resolve
  './client-portal.html',            // manageLoanClientPortal keeps account-priority resolve
  './reports.html',                  // manageLoanClientPortal keeps account-priority resolve
  './loan-income-calculator.html',   // manageLoanClientPortal keeps account-priority resolve
  './settings.html',                 // manageLoanClientPortal keeps account-priority resolve
  './offline.html',                  // manageLoanClientPortal keeps account-priority resolve
  './splash.html',                   // manageLoanClientPortal keeps account-priority resolve
  './shared/app-state.js?v=68',      // manageLoanClientPortal keeps account-priority resolve
  './shared/navigation.js?v=68',     // manageLoanClientPortal keeps account-priority resolve
  './shared/calculations.js?v=68',   // manageLoanClientPortal keeps account-priority resolve
  './shared/styles.css',             // manageLoanClientPortal keeps account-priority resolve
  './shared/sw-register.js?v=68',    // manageLoanClientPortal keeps account-priority resolve
  './shared/sanitize.js?v=68',       // manageLoanClientPortal keeps account-priority resolve
  './shared/cloud-backup.js?v=68',   // manageLoanClientPortal keeps account-priority resolve
  './shared/client-status.js?v=68',  // manageLoanClientPortal keeps account-priority resolve
  './shared/loan-statement-pdf.js?v=68', // manageLoanClientPortal keeps account-priority resolve
  './manifest.json',                 // manageLoanClientPortal keeps account-priority resolve
  './vendor/jspdf.umd.min.js',       // manageLoanClientPortal keeps account-priority resolve
  './vendor/xlsx.full.min.js',       // manageLoanClientPortal keeps account-priority resolve
  './vendor/chart.umd.min.js',       // manageLoanClientPortal keeps account-priority resolve
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './TBFS_Logo.png'
];

// manageLoanClientPortal keeps account-priority resolve
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

// manageLoanClientPortal keeps account-priority resolve
self.addEventListener('fetch', function(event) {
  // manageLoanClientPortal keeps account-priority resolve
  var url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }
  
  // manageLoanClientPortal keeps account-priority resolve
  if (event.request.destination === 'document' || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          // manageLoanClientPortal keeps account-priority resolve
          if (response && response.status === 200) {
            var responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              })
              .catch(function() {
                // manageLoanClientPortal keeps account-priority resolve
              });
          }
          return response;
        })
        .catch(function() {
          // manageLoanClientPortal keeps account-priority resolve
          return caches.match(event.request).then(function(response) {
            return response || caches.match('./offline.html');
          });
        })
    );
    return;
  }
  
  // manageLoanClientPortal keeps account-priority resolve
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(function(response) {
          // manageLoanClientPortal keeps account-priority resolve
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // manageLoanClientPortal keeps account-priority resolve
          var responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            })
            .catch(function() {
              // manageLoanClientPortal keeps account-priority resolve
            });

          return response;
        }).catch(function() {
          // manageLoanClientPortal keeps account-priority resolve
          return undefined;
        });
      })
  );
});

// manageLoanClientPortal keeps account-priority resolve
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
      // manageLoanClientPortal keeps account-priority resolve
      return self.clients.claim();
    })
  );
});

// manageLoanClientPortal keeps account-priority resolve
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// manageLoanClientPortal keeps account-priority resolve
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

// manageLoanClientPortal keeps account-priority resolve
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

// manageLoanClientPortal keeps account-priority resolve
self.addEventListener('sync', function(event) {
  if (event.tag === 'cloud-backup-sync') {
    event.waitUntil(
      notifyClientsToSync('cloud-backup')
    );
  }
});

// manageLoanClientPortal keeps account-priority resolve
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
