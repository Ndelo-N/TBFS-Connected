# PWA Master Checklist -- "NO SPILT MILK" Protocol

**Purpose:** A reusable, step-by-step checklist for building production-grade Progressive Web Apps from day one, avoiding the iteration cycles that plagued TBFS v1.0 through v1.7.11.

**Origin:** Derived from the full PWA review of the TBFS Loan Management System, where 19 issues were discovered across 8 HTML pages, 1 service worker, and 1 manifest. Every item in this checklist maps to a real defect that cost time to fix retroactively.

---

## The "NO SPILT MILK" Protocol

"NO SPILT MILK" is a mnemonic framework where each letter represents a critical PWA development domain. The order reflects the recommended build sequence -- earlier letters should be addressed before later ones, as they form dependencies.

| Letter | Domain | One-Line Summary |
|--------|--------|-----------------|
| **N** | **Networking Strategy** | Define your caching strategies before writing code |
| **O** | **Offline Experience** | Every screen must work without internet |
| **S** | **Service Worker** | The engine -- registration, lifecycle, updates |
| **P** | **Performance** | Fast first load, fast repeat visits |
| **I** | **Installability** | Pass every install criteria from day one |
| **L** | **Lighthouse** | Automate auditing -- never ship blind |
| **T** | **Testing** | Cross-browser, cross-device, offline scenarios |
| **M** | **Manifest** | Complete, valid, no broken references |
| **I** | **Icons & Assets** | Every size, every purpose, every platform |
| **L** | **Loading & UX** | Splash screens, skeletons, perceived speed |
| **K** | **Key Security** | HTTPS, CSP, SRI, no open doors |

---

## How Effective Is "NO SPILT MILK" for TBFS?

### Evaluation Against Actual TBFS Defects

Every issue found in the TBFS PWA review maps to a NO SPILT MILK domain:

| TBFS Issue | Severity | NO SPILT MILK Domain | Would Protocol Have Caught It? |
|-----------|----------|---------------------|-------------------------------|
| Icon purpose "maskable any" | CRITICAL | **I** (Icons) | Yes -- checklist requires separate purpose entries |
| Missing screenshots (404s) | CRITICAL | **M** (Manifest) | Yes -- checklist validates all referenced files exist |
| Missing favicon.ico | CRITICAL | **I** (Icons) | Yes -- checklist requires favicon generation |
| Missing browserconfig.xml | CRITICAL | **I** (Icons) | Yes -- checklist covers MS tile support |
| Version mismatch across pages | CRITICAL | **T** (Testing) | Yes -- checklist requires version consistency check |
| SW only registered from index.html | HIGH | **S** (Service Worker) | Yes -- checklist requires SW on all entry points |
| Missing meta tags on sub-pages | HIGH | **I** (Installability) | Yes -- checklist requires consistent meta tags |
| No offline fallback page | HIGH | **O** (Offline) | Yes -- the entire O domain covers this |
| No CSP headers | MEDIUM | **K** (Key Security) | Yes -- checklist requires CSP on every page |
| No SRI on CDN scripts | MEDIUM | **K** (Key Security) | Yes -- checklist requires integrity hashes |
| display_override WCO unused | MEDIUM | **M** (Manifest) | Yes -- checklist says don't add features you don't implement |
| Background sync no-op | MEDIUM | **S** (Service Worker) | Yes -- checklist says no dead code in SW |
| Excessive console.log in SW | MEDIUM | **P** (Performance) | Yes -- checklist requires production cleanup |
| No Lighthouse CI | MEDIUM | **L** (Lighthouse) | Yes -- the entire L domain covers this |
| Large HTML files (368KB) | MEDIUM | **P** (Performance) | Yes -- checklist sets size budgets |
| Color contrast failures | LOW | **T** (Testing) | Yes -- accessibility testing catches this |
| Missing form labels | LOW | **T** (Testing) | Yes -- accessibility testing catches this |
| No `<main>` landmark | LOW | **T** (Testing) | Yes -- accessibility testing catches this |
| desktop.ini in repo | LOW | **T** (Testing) | Yes -- checklist requires .gitignore from start |

