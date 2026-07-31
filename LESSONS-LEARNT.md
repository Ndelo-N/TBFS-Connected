# Lessons Learnt Pipeline

Branch-scoped findings from Bugbot / review loops. Newest entries at the top.

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
