# Lessons Learnt Pipeline

Branch-scoped findings from Bugbot / review loops. Newest entries at the top.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop B round 5)

### LL-DELQ-017 — Early payoff inflated total_interest past the interest cap
- **Severity:** medium
- **Symptom:** Settlement called `applyExtraInterestAssessment` with the full live candidate while collection was clamped by `partialExtraInterest` / cap room, so `total_interest` could jump by the uncapped assessment.
- **Fix:** Delta-bump total only by `prevExtra + partialExtraInterest`; still stamp the full candidate on the row for audit.
- **Lesson:** Assessment display amount and total_interest delta must follow the same cap as collection.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop B round 4)

### LL-DELQ-015 — Installment stayed partial when interest cap was exhausted
- **Severity:** high
- **Symptom:** `entryCovered` used pre-payment `interestCapRemainingFor` after `paid_breakdown` already included this payment’s interest, so claimable interest looked non-zero and the row stayed `partial`.
- **Fix:** Compute claimable interest with `max(0, capRemaining - interestPaid)` for this payment.
- **Lesson:** Coverage checks must use post-payment cap room when dues are already net of this payment.

### LL-DELQ-016 — Term change/top-up used stale fee assessment at commit
- **Severity:** medium
- **Symptom:** Fees assessed once at flow start; accrual during reason/preview prompts was omitted from totals and stamps.
- **Fix:** Re-assess at commit; add delinquency interest delta into committed `total_interest`; stamp commit-time candidates.
- **Lesson:** Long adjustment prompts need a commit-time re-assess, same idea as payment-date re-assess.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop B round 3)

### LL-DELQ-013 — Standard top-up cancelled pending delinquency out of total_interest
- **Severity:** high
- **Symptom:** Pending `unpaidPartial.interest` is delinquency-only; subtracting it from `remainingInterestGross` then adding it back cancelled extras. Regen schedule was also understated by that amount.
- **Fix:** Subtract only scheduled unpaid interest on preserved partials from regen gross; keep delinquency additive in `recalculatedInterest = paid + unpaidPartial.interest + remainingInterest`.
- **Lesson:** Never subtract delinquency-only pending interest from period remaining — it is not part of that gross.

### LL-DELQ-014 — Early payoff skipped total_interest delta for new delinquency
- **Severity:** medium
- **Symptom:** Payoff wrote `extra_interest_assessed` manually + sync (cap only), so first-time delinquency at payoff never raised `total_interest` while `interest_paid` included it.
- **Fix:** Use `applyExtraInterestAssessment` on payoff settle so total bumps by the assessment delta.
- **Lesson:** Any path that first persists `extra_interest_assessed` must go through the delta helper (or equivalent).

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop B round 2)

### LL-DELQ-012 — Pending regen dropped delinquency fields (double-bump risk)
- **Severity:** high
- **Symptom:** Term-change/top-up stamped fees on a pending open row before `buildAdjustedSchedule`, but regenerated pending rows are new objects and lost those fields. `total_interest` still included the extras, so the next payment’s `applyExtraInterestAssessment` saw prior=0 and bumped the full amount again.
- **Fix:** Stamp fees onto preserved partials before regen; after regen, re-stamp onto the new open row without delta-bumping totals.
- **Lesson:** Anything folded into `total_interest` via unpaidPartial must remain on the post-regen open schedule row, or the next assessment will double-count.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop B round 1)

### LL-DELQ-010 — syncDelinquencyInterestTracking inflated total_interest
- **Severity:** high
- **Symptom:** Sync set `total_interest = original_period_interest + Σ extras`, double-counting after top-up/term-change where extras were already in `paid + unpaidPartial + remaining`.
- **Fix:** Sync only ensures period base + 2× cap. New `applyExtraInterestAssessment` bumps `total_interest` by assessment **delta** only on payment.
- **Lesson:** Never recompute total_interest as period+extras after adjustments; use delta applies or the paid+unpaid+remaining identity.

### LL-DELQ-011 — Term change/top-up persisted fees before confirm
- **Severity:** medium
- **Symptom:** Live delinquency fields were written onto the open schedule row before reason/preview confirms; cancel left assessments in memory.
- **Fix:** Pass candidates into `unpaidOnPartialEntry` only; persist `extra_*` / late onto the open row after confirm, before schedule regen.
- **Lesson:** Match payment-modal rule — assess for math early, persist only after operator confirm.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot round 4)

### LL-DELQ-009 — Term change left stale 2× interest cap base
- **Severity:** high
- **Symptom:** `changeRepaymentPeriod` updated `total_interest` but kept origination `original_period_interest` and only called `ensureMaxInterestAllowed` (2× stale base). Longer terms could schedule more interest than the collectible cap.
- **Fix:** Refresh `original_period_interest` to remaining + open unpaid interest; set `max_interest_allowed = max(2×period, totalInterest, interestAlreadyPaid)` (aligned with top-up).
- **Lesson:** Any adjustment that recalculates schedule interest must also refresh the period-interest cap base, not only `total_interest`.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot round 3)