**Verdict: 19/19 issues (100%) would have been prevented by following the protocol.**

### Strengths of the Protocol

1. **Memorable** -- "NO SPILT MILK" is easy to recall during development
2. **Sequential** -- The letter order matches a natural build sequence (networking before offline, offline before SW, etc.)
3. **Comprehensive** -- 11 domains cover every PWA concern without redundancy
4. **Actionable** -- Each domain translates directly to checkable items
5. **Severity-aligned** -- The first letters (N, O, S) cover the most critical PWA features

### Weaknesses / Gaps

1. **Accessibility isn't explicit** -- A11y falls under T (Testing) but deserves its own emphasis. Consider "NO SPILT MILK + A" or embedding it more prominently in T.
2. **Data persistence not covered** -- LocalStorage, IndexedDB, storage quotas aren't directly addressed. Could fall under N (Networking) or O (Offline).
3. **Update UX not explicit** -- The update flow (skip-waiting, banner, version check) falls between S and L but deserves a clear checklist section.

### Recommended Enhancement

Add a "12th commandment" -- **A for Accessibility** -- making it "NO SPILT MILK-A" or restructure T to be "Testing & Accessibility" with explicit sub-items.

---

## The Complete Checklist

Use this as a template. Copy it into every new PWA project's README or CONTRIBUTING.md. Check items off as you build.

---

### N -- Networking Strategy
*Define before writing any code. This is your architectural foundation.*

- [ ] **Choose caching strategy per resource type:**
  - [ ] HTML pages: Network-first (fresh content, cache fallback)
  - [ ] CSS/JS assets: Cache-first (fast loads, background refresh)
  - [ ] API responses: Network-first or stale-while-revalidate
  - [ ] Images/fonts: Cache-first with long TTL
  - [ ] CDN resources: Cache-first (versioned URLs)
- [ ] **Document the strategy** in a comment block at the top of your service worker
- [ ] **Plan cache versioning** -- use a `CACHE_NAME` constant with version number
- [ ] **Plan cache cleanup** -- old caches deleted on SW activate event
- [ ] **Plan cache size limits** -- don't cache everything, set a budget
- [ ] **Handle non-HTTP schemes** -- skip `chrome-extension://`, `blob:`, etc. in fetch handler
- [ ] **Handle opaque responses** -- don't cache `response.type === 'opaque'` blindly (quota impact)

**TBFS lesson:** The network-first for HTML / cache-first for assets strategy was the right call. But CDN resources were cached without SRI validation.

---

### O -- Offline Experience
*Every screen the user can reach must have an offline story.*

- [ ] **Create a dedicated offline fallback page** (`offline.html`)
  - [ ] Branded with your app's look and feel
  - [ ] Clear "You're offline" messaging
  - [ ] Auto-detect when connection returns and reload
  - [ ] Link back to cached pages (e.g., dashboard)
- [ ] **Cache all app shell pages** in the SW install event
- [ ] **Cache the offline page** in the SW install event
- [ ] **Fallback chain:** Network -> Cache -> Offline page (never show browser error)
- [ ] **Test offline on every page:** disconnect network, navigate to each page
- [ ] **Handle offline data mutations:**
  - [ ] Queue writes when offline (localStorage or IndexedDB)
  - [ ] Sync when back online (Background Sync API)
  - [ ] Show visual indicator when offline (status dot, banner)
- [ ] **Never show a blank white screen** -- always have a cached response or fallback

**TBFS lesson:** The app cached pages but had no dedicated offline page. When an uncached page was requested offline, users got the dashboard instead of a clear "you're offline" message.

---

### S -- Service Worker
*The engine that makes everything work. Get the lifecycle right from day one.*

- [ ] **Register the SW from EVERY page**, not just index.html
  - [ ] Create a shared `sw-register.js` file included on all pages
  - [ ] Or inline the registration in a shared script
