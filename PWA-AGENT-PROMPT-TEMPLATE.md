# PWA Agent Prompt Template
## For Use With Any Programmatic AI Agent

**What this is:** A fill-in-the-blanks prompt template that produces a production-grade PWA shell in a single agent run. You fill in the `[PLACEHOLDERS]`, paste the entire prompt into an AI agent (Cursor, Claude, ChatGPT, Copilot, etc.), and get back a deployable PWA foundation.

**What you get:** ~2,000 lines of PWA infrastructure (manifest, service worker, offline page, meta tags, CSP, SRI, icons config, navigation, state management, CI/CD, shared styles). Everything needed to pass Chrome's install criteria and Lighthouse audits.

**What you still need after:** Business logic, domain-specific features, real data integration. Those go through the NO SPILT MILK Protocol's Phase 2 iterative process.

---

## How to Use

1. Copy the prompt below
2. Replace every `[PLACEHOLDER]` with your app's specifics
3. Delete the `<!-- INSTRUCTIONS: ... -->` comments
4. Paste into your AI agent
5. Run the pre-deployment verification script on the output
6. Test install + offline + Lighthouse on a real device

---

## The Prompt

```
You are building a production-grade Progressive Web App from scratch.
Follow the NO SPILT MILK Protocol (Phase 0 pre-filled below).
Produce ALL files listed in the deliverables section.
Every file must be complete, runnable, and production-ready.

============================
PHASE 0: PRE-FILLED ANSWERS
============================

GOAL:
"Build a PWA called [APP_NAME] that [DOES_WHAT] for [TARGET_USERS],
works offline for [OFFLINE_FEATURES], and is installable on
Android, iOS, and Desktop."

ENVIRONMENT:
- Language: HTML5, CSS3, vanilla JavaScript (no framework)
- Hosting: [GitHub Pages / Vercel / Netlify]
- Architecture: Multi-page (separate .html files per feature)
- Build pipeline: None (no bundler, no minification step)
- HTTPS: Provided automatically by hosting platform

APP PAGES:
<!-- List every page your app will have -->
1. index.html - [Dashboard / Home page description]
2. [page2].html - [Description]
3. [page3].html - [Description]
4. [page4].html - [Description]
<!-- Add more as needed -->

BRANDING:
- App name (full): [FULL_APP_NAME]
- App name (short, max 12 chars): [SHORT_NAME]
- Description: [ONE_SENTENCE_DESCRIPTION]
- Primary color (hex): [#667eea]
- Secondary color (hex): [#764ba2]
- Background gradient: linear-gradient(135deg, [#667eea] 0%, [#764ba2] 100%)
- Font family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
- Logo file: [LOGO_FILENAME.png] (or "none - use text fallback")

CDN DEPENDENCIES:
<!-- List every CDN library your app will use -->
1. [Library name] - [CDN URL]
2. [Library name] - [CDN URL]
<!-- Example: jsPDF - https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js -->
<!-- If none, write "None" -->

API ENDPOINTS (for CSP connect-src):
<!-- List every external origin your app calls -->
1. [https://api.example.com] - [purpose]
2. [https://other-service.com] - [purpose]
<!-- If none, write "'self' only" -->

DATA STORAGE:
- Method: localStorage
- Key name: [YOUR_STORAGE_KEY]
- Offline requirement: [Which data must work offline?]
- Sync strategy: [Background Sync when online / Manual / None]

VERSION:
- Initial version: 1.0.0
- Version location: Single source in shared/app-state.js

CACHING STRATEGY:
- HTML pages: Network-first (fresh content, cache fallback)
- CSS/JS/shared modules: Cache-first (versioned via cache name)
- CDN libraries: Cache-first (pinned versions)
- Images: Cache-first
- Fallback for uncached pages: offline.html

============================
DELIVERABLES (produce ALL)
============================

Generate these files with COMPLETE, PRODUCTION-READY content:

1. manifest.json
   - All required fields (name, short_name, start_url, scope, display, etc.)
   - Icons array with "purpose": "any" for all sizes
   - Separate "purpose": "maskable" entries for 192 and 512
   - Shortcuts for top 3 most-used pages
   - share_target (if applicable to the app)
   - categories array
   - NO references to files that don't exist
   - Valid JSON (parseable by JSON.parse)

2. sw.js (Service Worker)
   - Cache name with version: '[app-name]-v1'
   - urlsToCache array listing ALL pages, shared modules, CDN libs, key icons
   - Install handler: cache.addAll(urlsToCache)
   - Fetch handler: network-first for HTML (navigate), cache-first for assets
   - HTML fallback chain: network -> cache -> offline.html
   - Activate handler: delete old caches, clients.claim()
   - Message handler: SKIP_WAITING support
   - Sync handler: notify clients to sync pending data
   - Periodic sync handler: delegate to clients
   - Push notification handler with icon and actions
   - Notification click handler
   - NO console.log statements (production code)

3. offline.html
   - Branded with app colors and logo
   - Clear "You're offline" message
   - "Try Again" button (reloads page)
   - "Go to Dashboard" link (to cached index.html)
   - Auto-detect when connection returns and reload
   - Status indicator (offline dot with animation)
   - Inline styles (no external dependencies)
   - CSP meta tag (self only, no CDN needed)

4. splash.html
   - Branded loading screen with logo and spinner
   - Auto-redirect to index.html after 2 seconds
   - Logo fallback if image fails to load
   - Inline styles (no external dependencies)

5. shared/styles.css
   - CSS custom properties (--primary-color, --spacing-*, --radius-*, --shadow-*, --font-*)
   - Reset styles (* { margin: 0; padding: 0; box-sizing: border-box })
   - Body with gradient background and padding for fixed nav
   - .container class (max-width, centered, white background, rounded)
   - .page-content class (padding)
   - Fixed header/navigation styles with hamburger menu for mobile
   - .nav-item styles with active state
   - Button styles (.btn, .btn-primary, .btn-secondary, .btn-danger)
   - Form styles (.form-group, .form-label, .form-input, .form-select)
   - Card styles (.card, .card-header)
   - Stats grid (.stats-row, .stat-item, .stat-value, .stat-label)
   - Alert/notification styles (.alert, .alert-success, .alert-warning, .alert-danger)
   - Table styles (responsive, striped rows)
   - Responsive breakpoints (mobile-first)
   - ALL text colors must pass WCAG AA contrast (4.5:1 on white)
   - Use #636e72 for muted text (NOT #7f8c8d or #95a5a6)

6. shared/navigation.js
   - NavigationManager class
   - pages array with id, title, url, description for each page
   - render() method generating header + nav + hamburger menu
   - init(currentPageId) method
   - Keyboard navigation (arrow left/right between pages)
   - Hamburger toggle with ARIA attributes
   - Close menu on outside click and on link click
   - Legacy hash URL redirect support

7. shared/app-state.js
   - AppStateManager class
   - VERSION constant (single source of truth)
   - STORAGE_KEY constant
   - getDefaultState() with all data fields initialized
   - load() with localStorage, JSON parse, backwards-compatible merge
   - save() with lastModified timestamp and cross-tab broadcast
   - onUpdate() listener for storage events (cross-tab sync)
   - exportJSON() and importJSON() for backup/restore
   - getStorageInfo() for storage usage stats
   - validate() for data integrity checks

8. shared/sw-register.js
   - SW registration from any page entry point
   - Update detection (updatefound + statechange)
   - Controller change listener with auto-reload
   - Background Sync registration function (window.registerBackgroundSync)
   - Periodic Background Sync registration (with permission check)
   - App Badge API (window.updateAppBadge, window.refreshAppBadge)
   - Sync message handler from SW
   - Auto-refresh badge on page load and state changes

9. .gitignore
   - desktop.ini, Thumbs.db, .DS_Store, ._*
   - .vscode/, .idea/, *.swp, *.swo, *~
   - node_modules/

10. .github/workflows/deploy.yml
    - Deploy to GitHub Pages on push to main
    - Uses actions/checkout@v4, configure-pages@v4, upload-pages-artifact@v3, deploy-pages@v4

11. .github/workflows/lighthouse.yml
    - Runs on push to main, PRs to main, and manual dispatch
    - Installs @lhci/cli
    - Audits index.html + 2 other key pages
    - No preset (individual assertions)
    - Performance audits: off (unreliable in CI)
    - Accessibility, best-practices, SEO: warn
    - CSP-XSS: off (unsafe-inline required without build pipeline)
    - Upload to temporary-public-storage

12. icons/browserconfig.xml
    - Microsoft tile configuration
    - References icon-72x72, icon-152x152, icon-384x384
    - TileColor matching app theme

13. HTML page template (apply to EVERY .html page)
    Every page must include this exact <head> structure:
    - <meta charset="UTF-8">
    - <meta http-equiv="Content-Security-Policy" content="default-src 'self';
        script-src 'self' 'unsafe-inline' [CDN_ORIGINS];
        style-src 'self' 'unsafe-inline';
        img-src 'self' data: blob:;
        connect-src 'self' [API_ORIGINS];
        font-src 'self';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';">
    - <meta name="viewport" content="width=device-width, initial-scale=1.0">
    - <meta name="theme-color" content="[PRIMARY_COLOR]">
    - <meta name="description" content="[UNIQUE_PER_PAGE]">
    - <meta name="application-name" content="[SHORT_NAME]">
    - <meta name="apple-mobile-web-app-capable" content="yes">
    - <meta name="apple-mobile-web-app-status-bar-style" content="default">
    - <meta name="apple-mobile-web-app-title" content="[SHORT_NAME]">
    - <meta name="format-detection" content="telephone=no">
    - <meta name="mobile-web-app-capable" content="yes">
    - <meta name="msapplication-TileColor" content="[PRIMARY_COLOR]">
    - <meta name="msapplication-tap-highlight" content="no">
    - <link rel="manifest" href="manifest.json">
    - <link rel="apple-touch-icon" href="icons/icon-192x192.png">
    - <link rel="icon" type="image/png" sizes="32x32" href="icons/icon-32x32.png">
    - <link rel="icon" type="image/png" sizes="16x16" href="icons/icon-16x16.png">
    - <link rel="icon" href="icons/favicon.ico" sizes="any">
    - <link rel="stylesheet" href="shared/styles.css">
    - CDN scripts with integrity="sha384-[HASH]" crossorigin="anonymous"
    
    Every page must include this in <body>:
    - <div id="navigation-header"></div>
    - <main class="container" role="main"> wrapping all content
    - </main> closing before scripts
    - <h1> as first heading, then <h2>, then <h3> (never skip levels)
    - All <label> elements must have for="inputId" attributes
    - All <select> elements must have associated labels
    - Shared scripts: app-state.js, calculations.js (if needed), navigation.js
    - <script src="shared/sw-register.js"></script> before </body>
    - NavigationManager.init('[pageId]') called on DOMContentLoaded

14. pwa-test.html (PWA Health Check page)
    A standalone, zero-dependency test page that auto-verifies the entire PWA.
    CRITICAL: Do NOT cache this file in the service worker (it must always
    fetch fresh to test caching behaviour from the outside).
    
    Must run these automated checks on page load:
    
    MANIFEST CHECKS:
    - manifest.json reachable and valid JSON
    - All required fields present (name, short_name, start_url, display, theme_color, background_color)
    - 192x192 icon with purpose "any" exists
    - 512x512 icon with purpose "any" exists
    - At least one maskable icon exists
    - No "maskable any" on same entry
    - All screenshot files exist (if screenshots array present)
    - No display_override unless intentional
    
    SERVICE WORKER CHECKS:
    - Service Worker API supported by browser
    - SW registered with correct scope
    - SW active (not just installed)
    - Controller present (SW controlling this page)
    - No update stuck in waiting state
    
    CACHE CHECKS:
    - Cache API supported
    - At least one cache exists
    - Only one cache active (no stale caches)
    - index.html cached
    - offline.html cached
    - manifest.json cached
    - shared/sw-register.js cached
    - shared/styles.css cached
    
    ICON & ASSET CHECKS:
    - icons/icon-192x192.png reachable
    - icons/icon-512x512.png reachable
    - icons/icon-32x32.png reachable
    - icons/icon-16x16.png reachable
    - icons/favicon.ico reachable
    - icons/browserconfig.xml reachable
    
    SECURITY CHECKS:
    - Secure context (HTTPS or localhost)
    - SRI hashes present on all CDN scripts in index.html
    - SRI coverage ratio (X/Y CDN scripts have integrity)
    
    PER-PAGE CHECKS (scan each app page by fetching its HTML):
    - CSP meta tag present
    - SW registration script present
    - <main> landmark present
    
    VERSION CHECKS:
    - Extract APP_VERSION from index.html and settings.html
    - Verify all versions match
    
    ACCESSIBILITY QUICK SCAN (on the test page itself):
    - <main> landmark present
    - Heading order sequential
    - All images have alt attributes
    
    UI REQUIREMENTS:
    - Summary cards at top: Passed / Failed / Warnings / Total
    - Score bar with percentage (green >= 90%, yellow >= 70%, red < 70%)
    - Collapsible sections for each check category
    - Pass/fail/warn badges on each check item
    - Detail text showing actual values found
    - Page links section showing all app pages with cached/not-cached status
    - Action buttons: "Re-Run All Checks", "Test Offline Mode" (instructions), "Clear All Caches"
    - Timestamp of last run
    - Fully self-contained: ALL styles inline, ALL JS inline, NO external dependencies
    - Dark header background for visual contrast with app pages

============================
CONSTRAINTS
============================

- Every file must be COMPLETE (no "// add more here" placeholders)
- All referenced files must exist (no 404s from manifest or HTML)
- favicon.ico generation: provide a Python script using Pillow to generate from PNG
- SRI hashes: provide the curl | openssl command to generate them for each CDN lib
- Color contrast: all text on white must be >= 4.5:1 WCAG AA ratio
- NO console.log in production service worker
- NO dead code (no empty handlers, no no-op functions)
- JSON must be valid (parseable)
- HTML must be valid (proper nesting, closed tags)
```