### LL-DELQ-006 — Standard top-up dropped delinquency interest from totals
- **Severity:** high
- **Symptom:** Standard top-up subtracted `unpaidPartial.interest` from regen interest but set `total_interest = max(fullInterest, paid)` without adding delinquency back. Live extras were also not assessed before `unpaidOnPartialEntry`.
- **Fix:** Use `recalculatedInterest = paid + unpaidPartial.interest + remainingInterest`; live-assess fees before unpaid breakdown; `syncDelinquencyInterestTracking` after schedule regen.
- **Lesson:** Top-up and term-change must share the same interest identity; always live-assess before reading unpaid open-row components.

### LL-DELQ-007 — Early payoff omitted delinquency interest from revenue/tx details
- **Severity:** medium
- **Symptom:** `AppState.totalInterestEarned` and transaction `interestOwed` only included prorated `payoffData.interestOwed`, not `partialExtraInterest`.
- **Fix:** Add delinquency interest into `totalInterestEarned` and tx details (`delinquencyInterestPaid`, combined `interestOwed`).
- **Lesson:** Global revenue counters must track every interest component collected in a flow, not only the scheduled/prorated piece.

### LL-DELQ-008 — Statement used stale stored 1× interest cap
- **Severity:** medium
- **Symptom:** `buildLoanStatementModel` preferred finite `loan.max_interest_allowed` over `getMaxInterestAllowed`, understating claimable interest on legacy 1× loans.
- **Fix:** Always use `getMaxInterestAllowed(loan)` in the statement model (respects overpayment recalc via `interest_recalculated`).
- **Lesson:** Statement/PDF claimable interest must use the same cap helper as payment allocation.

---

## 2026-07-31 — `cursor/delinquency-monthly-interest-a923` (Bugbot round 2)

### LL-DELQ-004 — Early payoff could exceed interest cap
- **Severity:** high
- **Symptom:** Delinquency interest was clamped with `interestCapRemainingFor` before prorated `payoffData.interestOwed` was applied, then both were added to `interest_paid`, exceeding 2×.
- **Fix:** Reserve cap room for payoff interest first (`capAfterPayoffInterest`), clamp delinquency to the remainder, and set `interest_paid = min(maxAllowed, paid + payoffInterest + extraInterest)` once.
- **Lesson:** When multiple interest components settle in one flow, allocate the cap in order and write `interest_paid` once.

### LL-DELQ-005 — Top-up used lifetime interest as `original_period_interest`
- **Severity:** medium
- **Symptom:** Top-up set `original_period_interest = recalculatedInterest` (`max(fullInterest, paid)` or paid+remaining), so 2× cap was based on the wrong base and could inflate.
- **Fix:** Store period interest only (`fullInterest` / stockvel plan totalInterestRaw); set `max_interest_allowed = max(2×period, recalculatedInterest, paid)`.
- **Lesson:** `original_period_interest` is the income-table period figure for the current contract, never a lifetime paid+remaining total.

---

## 2026-07-31 — `cursor/delinquency-monthly-interest-a923` (Bugbot round 1)

### LL-DELQ-001 — Early payoff skipped live delinquency charges
- **Severity:** high
- **Symptom:** `processEarlyPayoff` only used `calculateExtraAdminDue` + persisted late penalty; multi-month late penalty, live assessments, and delinquency interest were omitted from payoff total and settlement.
- **Fix:** Call `assessOpenInstallmentFees`, include late + extra admin + claimable delinquency interest in `addOnFees`, persist `extra_interest_assessed` / late on settle (after confirm only).
- **Lesson:** Any fee assessed live at payment time must also be assessed on early payoff; keep payoff add-ons in lockstep with the payment modal fee path.

### LL-DELQ-002 — Pending `unpaidOnPartialEntry` double-counted scheduled interest
- **Severity:** high
- **Symptom:** Pending rows returned full `scheduled + extra` interest. Term-change/top-up already folds scheduled interest into `remainingInterest`, then added `unpaidPartial.interest` again.
- **Fix:** For `status === 'pending'`, return only unpaid **extra** (delinquency) interest; keep full unpaid interest for preserved `partial` rows.
- **Lesson:** Preserved vs regenerated schedule rows need different unpaid-component semantics; pending ≠ partial for adjustment math.

### LL-DELQ-003 — Preview used stale 1× interest cap
- **Severity:** medium
- **Symptom:** `getMaxInterestAllowed` returned a legacy stored 1× `max_interest_allowed`, so payment preview could under-allocate delinquency interest until confirm called `ensureMaxInterestAllowed`.
- **Fix:** `getMaxInterestAllowed` returns at least 2× original period interest unless `interest_recalculated` froze a lowered cap; `ensureMaxInterestAllowed` does not undo overpayment reductions.
- **Lesson:** Read paths (preview) must see the same collectible ceiling as confirm; never lift caps that overpayment recalc intentionally lowered.
