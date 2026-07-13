# TBFS-Connected — Post-Remediation End-to-End Code Review

**Scope:** the complete patched tree at the tip of `security-remediation`
(base `aebdedf` + patches 0001–0010), reviewed as a whole — including every
region the remediation never touched. The review treats the patch series
itself as untrusted input: its explicit goal was to find integration seams
*between* patches and regressions the remediation introduced, alongside
anything pre-existing that the original 19-finding review did not cover.

**Outcome in one line:** ten findings — four introduced by the remediation,
two pre-existing functional defects, four informational — of which the six
fixable ones are corrected in **patch `0011`** (shipped in the updated zip),
re-verified end-to-end. The headline: without `0011`, the Reports page's
monthly revenue chart renders **zeros**, a regression from the
transaction-field unification.

---

## 1. Method — what was actually executed vs. read

Static review alone was not trusted. The review ran three layers:

**Layer 1 — automated integrity audit** (a purpose-built Node script), across
all ten pages:

| Check | Result |
|---|---|
| Every inline `onclick/onchange/oninput` handler resolves to a defined function (incl. index's redirect stubs) | ✅ 0 dangling |
| Every literal `getElementById('…')` target exists in that page's markup | ✅ 0 missing (after fixing E2E-5) |
| Duplicate `id=` attributes within a page | ✅ 0 |
| `esc()` used ⇒ `shared/sanitize.js` loaded on that page | ✅ consistent |
| Cross-file contract: every `Calculations.*` / `AppStateManager.*` / `CloudBackup.*` member any page calls exists in the shared module | ✅ 0 mismatches |
| Code references to removed legacy fields (`transactionHistory`, `deployedCapital`, `totalProfit`) | ❌ 4 real hits → **E2E-1/E2E-3** (fixed in 0011); the remainder are element IDs / local variables that merely share the old names |

**Layer 2 — configuration and shell audit:**

| Check | Result |
|---|---|
| Per-page CSP `connect-src` includes `https://api.github.com` everywhere `cloud-backup.js` loads (auto-backup now fires from every page) | ✅ all eight app pages |
| Shared script load order (`sanitize → app-state → calculations → cloud-backup → navigation`, `sw-register` last) | ✅ all pages; `loan-income-calculator` intentionally state-free (navigation only) |
| `sw.js`: strategy (network-first documents with `offline.html` fallback; cache-first assets), precache completeness, every precache path exists on disk, cache `v43` | ✅ |
| `build-dist.sh` allowlist excludes docs, `Loans/`, and dev/test pages from the deployable | ✅ (verified on a built `dist/`) |
| No `cdnjs`/`jsdelivr` reference anywhere in shipped HTML or `sw.js` | ✅ |

**Layer 3 — deep reads of the never-reviewed regions:** the `adjustLoan`
dispatcher (add-amount / reduce paths) in `active-loans.html`;
`buildAdjustedSchedule` and the adjustment snapshot/log machinery; calculator's
`acceptLoan` client find-or-create and the Web-Share-Target autofill; all of
`clients.html`'s mutation surface; `reports.html`'s field diet and chart data
builders; settings' grace-period setter; `sw.js` in full.

**Final gate, re-run after `0011`:** all **11 patches apply cleanly in strict
order onto a fresh clone** of the stated base (`git am --3way`, 11 commits),
**22/22 unit tests pass**, every inline script parses, and the dist build
succeeds — on the patched clone, not just the working tree.

**Honesty note (unchanged from the apply guide):** no browser was available
here. Syntax, unit arithmetic, crypto roundtrips, and static integrity are
proven; DOM behaviour, service-worker lifecycle, and the live GitHub
round-trip remain yours to confirm via the smoke checklist. Nothing found in
this review changes that checklist except one addition (§5).

---

## 2. Findings introduced by the remediation (mine — owned and fixed)

### E2E-1 · HIGH · Reports revenue chart reads a field the normalizer deletes
`reports.html:538` — the monthly Interest/Fees chart iterated
`AppState.transactionHistory`. Patch 0002's load-time normalizer merges that
legacy array into the canonical `transactions` and **deletes** it, so the
chart's source was always empty: revenue-by-month rendered zeros. Root cause:
my reader-migration sweep (patch 0005 pass 2) covered `active-loans.html` and
missed this page. The payment objects — both merged-legacy and new — carry the
exact `details` fields the chart reads (`paymentDate`, `interestPaid`,
`adminFeePaid`, `initiationFeePaid`), so the fix is the field name.
**Fixed in 0011.**

### E2E-2 · MEDIUM · Dashboard and Reports disagree on what "profit" is
Patch 0004's dashboard computes Total Profit as interest + fees +
**penalties** (`totalPenaltiesEarned`, introduced in 0002/0005). Reports'
Total Revenue (`reports.html:471, 488`) summed only interest + fees. After the
first collected late penalty, the two headline figures diverge. Penalty income
is income; Reports now includes it. (Its detail cards remain "Interest
Earned" / "Fees Earned", so the total can exceed their sum — deliberate and
labelled honestly.) **Fixed in 0011.**

### E2E-3 · LOW · Settings resurrected a legacy field on every save
`settings.html:688` — `AppState.deployedCapital = AppState.deployed; //
Ensure compatibility`. Post-normalizer that shim is a zombie: the write
survives into the saved blob, and the next load deletes it again. Values were
always equal (no corruption), but it polluted saved/backed-up JSON and would
confuse a raw diff. Removed, along with the dead fallback read at `:536`.
**Fixed in 0011.**

### E2E-4 · LOW · One mutation still hand-trusted the deployed counter
The add-amount branch of `adjustLoan` set `AppState.deployed += amount`
directly. The value is arithmetically correct (the loan's
`remaining_principal` rises by the same amount, so the derived recalc yields
the identical number), but it was the last site violating the series'
invariant that *deployed is derived, never hand-kept*. Now calls
`recalculateDerivedTotals` like every other mutation. **Fixed in 0011.**

---

## 3. Pre-existing defects found by this review

### E2E-5 · MEDIUM · Shared-link loan amounts were silently dropped
`calculator.html:421` — the Web-Share-Target / URL autofill wrote the `amount`
parameter into `#loanAmount`, an element that does not exist (the real input
is `#principal`). A null-guard prevented a crash, which is exactly why this
survived: the amount from a shared link simply vanished. Retargeted to
`#principal`. **Fixed in 0011.**

### E2E-6 · LOW (F-17 residual) · Client PII in the console on two pages
`clients.html` logged six lines — including `:714`, which printed the full
calculator hand-off URL params (client **name and account number**) — and
`reports.html` logged two lifecycle lines. Both pages now carry the same
`DEBUG`/`dbg()` gate as the rest of the app, completing F-17 across every
page and shared module. **Fixed in 0011.**

---

## 4. Informational findings (no change made — deliberate)

**E2E-7 · `nextAccountNumber` has no consumer.** The schema field (added for
restore-compatibility in 0002) is never read: account numbers are user-entered
in Stockvel or arrive via the calculator hand-off, and `acceptLoan` does
find-or-create by `account_number`. Harmless; keep for old-backup tolerance.
If you ever want auto-generated account numbers, the reservation pattern from
`getNextLoanId` is the template.

**E2E-8 · Grace-period bounds differ by design layer.** The settings input
caps at 30 days; `validate()` tolerates 0–60 on restore. The validator being a
superset is intentional restore tolerance, not a conflict.

**E2E-9 · A dead icon branch.** The dashboard's transaction-icon map handles a
`client_status` type, but nothing emits it — client status changes are not
written to the global log. Cosmetic; if you want status changes in the
timeline, `updateClientStatus` (`clients.html:481`) is the one place to add a
push.

**E2E-10 · The backup conflict flag is recorded but not yet surfaced.** When
auto-backup skips because the cloud copy is newer (multi-device guard),
`CloudBackup` sets `tbfsBackupConflict` in localStorage and skips silently;
manual "Backup Now" *does* surface it via a confirm. Recommended later
enhancement: render the flag in Settings' auto-backup status line. Deferred —
it is a UI addition, not a defect.

---

## 5. Verified-clean register (what an "end-to-end" pass positively confirms)

Beyond the table in §1: `increaseLoanAmount` checks capital sufficiency before
disbursing and regenerates the schedule via `buildAdjustedSchedule`; payments
and early payoffs return cash to capital at exactly one site each; **no
client-delete path exists** (so no orphaned-loan hazard); `clients.html`'s one
rendered user field was already escaped inline (with separate attribute and
URL encoding — left untouched rather than churned); `reports.html` and
`loan-income-calculator.html` render only computed labels and currency; the
adjustment log writes loan-locally *and* to the canonical global log with the
id-dedupe guard intact; and the redirect stubs on the display-only dashboard
cover every removed entry point.

**Smoke-checklist addition** (append to Section 3 of the apply guide):

- [ ] **Reports** → the monthly revenue chart shows non-zero bars for months
      with recorded payments, and Total Revenue equals the dashboard's Total
      Profit.

---

## 6. Residual backlog (unchanged scope, restated for one view)

Carried consciously, not forgotten: the 15 remaining `prompt()`s (loan
adjust/payoff/reminder flows in `active-loans`, client edits in `clients`,
account edit in `stockvel`) are numeric/confirm inputs — UX modernisation, not
security; **F-03**'s full closure (server-side trust boundary) belongs to the
mutual-bank build-out; **F-18**'s remaining slice is decomposing
`active-loans.html` (4.1k lines) into modules — mechanical now that the engine
is shared; and the Section-0 one-time items (history purge, PAT rotation)
remain yours to execute.

## 7. Assumptions surfaced in this review

1. **Reports' chart shape-compatibility** — the fix assumes merged-legacy
   payment records carry `details.paymentDate/interestPaid/…` like new ones;
   verified true for records written by any post-v1.7 build. Pre-that-era
   records (if any survive in your history) would simply not plot — they never
   plotted before either.
2. **Penalty income counts as revenue** (E2E-2). If your bookkeeping treats
   penalties as a separate ledger line outside "revenue", remove
   `totalPenaltiesEarned` from the two sums in `reports.html` and the one in
   `index.html` — three lines, all commented.
3. **Share-target `amount` maps to principal** (E2E-5) — the manifest's share
   contract offers no other candidate field, and the null-guard's history
   suggests the id simply drifted during the multi-page split.