---

## After the Agent Delivers

### Verification Steps (Do These Before Adding Business Logic)

1. **Run the pre-deployment script** from `PWA-MASTER-CHECKLIST.md`
2. **Serve locally:** `npx serve .` (provides HTTPS-like localhost)
3. **Check Chrome DevTools > Application:**
   - Manifest tab: "Installable" with no errors
   - Service Workers tab: SW registered with correct scope
   - Cache Storage tab: All URLs cached
4. **Install the app** from Chrome address bar
5. **Go offline** (DevTools > Network > Offline):
   - Navigate to cached pages -- should load
   - Navigate to uncached URL -- should show offline.html
6. **Run Lighthouse** (DevTools > Lighthouse):
   - Target: Accessibility >= 90, Best Practices >= 90, SEO >= 90
   - PWA badge should appear
7. **Test on phone** (Android Chrome + iOS Safari)

### Then Switch to Iterative Mode

Once the shell passes all checks, switch to NO SPILT MILK Phase 2 for business logic:
- One feature per iteration
- <= 100 new lines per step
- Pair programming mindset
- "Run this and share errors"

---

## Example: Filled-In Prompt for TBFS

For reference, here's how the placeholders would be filled for the TBFS app:

```
APP_NAME: TBFS Loan Management System
SHORT_NAME: TBFS Loans
DOES_WHAT: manages ethical lending operations including loan calculations, payment tracking, stockvel member management, and financial reporting
TARGET_USERS: Thaba Bosiu Financial Services staff
OFFLINE_FEATURES: dashboard, loan calculator, active loans, all navigation
FULL_APP_NAME: TBFS Loan Management System
ONE_SENTENCE_DESCRIPTION: Thaba Bosiu Financial Services - Ethical Lending Management System
PRIMARY_COLOR: #667eea
SECONDARY_COLOR: #764ba2
LOGO_FILENAME: TBFS_Logo.png

APP PAGES:
1. index.html - Dashboard with portfolio overview, financial stats, alerts
2. calculator.html - Loan calculator for standard and stockvel loans
3. active-loans.html - Active loan management with payments and statements
4. stockvel.html - Stockvel member registration, contributions, bonuses
5. clients.html - Client database with loan history
6. reports.html - Business analytics with charts
7. loan-income-calculator.html - Income projection tables
8. settings.html - Backup, restore, version management

CDN DEPENDENCIES:
1. jsPDF - https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
2. SheetJS - https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
3. Chart.js - https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js

API ENDPOINTS:
1. https://ndelo-n.github.io - version checking
2. https://api.github.com - cloud backup

DATA STORAGE:
- Key: tbfsAppState
- Offline: All loan data, client data, stockvel data
- Sync: Background Sync for cloud backup queue
```

---

## Realistic Expectations

| What the Prompt Produces | Quality | Needs Human Review? |
|-------------------------|---------|-------------------|
| manifest.json | 95% production-ready | Quick check for typos |
| sw.js | 90% production-ready | Test caching behavior manually |
| offline.html | 95% production-ready | Visual check on phone |
| shared/styles.css | 85% production-ready | Responsive design needs device testing |
| shared/navigation.js | 90% production-ready | Test hamburger on real mobile |
| shared/app-state.js | 90% production-ready | Verify storage schema matches your needs |
| shared/sw-register.js | 95% production-ready | Minimal review needed |
| Meta tags / CSP / SRI | 95% production-ready | Verify CDN origins are correct |
| Lighthouse CI config | 85% production-ready | May need assertion tuning (as we saw) |
| Business logic pages | **0% -- not included** | **This is Phase 2 work** |

**Bottom line: The prompt gives you a ~2,000 line PWA shell that would have taken TBFS 17 commits and 3 review cycles to get right. Your business logic (18,000+ lines) still needs the iterative Phase 2 process.**
