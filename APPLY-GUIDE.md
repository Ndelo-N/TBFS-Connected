# TBFS-Connected — Security Remediation Apply Guide

This series addresses all 19 findings from `TBFS-Connected-Security-Review.docx`.
Ten patches, applied in order onto the current `main` (base commit `aebdedf`,
"Merge active-loan reliability sweep fixes"). Everything is standard `git`;
the commands are written for **PowerShell on Windows**, one statement per line.

> **How this was verified — read this first.** Every change was checked two
> ways: Node parses each file (`node --check`, and `tools/check-html-scripts.mjs`
> for the inline `<script>` blocks in every page), and a 22-test suite
> (`node --test`) locks the money arithmetic, the payment waterfall, the
> restore-path validation, and the crypto roundtrip. What was **not** possible
> here is a real browser: no clicking through the actual PWA, no IndexedDB/
> localStorage exercise, no live GitHub round-trip. So the syntax and unit
> layers are proven; **your smoke test (Section 3) is the acceptance gate.**
> Nothing here is destructive to your data — the patches only touch code — but
> take the backup in Section 0.1 before you start.

---

## Section 0 — One-time setup (NOT part of the patch series)

These are things a patch can't safely carry: history rewriting, un-tracking
files already committed, and secret rotation. Do them once.

### 0.1 — Back up first

Open the app, go to **Settings → Backup Data**, and save the JSON file
somewhere safe. If cloud backup is already configured, that copy is fine too.

### 0.2 — Apply the patches (see Section 2 for detail)

```powershell
cd C:\path\to\TBFS-Connected
git checkout main
git switch -c security-remediation
git am --3way "patches\0001-F-01-F-14-F-15-ignore-client-PII-deploy-allowlisted-.patch"
```

…and so on through `0010`. Section 2 lists each with its purpose and rollback.
(You can also apply the whole folder at once — see Section 2.1.)

### 0.3 — Purge client PII from git history (F-01)

Patch 1 stops **future** tracking of `Loans/` and removes the
`desktop.ini` files, but anything already committed stays in history until it
is rewritten. `git-filter-repo` is the supported tool.

```powershell
# From a folder ABOVE your repo — filter-repo prefers a fresh clone
git clone https://github.com/Ndelo-N/TBFS-Connected.git TBFS-Connected-clean
cd TBFS-Connected-clean
python -m pip install --user git-filter-repo
python -m git_filter_repo --invert-paths --path Loans/
```

Then re-point the clone at GitHub and force-push every branch (filter-repo
deliberately drops the remote):

```powershell
git remote add origin https://github.com/Ndelo-N/TBFS-Connected.git
git push origin --force --all
git push origin --force --tags
```

Verify the client folder is gone from **all** history:

```powershell
git log --all --full-history -- "Loans/"
```

That command should print **nothing**. After Pages redeploys, confirm a
previously exposed file 404s (substitute a real filename you know was there):

```powershell
curl.exe -I "https://ndelo-n.github.io/TBFS-Connected/Loans/somefile.pdf"
```

You want `HTTP/… 404`.

> **On the exposure that already happened.** While the repo was public with
> `Loans/` tracked, those files were world-readable, and search engines or
> archivers may have copied them. Rewriting history and going private stops
> further access but cannot un-publish what was already fetched. Whether that
> rises to a POPIA notification obligation is your call as the operator — flagging
> it so the decision is deliberate, not accidental.

### 0.4 — Un-track the Windows metadata files

These were committed before the ignore rule existed. Remove them from tracking
(they stay on your disk):

```powershell
git rm --cached "desktop.ini" ".github\desktop.ini" ".github\workflows\desktop.ini" "icons\desktop.ini"
git commit -m "Stop tracking desktop.ini (now ignored)"
```