- [ ] **Use `self.skipWaiting()`** in the SW message handler
- [ ] **Use `self.clients.claim()`** in the activate handler
- [ ] **Handle the update flow:**
  - [ ] Detect `updatefound` event on registration
  - [ ] Track the `installing` worker's state changes
  - [ ] Show update banner when new SW is `installed` but waiting
  - [ ] Send `SKIP_WAITING` message when user clicks "Update"
  - [ ] Listen for `controllerchange` and reload the page
- [ ] **Periodic update checks** (e.g., `registration.update()` every 30 minutes)
- [ ] **No dead code in the SW** -- don't add handlers you don't implement
  - [ ] If you add `sync` handler, implement actual sync logic
  - [ ] If you add `push` handler, have a push subscription
- [ ] **Minimal logging in production** -- remove or gate `console.log` behind a debug flag
- [ ] **Bump cache version** on every deployment that changes cached resources

**TBFS lesson:** SW was only registered from `index.html`. Users entering via deep links had no SW. Background sync was a no-op. 20+ console.log calls bloated the SW.

---

### P -- Performance
*Users on 3G mobile networks are your baseline.*

- [ ] **Set size budgets:**
  - [ ] HTML: < 100KB per page (TBFS had 368KB -- don't repeat this)
  - [ ] Total page weight: < 500KB first load
  - [ ] JavaScript: < 200KB per page (compressed)
- [ ] **Extract inline JavaScript** into separate `.js` files
  - [ ] Enables minification, caching, code-splitting
  - [ ] Enables proper CSP without `unsafe-inline`
- [ ] **Extract inline CSS** into shared stylesheet(s)
- [ ] **Defer non-critical scripts** with `defer` or `async` attributes
- [ ] **Lazy load images** with `loading="lazy"` attribute
- [ ] **Lazy load below-the-fold content** (e.g., tabs, modals)
- [ ] **Use responsive images** with `srcset` and `sizes` attributes
- [ ] **Minimize render-blocking resources** -- move CSS to `<link>` with `media` hints
- [ ] **Minify all assets** in your build pipeline (or use CDN-hosted minified versions)

**TBFS lesson:** `index.html` at 368KB with all JS inline. No build pipeline. No minification. This is the #1 remaining issue.

---

### I -- Installability
*Pass Chrome's installability checklist before your first deployment.*

- [ ] **Manifest linked on every page:** `<link rel="manifest" href="manifest.json">`
- [ ] **All install criteria met:**
  - [ ] `name` and `short_name` present
  - [ ] `start_url` present and valid
  - [ ] `display` set to `standalone`, `fullscreen`, or `minimal-ui`
  - [ ] `icons` includes at least 192x192 and 512x512
  - [ ] Icon with `purpose: "any"` exists (not just maskable)
  - [ ] Service worker registered with fetch handler
  - [ ] Served over HTTPS
- [ ] **Consistent PWA meta tags on ALL pages** (not just the entry page):
  - [ ] `<meta name="theme-color">`
  - [ ] `<meta name="description">` (unique per page)
  - [ ] `<meta name="application-name">`
  - [ ] `<meta name="apple-mobile-web-app-capable" content="yes">`
  - [ ] `<meta name="apple-mobile-web-app-status-bar-style">`
  - [ ] `<meta name="apple-mobile-web-app-title">`
  - [ ] `<meta name="mobile-web-app-capable" content="yes">`
  - [ ] `<meta name="format-detection" content="telephone=no">`
  - [ ] `<meta name="msapplication-TileColor">`
  - [ ] `<meta name="msapplication-tap-highlight" content="no">`
- [ ] **Version number consistent** across all pages and the service worker

**TBFS lesson:** Only `index.html` had the full meta tag set. Sub-pages were missing 8 meta tags each. Version was 1.7.4 on one page and 1.7.11 on another.

---

### L -- Lighthouse
*Automate auditing. Never deploy without scores.*

- [ ] **Add Lighthouse CI** to your CI/CD pipeline (GitHub Actions, GitLab CI, etc.)
- [ ] **Audit at least 3 representative pages** (entry page + 2 feature pages)
- [ ] **Set realistic assertion thresholds:**
  - [ ] Don't use strict presets (`lighthouse:all`) -- too many false positives
  - [ ] Turn OFF performance metrics in CI (unreliable on CI runners)
  - [ ] Set accessibility, best-practices, SEO as **warnings** (not failures)
  - [ ] Turn OFF `csp-xss` if you must use `unsafe-inline`
  - [ ] Turn OFF `total-byte-weight` / `unminified-javascript` if no build pipeline
- [ ] **Valid preset names:** `lighthouse:all`, `lighthouse:recommended`, `lighthouse:no-pwa`
- [ ] **Run Lighthouse locally** before every major release (Chrome DevTools > Lighthouse)
- [ ] **Track scores over time** -- use `temporary-public-storage` or your own LHCI server
- [ ] **Fix accessibility issues proactively:**
  - [ ] Every page has a `<main>` landmark
  - [ ] Heading order is sequential (h1 > h2 > h3, never skip)
  - [ ] All form inputs have associated `<label for="id">` elements
  - [ ] Color contrast ratio >= 4.5:1 for normal text, >= 3:1 for large text
  - [ ] All images have `alt` attributes

**TBFS lesson:** Initial Lighthouse CI used invalid preset name (`lighthouse:no-pwa-installable`). Second attempt had 63 failures because the preset was too strict. Had to customize individual assertions.

---

### T -- Testing & Accessibility
*Test what Lighthouse can't -- real user scenarios.*

- [ ] **Cross-browser testing:**
  - [ ] Chrome (primary PWA support)
  - [ ] Safari / iOS Safari (limited PWA, different service worker behavior)
  - [ ] Firefox (different manifest handling)
  - [ ] Edge (Chromium-based, generally matches Chrome)
- [ ] **Device testing:**
  - [ ] Mobile (primary target for most PWAs)
  - [ ] Tablet (responsive layout verification)
  - [ ] Desktop (window controls, install prompt)
- [ ] **Offline scenario testing:**
  - [ ] Go offline -> navigate all pages -> verify each loads from cache or offline page
  - [ ] Go offline -> perform a write action -> go online -> verify sync
  - [ ] Kill the tab while offline -> reopen -> verify data persists
- [ ] **Install testing:**
  - [ ] Install from Chrome (address bar prompt + menu)
  - [ ] Install on Android (Add to Home Screen)
  - [ ] Install on iOS (Share > Add to Home Screen)
  - [ ] Verify installed app opens in standalone mode
  - [ ] Verify shortcuts work from home screen long-press
- [ ] **Update testing:**
  - [ ] Deploy a new version -> open app -> verify update banner appears
  - [ ] Click "Update" -> verify app reloads with new content
  - [ ] Open in multiple tabs -> update -> verify all tabs refresh
- [ ] **Accessibility testing:**
  - [ ] Run axe DevTools on every page
  - [ ] Keyboard navigation (Tab, Enter, Escape work correctly)
  - [ ] Screen reader testing (at least VoiceOver or NVDA)
  - [ ] Color contrast checker for all text colors
- [ ] **Project hygiene:**
  - [ ] `.gitignore` includes OS files (`desktop.ini`, `.DS_Store`, `Thumbs.db`)
  - [ ] No utility/test files deployed to production
  - [ ] All file references in manifest/HTML actually exist (no 404s)

**TBFS lesson:** `desktop.ini` was committed. `favicon.ico` and `browserconfig.xml` were referenced but didn't exist. Color contrast failed on the most common text color. No `<main>` landmark on any page.

---

### M -- Manifest
*The manifest is your app's identity card. Every field matters.*

- [ ] **Required fields present and valid:**
  - [ ] `name` (full app name, max ~45 characters)
  - [ ] `short_name` (home screen label, max ~12 characters)
  - [ ] `description` (what the app does)
  - [ ] `start_url` (relative path, e.g., `"./"`)
  - [ ] `scope` (same as or parent of `start_url`)
  - [ ] `display` (`standalone` for most apps)
  - [ ] `background_color` (splash screen background)
  - [ ] `theme_color` (address bar / status bar color)
  - [ ] `lang` (e.g., `"en"`)
  - [ ] `orientation` (`"any"` unless app requires specific)
- [ ] **Icons array** (see Icons section below)
- [ ] **Don't reference files that don't exist** -- no 404s from manifest
  - [ ] If you add `screenshots`, create the actual screenshot files
  - [ ] If you add `shortcuts`, verify each URL resolves
- [ ] **Don't add features you haven't implemented:**
  - [ ] Don't add `display_override: ["window-controls-overlay"]` unless you use the WCO API
  - [ ] Don't add `share_target` unless your app handles the shared data
  - [ ] Don't add `file_handlers` unless you process the files
- [ ] **Validate JSON** -- use a JSON linter or `python -c "import json; json.load(open('manifest.json'))"`
- [ ] **Optional but recommended:**
  - [ ] `categories` (e.g., `["finance", "business"]`)
  - [ ] `shortcuts` (quick actions from app icon long-press)
  - [ ] `share_target` (receive data shared to your app)

**TBFS lesson:** Manifest referenced screenshots that didn't exist (404s). Had `display_override` with WCO that wasn't implemented. Icon purposes were misconfigured.

---

### I -- Icons & Assets
*Icons are the face of your app. Get them right on every platform.*

- [ ] **Generate all required sizes** from a single high-resolution source (1024x1024):
  - [ ] 16x16 (favicon, browser tab)
  - [ ] 32x32 (favicon, browser tab)
  - [ ] 72x72 (Android legacy)
  - [ ] 96x96 (Android, shortcuts)
  - [ ] 128x128 (Chrome Web Store)
  - [ ] 144x144 (MS tile, iOS)
  - [ ] 152x152 (iOS)
  - [ ] 192x192 (Android, Chrome install -- **required**)
  - [ ] 384x384 (Android splash)
  - [ ] 512x512 (Android splash, install -- **required**)
- [ ] **Separate icon purposes** in manifest:
  - [ ] Regular icons: `"purpose": "any"` (all sizes)
  - [ ] Maskable icons: `"purpose": "maskable"` (at least 192 + 512)
  - [ ] NEVER use `"purpose": "maskable any"` on the same entry
- [ ] **Generate favicon.ico** (16x16 + 32x32 multi-size ICO format)
- [ ] **Create browserconfig.xml** for Microsoft tiles
- [ ] **Apple touch icon:** `<link rel="apple-touch-icon" href="icons/icon-192x192.png">`
- [ ] **Favicon links on EVERY page:**
  ```html
  <link rel="icon" type="image/png" sizes="32x32" href="icons/icon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="icons/icon-16x16.png">
  <link rel="icon" href="icons/favicon.ico" sizes="any">
  ```
- [ ] **Verify safe zone** for maskable icons (important content within inner 80% circle)
- [ ] **Use `<link rel="icon">` NOT `<link rel="shortcut icon">`** (shortcut is deprecated)

**TBFS lesson:** All icons used `"maskable any"` on the same entry. favicon.ico didn't exist. browserconfig.xml was referenced with wrong path and didn't exist. `rel="shortcut icon"` was used (deprecated).

---

### L -- Loading & UX
*The time between tap and usable screen determines whether users keep your app.*

- [ ] **Splash screen configuration:**
  - [ ] `background_color` in manifest matches your app's background
  - [ ] `theme_color` matches your header/status bar color
  - [ ] 512x512 icon is clean and recognizable (shown during splash)
- [ ] **If using a custom splash page:**
  - [ ] Cache it in the service worker
  - [ ] Keep redirect time under 2 seconds
  - [ ] Show brand + loading indicator
  - [ ] Have a fallback if the logo image fails to load
- [ ] **Skeleton screens** for data-heavy pages (show layout shapes before data loads)
- [ ] **Loading indicators** for async operations (data fetch, file export, etc.)
- [ ] **Progressive enhancement:**
  - [ ] Core content visible without JavaScript (where possible)
  - [ ] Enhance with JS after load (animations, interactions)
- [ ] **Perceived performance:**
  - [ ] Instant navigation feedback (highlight clicked nav item immediately)
  - [ ] Optimistic UI updates (show change before server confirms)
- [ ] **Connection status indicator:**
  - [ ] Show "offline" badge when `navigator.onLine === false`
  - [ ] Auto-detect reconnection and clear the badge

**TBFS lesson:** `splash.html` existed but wasn't cached in the service worker. Would have failed offline. The offline page we created includes auto-reconnection detection -- a pattern to replicate.

---

### K -- Key Security
*Security isn't optional. These items prevent real attacks.*

- [ ] **HTTPS everywhere** (mandatory for PWAs, service workers, and install prompts)
  - [ ] GitHub Pages, Vercel, Netlify, Cloudflare all provide this automatically
  - [ ] If self-hosting, configure TLS certificates (Let's Encrypt)
- [ ] **Content Security Policy (CSP)** on every page:
  ```html
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline' https://your-cdn.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
    connect-src 'self' https://your-api.com;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  ">
  ```
  - [ ] Customize `script-src` CDN origins for your specific dependencies
  - [ ] Customize `connect-src` for your API endpoints
  - [ ] Add `data:` and `blob:` to `img-src` if generating images (PDFs, charts)
  - [ ] Goal: eliminate `'unsafe-inline'` by extracting JS to files (enables strict CSP)
- [ ] **Subresource Integrity (SRI)** on all CDN-loaded scripts:
  ```html
  <script src="https://cdn.example.com/lib.js"
          integrity="sha384-HASH_HERE"
          crossorigin="anonymous"></script>
  ```
  - [ ] Generate hashes: `curl -s URL | openssl dgst -sha384 -binary | openssl base64 -A`
  - [ ] Regenerate hashes when upgrading CDN library versions
- [ ] **No sensitive data in localStorage** (use encrypted storage for tokens)
- [ ] **Sanitize all user input** displayed in the DOM (prevent XSS)
- [ ] **CORS headers** configured correctly if using APIs

**TBFS lesson:** No CSP on any page. No SRI hashes on 3 CDN libraries. GitHub token stored in plain localStorage (acceptable for PAT-based auth but worth noting).

---

## Quick-Start Template

Copy this into a new project to start with all the foundations in place:

```
project/
  index.html              # Entry page with full meta tags + CSP + SW register
  offline.html            # Offline fallback page
  manifest.json           # Complete manifest with all required fields
  sw.js                   # Service worker with proper caching strategies
  .gitignore              # OS files, editor files, node_modules
  icons/
    icon-16x16.png
    icon-32x32.png
    icon-72x72.png
    icon-96x96.png
    icon-128x128.png
    icon-144x144.png
    icon-152x152.png
    icon-192x192.png
    icon-384x384.png
    icon-512x512.png
    favicon.ico
    browserconfig.xml
  shared/
    styles.css            # Shared stylesheet with CSS variables
    sw-register.js        # Shared SW registration (include on ALL pages)
  .github/
    workflows/
      lighthouse.yml      # Lighthouse CI for automated auditing
```

---

## Pre-Deployment Verification Script

Run this before every deployment:

```bash
# 1. Validate manifest JSON
python3 -c "import json; m=json.load(open('manifest.json')); print('Manifest: OK')"

# 2. Check all manifest-referenced files exist
python3 -c "
import json, os
m = json.load(open('manifest.json'))
missing = []
for icon in m.get('icons', []):
    if not os.path.exists(icon['src']): missing.append(icon['src'])
for ss in m.get('screenshots', []):
    if not os.path.exists(ss['src']): missing.append(ss['src'])
print('Missing files:', missing if missing else 'None')
"

# 3. Check favicon exists
ls icons/favicon.ico

# 4. Verify SW is referenced on all HTML pages
grep -L 'sw-register.js\|serviceWorker.register' *.html

# 5. Check version consistency
grep -h 'APP_VERSION' *.html | sort -u

# 6. Validate CSP present on all pages
grep -L 'Content-Security-Policy' *.html

# 7. Check SRI on CDN scripts
grep -c 'integrity="sha' *.html
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 2026 | Initial checklist derived from TBFS PWA review |

---

*"Don't cry over spilt milk -- prevent the spill."*
