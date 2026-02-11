/**
 * TBFS Service Worker Registration
 * Shared across all pages to ensure SW is registered regardless of entry point
 * 
 * Version: 2.0.0 (PWA Review Fix)
 */

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful with scope:', registration.scope);
                
                // Check for updates on load
                registration.update();
                
                // Listen for updates
                registration.addEventListener('updatefound', function() {
                    var newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', function() {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                console.log('New service worker installed - update available');
                                // Dispatch custom event for pages that want to show update UI
                                window.dispatchEvent(new CustomEvent('swUpdateAvailable', {
                                    detail: { worker: newWorker }
                                }));
                            }
                        });
                    }
                });
                
                // Check for updates every 30 minutes
                setInterval(function() {
                    registration.update();
                }, 30 * 60 * 1000);
            })
            .catch(function(err) {
                console.log('ServiceWorker registration failed:', err);
            });
        
        // Listen for controller change (update activated)
        navigator.serviceWorker.addEventListener('controllerchange', function() {
            console.log('Service worker controller changed - reloading page');
            setTimeout(function() {
                window.location.reload();
            }, 100);
        });
    });
}
