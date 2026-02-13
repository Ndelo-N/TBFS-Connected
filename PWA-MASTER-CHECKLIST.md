# PWA Master Checklist
## Integrated with NO SPILT MILK Protocol v2.2

**Purpose:** A reusable, phase-by-phase checklist for building production-grade PWAs using the NO SPILT MILK development methodology. Designed so you never repeat the 19-issue, 17-commit remediation cycle that TBFS went through.

**How to use:** Follow the NO SPILT MILK phases in order. At each phase, complete the corresponding PWA-specific items below before moving to the next phase. The PWA items plug directly into the protocol's existing structure.

---

## Protocol Effectiveness Review

### How Well Does NO SPILT MILK Fit PWA Development?

**Overall Rating: 90/100 -- Highly Effective with Minor Supplements Needed**

The protocol's phased, incremental approach is an almost perfect fit for PWAs because:

| Protocol Principle | PWA Alignment | Why It Works |
|-------------------|---------------|-------------|
| **Always Runnable** | Perfect | A PWA is testable from the very first file -- install it, go offline, check manifest |
| **Tiny Steps (50/100 lines)** | Perfect | PWA features are naturally small: manifest (30 lines), SW (50 lines), offline page (40 lines) |
| **Pair Programming** | Perfect | User tests install flow on their phone while AI writes code -- each sees different things |
| **Runtime Is Truth** | Perfect | Lighthouse scores, DevTools Application tab, real install prompts -- all observable runtime facts |
| **Data & Security First** | Perfect | CSP, SRI, HTTPS, token storage are PWA security fundamentals that must come early |
| **Phase 0 Before Code** | Critical | 14 of 19 TBFS issues could have been prevented by proper Phase 0 planning |
| **Quality Gates** | Critical | "No PII exposed" + "handles bad input" maps directly to CSP and input sanitization |

### What the Protocol Catches That TBFS Missed

| TBFS Issue | Protocol Phase That Prevents It | How |
|-----------|-------------------------------|-----|
| Version mismatch (1.7.4 vs 1.7.11) | Phase 0 (Environment) | "Version management strategy" defined upfront |
| SW only on index.html | Phase 1 (Prototype) | Prototype includes SW registration on the FIRST page |
| No offline fallback | Phase 2 (Iteration 1) | "Offline page" is a natural first iteration |
| No CSP/SRI | Phase 0 (Security) + Phase 3 | Security-first mandate catches this in planning |
| 368KB index.html | Phase 4 (Refactoring) | Protocol enforces "extract repeated code to functions" |
| Missing meta tags on sub-pages | Phase 2 | Each new page goes through the same checklist |
| Lighthouse CI failures | Phase 5 (Production) | CI/CD stubs include auditing |

### What Needs Supplementing (The 10% Gap)

The protocol is a general-purpose programming methodology. PWAs have domain-specific concerns that don't appear in generic full-stack development:

