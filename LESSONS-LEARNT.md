# Lessons Learnt Pipeline

Branch-scoped findings from Bugbot / review loops. Newest entries at the top.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop C round 12)

### LL-DELQ-038 — Early payoff double-charged scheduled interest with add-on
- **Severity:** high
- **Symptom:** After LL-DELQ-037, `claimableUnpaidScheduled` added the full open-row unpaid scheduled amount even when `interestOwed` already billed that scheduled interest inside `totalPayoff`.
- **Fix:** Add-on only the gap `max(0, unpaidScheduledOnOpen − interestOwed)` (then cap). Row `paid_breakdown` still settles the full unpaid scheduled amount.
- **Lesson:** Payoff add-ons for open-row scheduled interest must net against prorated `interestOwed` already in the base payoff.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop C round 11)

### LL-DELQ-037 — Early payoff skipped unpaid scheduled interest on open partial
- **Severity:** high
- **Symptom:** `calculateEarlyPayoff` sets `interestOwed = max(0, prorated − interest_paid)`. When delinquency already inside `interest_paid` exceeded prorated scheduled interest, `interestOwed` was 0 while the open partial still had unpaid scheduled interest — add-ons only collected delinquency, so cash collected understated while `paid_breakdown` could still credit the scheduled piece.
- **Fix:** Add claimable unpaid scheduled interest on the open row into payoff add-ons (after reserving prorated `interestOwed`, before delinquency), and include it in `interest_paid` / revenue.
- **Lesson:** Lifetime `interest_paid` that includes delinquency must not hide unpaid scheduled interest still sitting on the open installment at payoff.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop C round 10)

### LL-DELQ-035 — Term change/top-up restored full 2× over an overpayment freeze
- **Severity:** high
- **Symptom:** Adjustments wrote `max_interest_allowed = 2× period` while leaving `interest_recalculated` true, so `getMaxInterestAllowed` could treat the new store as a freeze base and/or effectively undo the lowered overpayment ceiling relative to the old contract intent.
- **Fix:** Clear `interest_recalculated` when term-change/top-up rebuilds period interest; set statutory 2× on the new period (overpayment benefit remains in lower outstanding principal/interest).
- **Lesson:** Rebuilding the contract period must reset the overpayment freeze flag; do not keep `interest_recalculated` while replacing `max_interest_allowed` with a fresh 2×.

### LL-DELQ-036 — Early payoff understated partial paid_breakdown.interest
- **Severity:** medium
- **Symptom:** Payoff set `paid_breakdown.interest = max(existing, scheduled + partialExtra)` which ignores delinquency already in `existing` above scheduled, so the row total could lag `loan.interest_paid`.
- **Fix:** `pb.interest = prevPaid + unpaidScheduled + partialExtraInterest`.
- **Lesson:** Settlement of a partial must accumulate on the existing paid interest, not replace it with scheduled+new-extra alone.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop C round 9)

### LL-DELQ-034 — Overpayment recalc reclassified paid scheduled as delinquency
- **Severity:** high
- **Symptom:** Recalc overwrote open-row `interest_payment` with a lower per-entry figure even on partials with `paid_breakdown.interest`. Helpers that treat `paid − interest_payment` as delinquency then reclassified already-collected scheduled interest as extras, skewing the 2× freeze/cap and waterfall.
- **Fix:** When propagating, `interest_payment = max(perEntry, paidTowardScheduled)` so scheduled interest already collected is never lowered beneath that floor.
- **Lesson:** Never reduce a row’s scheduled `interest_payment` below interest already applied to that scheduled floor while delinquency extras are tracked as `paid − scheduled`.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop C round 8)

### LL-DELQ-033 — Standard top-up fullInterest-only period base could zero cap
- **Severity:** high
- **Symptom:** Standard top-up set `original_period_interest = fullInterest` only. When `interest_paid` (esp. with delinquency) already exceeded that figure, `2×` fell below collected interest and waterfall headroom hit zero.
- **Fix:** `periodInterestBase = max(fullInterest, scheduledPaid + unpaidScheduledOnPartial + remainingInterest)`.
- **Lesson:** Same mid-loan rule as term-change/stockvel — income-table fullInterest is a floor preference, not a license to shrink below scheduled history.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop C round 7)

