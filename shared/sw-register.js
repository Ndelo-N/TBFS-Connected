/**
 * TBFS Service Worker Registration & PWA Features
 * Shared across all pages to ensure SW is registered regardless of entry point
 * 
 * Features:
 * - Service Worker registration with update detection
 * - Background Sync for offline cloud backup queuing
 * - Periodic Background Sync for automatic backup checks
 * - App Badge API for overdue loan notifications
 * 
 * Version: 2.1.0 (PWA Review - Future Improvements)
 */

// Verbose diagnostics are opt-in. (F-17)
const DEBUG = false;
function dbg(...args) { if (DEBUG) console.log(...args); }


(function() {
    'use strict';

    // =========================================
    // Service Worker Registration
    // =========================================
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('./sw.js')
                .then(function(registration) {
                    dbg('ServiceWorker registration successful with scope:', registration.scope);
                    
                    // Check for updates on load
                    registration.update();
                    
                    // Listen for updates
                    registration.addEventListener('updatefound', function() {
                        var newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', function() {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    dbg('New service worker installed - update available');
                                    window.dispatchEvent(new CustomEvent('swUpdateAvailable', {
                                        detail: { worker: newWorker }
                                    }));
                                }
                            });
                        }
                    });
                    
                    // Register periodic background sync (if supported)
                    registerPeriodicSync(registration);
                    
                    // Check for updates every 30 minutes
                    setInterval(function() {
                        registration.update();
                    }, 30 * 60 * 1000);
                })
                .catch(function(err) {
                    dbg('ServiceWorker registration failed:', err);
                });
            
            // Listen for controller change (update activated)
            navigator.serviceWorker.addEventListener('controllerchange', function() {
                dbg('Service worker controller changed - reloading page');
                setTimeout(function() {
                    window.location.reload();
                }, 100);
            });

            // Listen for sync messages from Service Worker
            navigator.serviceWorker.addEventListener('message', function(event) {
                if (event.data && event.data.type === 'SYNC_REQUESTED') {
                    handleSyncRequest(event.data.syncType);
                }
            });
        });
    }

    // =========================================
    // Background Sync API
    // =========================================
    
    /**
     * Register a one-time background sync for cloud backup.
     * Call this when a backup is queued while offline.
     */
    window.registerBackgroundSync = function() {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then(function(registration) {
                return registration.sync.register('cloud-backup-sync');
            }).then(function() {
                dbg('Background sync registered: cloud-backup-sync');
            }).catch(function(err) {
                dbg('Background sync registration failed:', err);
            });
        }
    };

    /**
     * Handle sync request from service worker
     */
    function handleSyncRequest(syncType) {
        dbg('Sync requested by service worker:', syncType);
        
        // Check if CloudBackup object exists (only on pages with cloud backup UI)
        if (typeof CloudBackup !== 'undefined' && CloudBackup.syncPendingBackups) {
            CloudBackup.syncPendingBackups();
        } else {
            // Fallback: check localStorage for pending backup flag
            var hasPending = localStorage.getItem('pendingCloudBackup');
            if (hasPending) {
                dbg('Pending backup found, but CloudBackup not available on this page');
                // The backup will be synced when user navigates to a page with CloudBackup
            }
        }
    }

    // =========================================
    // Periodic Background Sync
    // =========================================
    
    /**
     * Register periodic background sync for automatic backup checks.
     * Runs approximately every 12 hours (minimum allowed interval).
     */
    function registerPeriodicSync(registration) {
        if ('periodicSync' in registration) {
            navigator.permissions.query({ name: 'periodic-background-sync' }).then(function(status) {
                if (status.state === 'granted') {
                    registration.periodicSync.register('periodic-cloud-backup', {
                        minInterval: 12 * 60 * 60 * 1000 // 12 hours
                    }).then(function() {
                        dbg('Periodic background sync registered (12h interval)');
                    }).catch(function(err) {
                        dbg('Periodic sync registration failed:', err);
                    });
                } else {
                    dbg('Periodic background sync permission not granted');
                }
            }).catch(function() {
                dbg('Periodic background sync not supported');
            });
        }
    }

    // =========================================
    // App Badge API
    // =========================================
    
    /**
     * Update the app badge with the count of overdue loans.
     * The badge appears on the app icon on the home screen/taskbar.
     */
    window.updateAppBadge = function(count) {
        if ('setAppBadge' in navigator) {
            if (count > 0) {
                navigator.setAppBadge(count).catch(function(err) {
                    dbg('Failed to set app badge:', err);
                });
            } else {
                navigator.clearAppBadge().catch(function(err) {
                    dbg('Failed to clear app badge:', err);
                });
            }
        }
    };

    /**
     * Calculate and update badge for overdue loans.
     * Reads from localStorage (AppState) to count loans past due date.
     */
    window.refreshAppBadge = function() {
        try {
            var saved = localStorage.getItem('tbfsAppState');
            if (!saved) return;
            
            var state = JSON.parse(saved);
            if (!state.loans || !Array.isArray(state.loans)) return;
            
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            
            var overdueCount = 0;
            state.loans.forEach(function(loan) {
                if (loan.status === 'active' && loan.next_due_date) {
                    var dueDate = new Date(loan.next_due_date);
                    dueDate.setHours(0, 0, 0, 0);
                    if (dueDate < today) {
                        overdueCount++;
                    }
                }
            });
            
            window.updateAppBadge(overdueCount);
        } catch (err) {
            dbg('Badge update failed:', err);
        }
    };

    // Auto-refresh badge on page load and when state changes
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.refreshAppBadge();
        });
    } else {
        window.refreshAppBadge();
    }

    // Refresh badge when app state updates (cross-tab sync)
    window.addEventListener('storage', function(event) {
        if (event.key === 'tbfsAppState') {
            window.refreshAppBadge();
        }
    });
    window.addEventListener('appStateUpdated', function() {
        window.refreshAppBadge();
    });

})();