| Gap | Where It Falls | Supplement Needed |
|-----|---------------|-------------------|
| Service Worker lifecycle | Not in any phase | Add SW lifecycle checklist to Phase 1 |
| Manifest completeness | Not in Environment Setup | Add manifest planning to Phase 0 |
| Icon generation pipeline | Not mentioned | Add to Phase 0 + Phase 1 |
| Install criteria (Chrome's requirements) | Not in any checklist | Add to Phase 1 Success Criteria |
| Caching strategy decisions | Not in Data Contract | Add to Phase 0 Data section |
| Lighthouse auditing | Partially in CI/CD | Promote from Phase 5 to Quality Gates |
| Apple/MS platform quirks | Not mentioned | Add to Phase 3 cross-platform testing |

The supplements below plug these gaps into the existing protocol structure without changing the protocol itself.

---

## Phase 0: Problem & Environment Setup (PWA Supplement)

*Add these items to your standard Phase 0 checklist.*

### Goal Statement Template
```
"Build a PWA that [does what] for [whom], works offline for [which features],
and is installable on [Android/iOS/Desktop]."
```

### Environment (PWA Additions)
```
- Hosting: [GitHub Pages / Vercel / Netlify / Self-hosted]
- HTTPS: [Auto via host / Let's Encrypt / Not configured]
- Architecture: [Single-page / Multi-page]
- Build pipeline: [None (vanilla) / Vite / Webpack / Parcel]
- Icon source: [Path to 1024x1024 master icon]
```

### Data Classification (PWA Additions)
```
- Storage: [localStorage / IndexedDB / Both]
- Offline data: [Which data must be available offline?]
- Sync strategy: [Background Sync / Manual / None]
- Cache budget: [Max total cache size in MB]
```

### PWA-Specific Planning (NEW -- Required)
Before writing any code, decide:

- [ ] **Caching strategy per resource type:**

| Resource | Strategy | Reason |
|----------|----------|--------|
| HTML pages | Network-first | Always get fresh content, cache as fallback |
| CSS/JS files | Cache-first | Versioned via SW cache name |
| CDN libraries | Cache-first | Pinned versions with SRI |
| API responses | Network-first | Data freshness critical |
| Images/fonts | Cache-first | Rarely change |

- [ ] **Icon sizes needed:** (list all: 16, 32, 72, 96, 128, 144, 152, 192, 384, 512)
- [ ] **Manifest fields planned:** (name, short_name, display, theme_color, etc.)
- [ ] **Target platforms:** (Android, iOS, Desktop -- affects meta tags needed)
- [ ] **Offline scope:** (Which pages work offline? All? Just dashboard?)
- [ ] **Update strategy:** (How does the user get new versions? Banner? Auto-reload?)
- [ ] **Version management:** (Single source of truth for APP_VERSION)

### Success Criteria (PWA Additions)
```
- Installable: Chrome "Install" button appears
- Offline: [Named pages] load without network
- Lighthouse: Accessibility >= 90, Best Practices >= 90, SEO >= 90
- Security: CSP present, SRI on all CDN scripts, no mixed content
```

### Phase 0 Deliverable
Before writing a single line of code, you should have:
1. A filled-out caching strategy table
2. A 1024x1024 master icon ready to generate sizes from
3. A list of all pages with their offline requirements
4. A security plan (CSP origins, SRI requirement, token storage)

---

## Phase 1: Minimal Working Prototype (PWA Supplement)

*The prototype for a PWA must include THREE files minimum: HTML + manifest + service worker. This is the smallest "installable" unit.*

### What Phase 1 Builds (PWA)
"A single page that is installable, works offline, and passes Chrome's install criteria."

### The 3-File PWA Prototype (~50 lines total)

**File 1: `index.html` (~20 lines)**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#667eea">
    <meta name="description" content="[App description]">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <link rel="manifest" href="manifest.json">
    <link rel="apple-touch-icon" href="icons/icon-192x192.png">
    <title>[App Name]</title>
</head>
<body>
    <main role="main">
        <h1>[App Name]</h1>
        <p>Prototype working.</p>
    </main>
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js');
        }
    </script>