### LL-DELQ-032 — Term change remaining-only period base zeroed interest cap
- **Severity:** high
- **Symptom:** `changeRepaymentPeriod` set `original_period_interest = remainingInterest` only. Mid-loan, `interest_paid` could already exceed `2× remaining`, so `interestCapRemainingFor` became 0 and the waterfall stopped allocating interest/delinquency.
- **Fix:** Period base = scheduled interest paid (exclude delinquency) + unpaid scheduled on preserved partial + regen remaining; cap = 2× that. Same idea for stockvel top-up outstanding period base.
- **Lesson:** After mid-loan adjustments, the 2× base must cover scheduled interest already paid plus remaining schedule — remaining-only shrinks the collectible ceiling below history.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop C round 6)

### LL-DELQ-031 — Stored max_interest_allowed could exceed statutory 2×
- **Severity:** high
- **Symptom:** Term-change/top-up set `max_interest_allowed = max(2×period, total_interest, interest_paid)`. Delinquency-inflated totals made the store exceed 2×, and `getMaxInterestAllowed` returned any stored value above target on non-recalculated loans.
- **Fix:** Persist and read statutory `2× original_period_interest` for normal loans; only overpayment freezes may sit below 2× (still capped at 2× with unpaid extras).
- **Lesson:** Never lift the collectible ceiling above 2× period using `total_interest` that may include delinquency.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop C round 5)

### LL-DELQ-028 — Confirm claimableInTotal used cap without live extras
- **Severity:** high
- **Symptom:** `claimableInTotal` called `interestCapRemainingFor(loan)` before stamping, so on `interest_recalculated` loans the fold into `total_interest` omitted live unpaid extras that the post-stamp waterfall could still collect.
- **Fix:** Pass `openEntry` + live candidate into confirm-time `interestCapRemainingFor` (same as preview).
- **Lesson:** Any pre-waterfall claimable-total math must use the same live cap inputs as allocation.

### LL-DELQ-029 — Early payoff omitted live extras from max interest
- **Severity:** medium
- **Symptom:** Payoff clamped delinquency with `getMaxInterestAllowed(loan)` only, so recalculated loans with unpersisted live extras got zero/understated headroom.
- **Fix:** Pass open entry + live extra candidate into payoff `getMaxInterestAllowed`.
- **Lesson:** Payoff cap reads must match payment confirm/preview live assessment wiring.

### LL-DELQ-030 — Overpayment freeze included delinquency inside interest_paid
- **Severity:** medium
- **Symptom:** `scheduledMaxInterest = interest_paid + newInterestCalculation` treated delinquency collected in the same payment as scheduled, inflating the stored freeze.
- **Fix:** Subtract `paidScheduleExtraInterest` before adding recomputed scheduled remaining interest.
- **Lesson:** Scheduled-only freezes must exclude every delinquency component already inside `interest_paid`.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop C round 4)

### LL-DELQ-024 — Recalculated cap could exceed statutory 2× period
- **Severity:** high
- **Symptom:** `getMaxInterestAllowed` returned `freeze + unpaid extras` with no `min(2× period)` ceiling, so near-cap freezes plus delinquency could collect above the product 2× limit.
- **Fix:** `Math.min(2× original_period_interest, freeze + unpaidScheduleExtraInterest)`.
- **Lesson:** Overpayment freeze + delinquency headroom is still bounded by the statutory 2× period cap.

### LL-DELQ-025 — Statement total_interest used full assessed extras
- **Severity:** medium
- **Symptom:** `buildLoanStatementModel` used `original_period_interest + Σ extra_interest_assessed` (including live) for committed `total_interest`, overstating when cap-bound `extra_interest_in_total` is lower.
- **Fix:** Commit total from `in_total` (legacy: assessed); keep full/live assessed for dues and `interest_extra_assessed`; remaining still considers live then clamps to cap.
- **Lesson:** Statement committed totals follow `total_interest` / `in_total`; assessed-only figures are for dues/display.

### LL-DELQ-026 — Payment preview omitted live extras from recalculated cap
- **Severity:** medium
- **Symptom:** Preview called `interestCapRemainingFor(loan)` without the live candidate confirm stamps before allocate, under-allocating interest vs confirm on `interest_recalculated` loans.
- **Fix:** Pass `openEntry` + `openLiveExtraInterest` into `getMaxInterestAllowed` / preview cap remaining.
- **Lesson:** Preview must use the same live assessment inputs as confirm for cap headroom.