(If any path reports "did not match any files", it's already gone — skip it.)

### 0.5 — Rotate the GitHub backup token (F-05)

The old Personal Access Token was stored only `btoa()`-obfuscated in the
browser and, on the public repo, was recoverable. Treat it as compromised:

1. GitHub → **Settings → Developer settings → Personal access tokens** →
   revoke the old token.
2. Create a **fine-grained** token scoped to **only** the
   `TBFS-Data-Backup` repository, with **Contents: Read and write** and
   nothing else.
3. In the app: **Settings → Cloud Backup**, paste the new token, and set a
   **backup passphrase** (this now encrypts the token at rest with AES-256
   and signs your backups — see the passphrase note in Section 3).

---

## Section 1 — What each patch fixes

| # | Patch | Findings |
|---|-------|----------|
| 1 | ignore PII, allowlisted deploy | F-01, F-14, F-15 |
| 2 | sanitize module + hardened state manager | F-04, F-06, F-08, F-09 |
| 3 | canonical `RATES` + shared payment waterfall (engine) | F-02, F-07, F-16, F-17 |
| 4 | index.html → display-only dashboard | F-02, F-04, F-05, F-17, F-18 |
| 5 | active-loans: payment modal + waterfall + integrity | F-13, F-02, F-04, F-06, F-07, F-09, F-17 |
| 6 | calculator: collision-free IDs, resolved dates | F-09, F-04, F-06, F-07, F-17 |
| 7 | stockvel: cash/liability integrity + bugfixes | F-06, F-04, F-09 |
| 8 | one CloudBackup: encrypted token, signed backups | F-05, F-08, F-12, F-03 |
| 9 | self-host libraries, tighten CSP | F-10 |
| 10 | test suite + CI, doc correction | F-11, F-19, F-17 |
| 11 | end-to-end review fixups | E2E-1…6 (see review doc) |

A few findings are deliberately **partly** addressed and finished in Section 0
(they need history/secret work a patch can't do): **F-01** (history purge, 0.3)
and **F-05** (token rotation, 0.5). **F-03** (client-side trust model) is
mitigated — backups are now signed and verified, and the token is encrypted —
but a purely client-side app on shared storage can't reach server-grade
guarantees; treat the mutual-bank build-out as where that finding is truly
closed.

---

## Section 2 — Applying, verifying, rolling back

### 2.1 — Apply all at once

```powershell
cd C:\path\to\TBFS-Connected
git checkout main
git switch -c security-remediation
git am --3way patches\*.patch
```

If `git am` stops on a conflict, resolve the file, `git add` it, then
`git am --continue`. To abandon a half-applied series cleanly:

```powershell
git am --abort
```

### 2.2 — Apply one at a time (recommended for a first pass)

Run each in order. After each, run the verify block; if anything looks wrong,
run the rollback and stop.

```powershell
git am --3way "patches\0001-F-01-F-14-F-15-ignore-client-PII-deploy-allowlisted-.patch"
git am --3way "patches\0002-F-04-F-06-F-08-F-09-sanitize-module-hardened-state-m.patch"
git am --3way "patches\0003-F-02-F-07-F-16-F-17-canonical-RATES-shared-payment-w.patch"
git am --3way "patches\0004-F-02-F-04-F-05-F-17-F-18-index.html-becomes-a-displa.patch"
git am --3way "patches\0005-F-13-F-02-F-04-F-06-F-07-F-09-F-17-active-loans-paym.patch"
git am --3way "patches\0006-F-09-F-04-F-06-F-07-F-17-dates-calculator-collision-.patch"
git am --3way "patches\0007-F-06-F-04-F-09-bugfixes-stockvel-cash-and-liability-.patch"
git am --3way "patches\0008-F-05-F-08-F-12-F-03-mitigations-one-CloudBackup-encr.patch"
git am --3way "patches\0009-F-10-self-host-jsPDF-SheetJS-and-Chart.js-tighten-CS.patch"
git am --3way "patches\0010-F-11-F-19-F-17-test-suite-CI-correct-the-9-12-doc-co.patch"
```

### 2.3 — Verify (after each patch, and again at the end)

You'll need Node.js (v20+). From the repo root:

```powershell
node tools\check-html-scripts.mjs
node --test
```

`check-html-scripts` should end with **"All inline scripts parse cleanly."**
`node --test` should report **`# fail 0`** (the tests exist from patch 10
onward; before that, just run the syntax gate).

Build the deployable shell locally to confirm the allowlist works (needs a
bash shell — Git Bash is fine; skip if you don't have one, the CI does it too):

```powershell
bash tools/build-dist.sh
```

### 2.4 — Rollback

Undo the most recently applied patch (before pushing):

```powershell
git reset --hard HEAD~1
```

Or throw away the whole attempt and go back to `main`:

```powershell
git checkout main
git branch -D security-remediation
```

### 2.5 — Ship it

When the smoke test (Section 3) passes:

```powershell
git checkout main
git merge --ff-only security-remediation
git push origin main
```

The deploy workflow rebuilds `dist/` from the allowlist and publishes it.
The service-worker cache name bumped to `v43`, so clients pick up the new
shell on next load (the in-app update banner will offer it).

---

## Section 3 — Smoke test (your acceptance gate)

Do this in the browser after deploying, ideally on a phone since that's the
real target. Load the app **once online** so the new service worker installs.

**Passphrase note.** Cloud backup now asks for a passphrase you set in
Section 0.5. You enter it **once per browser session** to unlock backup; while
locked, auto-backup quietly waits and a small "🔒 Cloud backup locked" chip
appears. There is **no passphrase recovery** — if you forget it, remove the
token in Settings and set up again with a fresh PAT. That's the cost of the
token being properly encrypted rather than obfuscated.

Walk through:

- [ ] **Dashboard** shows sensible capital, deployed, and profit figures (not a
      surprise R100,000 — the old hardcoded reset is gone). The "lendable"
      warning accounts for member funds held.
- [ ] **Record a payment** (Active Loans → a loan → Pay): the modal opens, the
      allocation preview updates as you type, and confirming updates the loan.
- [ ] **Partial payment**: pay *less* than the monthly amount — the installment
      shows as partial, not fully paid, and the remaining dues are correct.
- [ ] **Overpayment**: pay *more* — the extra goes to principal (never past the
      interest cap), and the schedule reflects it.
- [ ] **Create a loan** (Calculator → Accept): a new loan appears with a unique
      ID even if you've deleted loans before.
- [ ] **Stockvel receipt**: record a contribution — capital rises; record a
      bonus/contribution payout — capital falls and is blocked if insufficient.
- [ ] **Backup round-trip**: unlock with your passphrase, "Backup Now", then
      confirm `latest.json` and a `snapshots/…` file appear in the
      `TBFS-Data-Backup` repo.
- [ ] **Restore rejects garbage**: try restoring a truncated/edited JSON file —
      it should refuse with a clear message, not silently wipe data.
- [ ] **Offline**: turn off the network and reload — the app still loads and
      pages render (libraries are now local, so this works without a warm CDN
      cache).

If every box holds, merge and push.

---

## Section 4 — Assumptions worth confirming

Three places where the code had two plausible readings and this series picked
one — each is easy to change if your intent differs:

1. **12% standard-loan initiation fee is canonical.** The business-rules doc
   said "9% / × 0.09" in three spots, but the worked example and the code bill
   12% (R1,200 on R10,000). The series treats 9% as the documentation typo and
   corrected the doc to 12%. If 9% was ever the real intent, change
   `INITIATION_FEE_RATE` in `shared/calculations.js` (one line — the whole app
   and the tests read from there) and revert the doc note.

2. **Stockvel receipts move capital.** A "contribution" now increases
   `capital` and the member's balance (and raises `memberFundsHeld`, the money
   you hold *for* members, which the dashboard subtracts to show lendable
   funds). Payouts decrease capital. The old manual "loan_payment" receipt
   fabricated a 10% bonus and moved no cash — that fabricated liability was
   removed; the real bonus rule still runs when you record the payment in
   Active Loans. If your bookkeeping treats stockvel contributions as sitting
   *outside* lending capital, the receipt handler in `stockvel.html` is where
   to adjust.

3. **`clients.html` and `reports.html` were left unmodified on purpose.** The
   review flagged output-escaping across pages; on inspection, `clients.html`
   already escapes its one rendered user field inline, and `reports.html`
   renders only month labels and currency numbers. Rather than add
   change-for-change's-sake, they were verified clean and left alone.

---

## Section 5 — Patch 0011: post-review fixups

After the series was assembled, a full end-to-end review of the patched tree
(automated integrity audit + deep reads of every never-reviewed region) found
six items — four introduced by the remediation itself, two pre-existing. Patch
`0011` fixes all six; the accompanying **`POST-REMEDIATION-E2E-REVIEW.md`** has
the complete findings, the verified-clean register, and the audit method.

Apply it exactly like the others, after `0010` (a wildcard `git am --3way
patches\*.patch` already includes it). Headline item: without `0011`, the
Reports page's monthly revenue chart renders **zeros** — a regression from the
transaction-field unification.