</body>
</html>
```

**File 2: `manifest.json` (~15 lines)**
```json
{
    "name": "[Full App Name]",
    "short_name": "[Short]",
    "start_url": "./",
    "scope": "./",
    "display": "standalone",
    "background_color": "#667eea",
    "theme_color": "#667eea",
    "icons": [
        { "src": "icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
        { "src": "icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
        { "src": "icons/icon-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
        { "src": "icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
    ]
}
```

**File 3: `sw.js` (~15 lines)**
```javascript
const CACHE_NAME = 'app-v1';
const URLS = ['./', './index.html', './offline.html', './manifest.json', './icons/icon-192x192.png', './icons/icon-512x512.png'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS))));

self.addEventListener('fetch', e => {
    if (e.request.mode === 'navigate') {
        e.respondWith(fetch(e.request).then(r => {
            const clone = r.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
            return r;
        }).catch(() => caches.match(e.request).then(r => r || caches.match('./offline.html'))));
    } else {
        e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
    }
});

self.addEventListener('activate', e => e.waitUntil(
    caches.keys().then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
    .then(() => self.clients.claim())
));
```

### Phase 1 Verification
Ask the user to:
1. Generate 192x192 and 512x512 icons (even placeholder colored squares work)
2. Serve over HTTPS (or localhost) -- `npx serve .` works
3. Open Chrome DevTools > Application tab > Manifest -- verify "Installable"
4. Click "Install" in address bar -- verify app opens in standalone window
5. Go offline (DevTools > Network > Offline) -- verify page loads from cache
6. Navigate to uncached URL while offline -- verify offline page appears

**If any of these fail, DO NOT proceed to Phase 2.**

---

## Phase 2: Iterative Feature Addition (PWA Supplement)

*Each iteration adds one PWA feature. Follow the standard Phase 2 rules: one micro-goal, ≤100 lines, tests first, ask for results.*

### Recommended Iteration Order

| Iteration | Micro-Goal | Lines | Depends On |
|-----------|-----------|-------|------------|
| 1 | Create `offline.html` with branded design + auto-reconnect | ~60 | Phase 1 |
| 2 | Generate all icon sizes + favicon.ico + browserconfig.xml | ~30 (config) | Phase 1 |
| 3 | Add full meta tag set to all pages (create shared template) | ~15/page | Iteration 2 |
| 4 | Create `shared/sw-register.js` -- register SW from every page | ~50 | Phase 1 |
| 5 | Add CSP meta tag to all pages | ~3/page | Phase 1 |
| 6 | Add SRI hashes to all CDN scripts | ~1/script | Iteration 5 |
| 7 | Add update detection (updatefound + banner + skipWaiting) | ~80 | Iteration 4 |
| 8 | Add manifest shortcuts for quick actions | ~30 | Phase 1 |
| 9 | Add Background Sync for offline data queuing | ~80 | Iteration 4 |
| 10 | Add App Badge API for notification counts | ~40 | Iteration 4 |
| 11 | Add Web Share Target to receive shared data | ~50 | Phase 1 |
| 12 | Add Lighthouse CI workflow | ~40 | All above |

### Per-Iteration Security Review (from Protocol 2.5.6)
For every PWA iteration, also check:
- [ ] Does this iteration add new CDN scripts? If yes, generate SRI hashes.
- [ ] Does this iteration add new `connect-src` origins? If yes, update CSP.
- [ ] Does this iteration store new data? If yes, check PII exposure.
- [ ] Does this iteration add new pages? If yes, apply full meta tag template.

---

## Phase 3: Component Validation & Hardening (PWA Supplement)

*Add these PWA-specific test scenarios to the standard Phase 3 checklist.*

### PWA Happy Path Tests
```
☐ Install from Chrome desktop (address bar button)
☐ Install on Android (Add to Home Screen)
☐ Install on iOS (Share > Add to Home Screen)
☐ App opens in standalone mode (no browser chrome)
☐ Manifest shortcuts work from home screen long-press
☐ All pages load from cache when offline
☐ Offline page appears for uncached URLs
☐ Update banner appears when new version deployed
☐ "Update Now" reloads with new content
☐ Cross-tab state sync works (change data in tab A, see in tab B)
```

### PWA Edge Case Tests
```
☐ Navigate directly to sub-page URL (not via index.html) -- SW still registers
☐ Open app, go offline, navigate between cached pages -- no errors
☐ Open app, go offline, try to perform write action -- data queued
☐ Go back online after offline write -- data syncs
☐ Kill app while offline, reopen -- data persists
☐ Install app, clear browser cache -- app still works (from SW cache)
☐ Two tabs open, update one -- both tabs get update
☐ Very slow network (3G throttle) -- app still loads within 5 seconds
```

### PWA Security Tests (extends Protocol 2.6.5)
```
☐ CSP blocks inline script injection: open console, try document.write('<script>alert(1)</script>')
☐ CSP blocks unauthorized origins: try loading script from random CDN
☐ SRI blocks tampered CDN: modify a CDN URL slightly -- should fail to load
☐ No sensitive data in SW cache: inspect cache contents in DevTools
☐ No API keys/tokens visible in manifest or cached responses
☐ HTTPS enforced: try accessing via HTTP -- should redirect
```

### PWA Cross-Platform Tests
```
☐ Chrome on Android: install, offline, update flow
☐ Safari on iOS: add to home screen, limited SW support quirks
☐ Firefox on desktop: manifest parsing, no install prompt (expected)
☐ Edge on desktop: install, Chromium-based behavior
☐ Chrome on desktop: install, window controls, shortcuts
```

### Accessibility Tests (extend for every page)
```
☐ Every page has exactly one <main> landmark
☐ Heading hierarchy is sequential (h1 > h2 > h3, never skip levels)
☐ All form inputs have <label for="inputId"> associations
☐ All <select> elements have associated labels
☐ All <img> elements have alt attributes
☐ Color contrast ratio >= 4.5:1 for all text on white backgrounds
☐ Tab navigation reaches all interactive elements
☐ Focus is visible on all interactive elements
```

---

## Phase 4: Refactoring & Handoff (PWA Supplement)

*The protocol's refactoring principles are critical for PWA maintainability.*

### PWA-Specific Refactoring Targets
1. **Extract inline JS to separate files** (biggest impact for PWAs)
   - Enables minification
   - Enables proper CSP without `unsafe-inline`
   - Enables browser caching of JS separately from HTML
   - Keeps HTML under 100KB per page

2. **Create shared module pattern:**
```
shared/
  sw-register.js     # SW registration (all pages)
  app-state.js       # State management (all pages)
  navigation.js      # Nav component (all pages)
  calculations.js    # Business logic (specific pages)
  styles.css         # Shared CSS variables and base styles
```

3. **Centralize version number** (single source of truth):
   - Define `APP_VERSION` in ONE file (e.g., `shared/app-state.js`)
   - All pages import from there
   - SW references the same version

4. **Create page template** for consistency:
   - All meta tags
   - CSP header
   - Icon links
   - SW registration script
   - Shared CSS/JS imports
   - `<main>` landmark wrapping content

### Handoff Summary (PWA Additions)
Add to the standard handoff document:
```
PWA Configuration:
- Manifest: manifest.json (all fields documented)
- Service Worker: sw.js (cache version: vXX)
- Caching Strategy: [Network-first HTML, Cache-first assets]
- Offline Pages: [List of cached pages]
- Update Flow: [How users get updates]
- Icons: [Generated from icons/master-1024.png using Pillow/sharp]

How to Deploy a New Version:
1. Update APP_VERSION in shared/app-state.js
2. Bump CACHE_NAME version in sw.js
3. Push to main branch (auto-deploys via GitHub Pages)
4. Lighthouse CI runs automatically on push
```

---

## Phase 5: Production Hardening (PWA Supplement)

*For static PWAs on GitHub Pages, many Phase 5 items don't apply (Docker, nginx, K8s). Replace with PWA-specific production items.*

### PWA Production Checklist
```
☐ All icons generated (10 sizes + favicon.ico + browserconfig.xml)
☐ Manifest validated (JSON valid, no 404 references)
☐ SW registered on every page
☐ Offline page created and cached
☐ CSP meta tag on every page
☐ SRI hashes on all CDN scripts
☐ APP_VERSION consistent across all files
☐ CACHE_NAME bumped to match version
☐ Lighthouse CI passing (no failures, warnings acceptable)
☐ Tested on Chrome Android + Safari iOS + Desktop Chrome
☐ .gitignore excludes OS files (desktop.ini, .DS_Store)
☐ No dev/test files in production (remove utilities, test pages)
☐ Pre-deployment verification script passes (see below)
```

### Pre-Deployment Verification Script
```bash
#!/bin/bash
echo "=== PWA Pre-Deploy Check ==="

# 1. Manifest valid JSON
python3 -c "import json; json.load(open('manifest.json')); print('1. Manifest JSON: PASS')" 2>&1 || echo "1. Manifest JSON: FAIL"

# 2. All manifest-referenced files exist
python3 -c "
import json, os
m = json.load(open('manifest.json'))
missing = [i['src'] for i in m.get('icons',[]) if not os.path.exists(i['src'])]
missing += [s['src'] for s in m.get('screenshots',[]) if not os.path.exists(s['src'])]
print('2. Asset files:', 'PASS' if not missing else f'FAIL - missing: {missing}')
"

# 3. Favicon exists
[ -f icons/favicon.ico ] && echo "3. Favicon: PASS" || echo "3. Favicon: FAIL"

# 4. SW registered on all pages
MISSING_SW=$(grep -rL 'sw-register.js\|serviceWorker.register' *.html 2>/dev/null | grep -v test | grep -v create | grep -v set-capital)
[ -z "$MISSING_SW" ] && echo "4. SW registration: PASS" || echo "4. SW registration: FAIL - $MISSING_SW"

# 5. Version consistency
VERSIONS=$(grep -h 'APP_VERSION' *.html shared/*.js 2>/dev/null | grep -oP "'[^']+'" | sort -u)
VERSION_COUNT=$(echo "$VERSIONS" | wc -l)
[ "$VERSION_COUNT" -le 1 ] && echo "5. Version consistency: PASS ($VERSIONS)" || echo "5. Version consistency: FAIL - found: $VERSIONS"

# 6. CSP on all pages
MISSING_CSP=$(grep -rL 'Content-Security-Policy' *.html 2>/dev/null | grep -v test | grep -v create | grep -v set-capital)
[ -z "$MISSING_CSP" ] && echo "6. CSP headers: PASS" || echo "6. CSP headers: FAIL - $MISSING_CSP"

# 7. SRI on CDN scripts
CDN_COUNT=$(grep -rc 'cdnjs.cloudflare\|cdn.jsdelivr' *.html 2>/dev/null | awk -F: '{s+=$2}END{print s}')
SRI_COUNT=$(grep -rc 'integrity="sha' *.html 2>/dev/null | awk -F: '{s+=$2}END{print s}')
[ "$CDN_COUNT" = "$SRI_COUNT" ] && echo "7. SRI hashes: PASS ($SRI_COUNT/$CDN_COUNT)" || echo "7. SRI hashes: FAIL ($SRI_COUNT/$CDN_COUNT)"

# 8. Main landmark on all pages
MISSING_MAIN=$(grep -rL '<main' *.html 2>/dev/null | grep -v test | grep -v create | grep -v set-capital | grep -v splash | grep -v offline)
[ -z "$MISSING_MAIN" ] && echo "8. Main landmark: PASS" || echo "8. Main landmark: FAIL - $MISSING_MAIN"

echo "=== Check Complete ==="
```

---

## Quality Gates (PWA Additions)

*Add these to the standard Quality Gates (Protocol 2.9) checked at every phase.*

Before moving to the next phase, also verify:

```
☐ Installable? (Chrome shows install button in address bar)
☐ Works offline? (Disconnect network, all cached pages still load)
☐ No 404s? (All files referenced in manifest and HTML exist)
☐ Version consistent? (Same APP_VERSION on all pages)
☐ CSP present? (Every page has Content-Security-Policy meta tag)
☐ SRI present? (Every CDN script has integrity hash)
☐ Accessible? (<main> landmark, heading order, form labels, color contrast)
☐ Lighthouse clean? (No failures, warnings documented and accepted)
```

---

## Quick-Start File Structure

```
project/
  index.html              # Entry page (full meta tags + CSP + main landmark)
  offline.html            # Offline fallback (auto-reconnect + branded)
  pwa-test.html           # Health check dashboard (NOT cached in SW)
  manifest.json           # All required fields, validated, no 404 refs
  sw.js                   # Network-first HTML, cache-first assets, cleanup
  .gitignore              # desktop.ini, .DS_Store, Thumbs.db, node_modules
  icons/
    icon-16x16.png        # Favicon (browser tab)
    icon-32x32.png        # Favicon (browser tab)
    icon-72x72.png        # Android legacy
    icon-96x96.png        # Android + shortcuts
    icon-128x128.png      # Chrome Web Store
    icon-144x144.png      # MS tile + iOS
    icon-152x152.png      # iOS
    icon-192x192.png      # REQUIRED: Android install + Chrome
    icon-384x384.png      # Android splash
    icon-512x512.png      # REQUIRED: Android splash + install
    favicon.ico           # Multi-size ICO (16+32)
    browserconfig.xml     # Microsoft tile config
  shared/
    styles.css            # CSS variables + base styles
    sw-register.js        # SW registration + badge API + sync
  .github/
    workflows/
      lighthouse.yml      # Automated Lighthouse CI
```

---

## TBFS Lessons Learned -- What Went Wrong and When

| What Happened | Protocol Phase That Would Have Prevented It | Rule Violated |
|--------------|-------------------------------------------|---------------|
| 19 issues found in review | Phase 0 skipped | "Clarify BEFORE writing ANY code" |
| 368KB index.html | Phase 4 skipped | "Extract repeated code to functions" |
| Version 1.7.4 vs 1.7.11 | Quality Gate missed | "Copy-paste works immediately" (inconsistent state) |
| 17 commits to fix PWA issues | All phases after Phase 0 | "TINY STEPS ONLY" was not followed for PWA setup |
| Lighthouse CI failed twice | Phase 5 rushed | "Confirm tests still pass" before shipping CI |
| `desktop.ini` committed | Phase 0 (Environment) | `.gitignore` should be first file created |
| Dead code in SW (no-op sync) | Phase 3 (Validation) | "All functions tested?" quality gate |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Feb 2026 | Initial -- incorrectly treated protocol name as mnemonic acronym |
| 2.0 | Feb 2026 | Complete rewrite -- proper integration with NO SPILT MILK v2.2 phases |

---

*"Don't cry over spilt milk -- follow the protocol from Phase 0."*