### LL-DELQ-027 — Delinquency month could exceed 30% when admin > cap
- **Severity:** medium
- **Symptom:** Full R60 admin was always billed; only interest was squeezed, so low principal months had `monthIncome > incomeCap`.
- **Fix:** Fit admin then late into the 30% cap, then interest; `monthIncome === incomeCap` (or less only if all zero).
- **Lesson:** The 30% basket is a hard ceiling for admin + late + interest, including when admin alone would exceed it.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop C round 3)

### LL-DELQ-023 — Full stamp after capped total bump blocked later total increases
- **Severity:** medium
- **Symptom:** Payment confirm capped the `total_interest` delta then stamped `extra_interest_assessed` to the full candidate. Later confirms saw `prevExtra === full` so `applyExtraInterestAssessment` delta was 0, while the waterfall could still collect more delinquency under the cap — `interest_paid` could exceed `total_interest`.
- **Fix:** Track `extra_interest_in_total` separately from the full row assessment; `applyExtraInterestAssessment(loan, entry, full, claimableInTotal)` can raise the total as headroom grows. Term-change/top-up set `in_total` when folding extras into committed totals.
- **Lesson:** Audit/dues assessment and the amount folded into `total_interest` are different fields when the interest cap binds.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop C round 2)

### LL-DELQ-021 — Payment confirmation bumped total_interest by uncapped assessment
- **Severity:** high
- **Symptom:** Confirm called `applyExtraInterestAssessment` with the full live candidate before the waterfall, so `total_interest` rose by the entire assessment even when `interestCapRemainingFor` could absorb less (early payoff already clamped this in LL-DELQ-017).
- **Fix:** Reserve unpaid scheduled interest from the cap, delta-bump `total_interest` only up to claimable extras, then stamp the full candidate on the row for dues/audit.
- **Lesson:** Every confirm path that persists delinquency interest must cap the `total_interest` delta the same way collection is capped.

### LL-DELQ-022 — Frozen overpayment cap blocked later delinquency accrual
- **Severity:** high
- **Symptom:** After `interest_recalculated`, `getMaxInterestAllowed` returned only the stored freeze. Baking unpaid extras into the store at recalc time still left later accrual without headroom.
- **Fix:** Store scheduled-only freeze in `max_interest_allowed`; `getMaxInterestAllowed` adds `unpaidScheduleExtraInterest` at read time when `interest_recalculated`.
- **Lesson:** A lowered overpayment freeze is for scheduled interest; live unpaid delinquency must remain additive on the read path.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop C round 1)

### LL-DELQ-019 — Overpayment recalc froze cap without unpaid delinquency room
- **Severity:** high
- **Symptom:** First-half overpayment set `max_interest_allowed = interest_paid + recomputed scheduled interest` and flagged `interest_recalculated`, so `getMaxInterestAllowed` froze that lowered cap with no headroom for unpaid `extra_interest_assessed` on open rows.
- **Fix:** Initially baked unpaid extras into the stored freeze; superseded by LL-DELQ-022 (scheduled freeze + read-time unpaid add) so later accrual also has headroom.
- **Lesson:** Any path that freezes `max_interest_allowed` via `interest_recalculated` must still allow unpaid delinquency — prefer read-time add over baking a snapshot into the store.

### LL-DELQ-020 — Term-change zero-interest fallback poisoned period base
- **Severity:** medium
- **Symptom:** When regen `remainingInterest` was 0, term change set `original_period_interest` from `oldTotalInterest` / `totalInterestCommit`, which can already include delinquency.
- **Fix:** Capture prior period via `getOriginalPeriodInterest` before overwrite; on zero regen interest, keep that prior base (never delinquency-inflated totals).
- **Lesson:** Fallbacks for `original_period_interest` must use a period-only source, never `total_interest` that may include extras.

---

## 2026-08-01 — `cursor/delinquency-monthly-interest-a923` (Bugbot loop B round 6)

### LL-DELQ-018 — Legacy sync poisoned original_period_interest from inflated total
- **Severity:** high
- **Symptom:** On loans missing `original_period_interest`, `applyExtraInterestAssessment` raised `total_interest` then sync backfilled period base from `getOriginalPeriodInterest` → `total_interest`, so delinquency became part of the 2× cap base.
- **Fix:** Freeze period base before the total bump (`total − existing extras`); `getOriginalPeriodInterest` legacy fallback also subtracts schedule extras.
- **Lesson:** Never derive `original_period_interest` from a total that may already include delinquency.

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
