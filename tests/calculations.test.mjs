/**
 * Calculation engine tests (F-11 / F-19).
 * Run: node --test   (Node 20+, no dependencies)
 *
 * These lock the canonical business arithmetic so a future refactor of
 * shared/calculations.js cannot silently change what a borrower is billed.
 * The R10,000 / 10-month standard loan is the reference case documented in
 * STANDARD-LOAN-10K-10M-BREAKDOWN.md.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const C = require('../shared/calculations.js');
const Sanitize = require('../shared/sanitize.js');

test('canonical rates are exactly as documented', () => {
    assert.equal(C.RATES.INCOME_TABLE_RATE, 0.30);
    assert.equal(C.RATES.INITIATION_FEE_RATE, 0.12); // 12% — matches the worked example (R1,200 on R10,000)
    assert.equal(C.RATES.ADMIN_FEE_STANDARD, 60);
    assert.equal(C.RATES.STOCKVEL_MIN_MONTHLY_RATE, 0.10);
    assert.equal(C.RATES.LATE_PENALTY_DAILY_RATE, 0.001);
    assert.equal(C.RATES.LATE_PENALTY_MAX_DAYS, 7);
});

test('interest period: ceil(term/2), floor of 3, capped at term', () => {
    assert.equal(C.calculateInterestPeriod(10).interestMonths, 5);
    assert.equal(C.calculateInterestPeriod(2).interestMonths, 2);  // min(3,2) = 2
    assert.equal(C.calculateInterestPeriod(4).interestMonths, 3);  // max(ceil(2),3) = 3
    assert.equal(C.calculateInterestPeriod(12).interestMonths, 6);
});

test('reference standard loan: R10,000 over 10 months', () => {
    const r = C.calculateStandardLoan(10000, 10);
    assert.equal(r.interestMonths, 5);
    assert.equal(Math.round(r.totalInterest), 11100);       // 2820+2520+2220+1920+1620
    assert.equal(Math.round(r.totalInitiationFee), 1200);   // 10000 × 12%
    assert.equal(Math.round(r.totalAdminFees), 600);        // 60 × 10
    assert.equal(Math.round(r.totalCost), 22900);           // 10000 + 11100 + 1200 + 600
    assert.equal(Math.round(r.monthlyPayment), 2290);       // 22900 / 10
    // Cap = calculated interest (may exceed principal); not min(interest, principal)
    assert.equal(r.maxInterestAllowed, r.totalInterest);
    assert.ok(r.maxInterestAllowed > 10000);
});

test('6-month standard loan uses 3-month interest period (income table)', () => {
    const r = C.calculateStandardLoan(5000, 6);
    assert.equal(r.interestMonths, 3);
    assert.equal(r.maxInterestAllowed, r.totalInterest);
    // Full-term 30% roll would overstate; period total must be below that path
    let fullTermInterest = 0;
    let bal = 5000;
    const principalPerMonth = 5000 / 6;
    const monthlyInit = (5000 * 0.12) / 6;
    for (let m = 1; m <= 6; m++) {
        fullTermInterest += bal * 0.30 - monthlyInit - 60;
        bal -= principalPerMonth;
    }
    assert.ok(r.totalInterest < fullTermInterest);
});

test('payment waterfall: production order, no overpay of a component', () => {
    const entry = { initiation_fee: 120, admin_fee: 60, interest_payment: 1110, principal_payment: 1000 };
    const full = C.allocateScheduledPayment(2290, {
        entry, latePenaltyDue: 0, interestCapRemaining: 1110, remainingPrincipal: 10000
    });
    assert.deepEqual(
        [full.initiationPaid, full.adminPaid, full.penaltyPaid, full.interestPaid, full.principalPaid, full.unallocated],
        [120, 60, 0, 1110, 1000, 0]
    );
});

test('payment waterfall: a partial payment fills earlier buckets first', () => {
    const entry = { initiation_fee: 120, admin_fee: 60, interest_payment: 1110, principal_payment: 1000 };
    const part = C.allocateScheduledPayment(500, { entry });
    assert.equal(part.initiationPaid, 120);
    assert.equal(part.adminPaid, 60);
    assert.equal(part.interestPaid, 320);   // remainder after fees
    assert.equal(part.principalPaid, 0);
});

test('payment waterfall: late penalty is taken before interest', () => {
    const entry = { initiation_fee: 0, admin_fee: 0, interest_payment: 1000, principal_payment: 500 };
    const a = C.allocateScheduledPayment(300, { entry, latePenaltyDue: 50 });
    assert.equal(a.penaltyPaid, 50);
    assert.equal(a.interestPaid, 250);
    assert.equal(a.principalPaid, 0);
});

test('payment waterfall: interest cap is never exceeded', () => {
    const entry = { initiation_fee: 0, admin_fee: 0, interest_payment: 1110, principal_payment: 1000 };
    const capped = C.allocateScheduledPayment(2000, {
        entry, interestCapRemaining: 100, remainingPrincipal: 1000
    });
    assert.equal(capped.interestPaid, 100);   // clamped by the cap, not the entry's 1110
    assert.equal(capped.principalPaid, 1000);
    assert.ok(capped.unallocated > 0);
});

test('late penalty: 0.1%/day, capped at 7 days', () => {
    assert.equal(C.calculateLatePenalty(30, 10000), 70);   // min(30,7) × 0.001 × 10000
    assert.equal(C.calculateLatePenalty(3, 10000), 30);
    assert.equal(C.calculateLatePenalty(0, 10000), 0);
});

test('schedule start year cannot precede disbursement', () => {
    // December loan, January start → next calendar year
    assert.equal(C.resolveScheduleStartYear(new Date(2026, 11, 15), 0), 2027);
    // October loan, November start → same year
    assert.equal(C.resolveScheduleStartYear(new Date(2026, 9, 15), 10), 2026);
});

test('payment due date rolls across the year boundary', () => {
    // start Dec 2026 (month 11), 2nd payment → Jan 2027, last day
    const due = C.calculateDueDate(2026, 11, 2);
    assert.equal(due.getFullYear(), 2027);
    assert.equal(due.getMonth(), 0);
    assert.equal(due.getDate(), 31);
});

test('membership end date is one year on, with no timezone drift', () => {
    // The bug this guards: toISOString() in SAST (UTC+2) shifted the date back a day.
    assert.equal(C.calculateMembershipEndDate('2026-03-01'), '2027-03-01');
    assert.equal(C.calculateMembershipEndDate('2026-01-31'), '2027-01-31');
});

test('stockvel tiered interest is internally self-consistent', () => {
    // The engine's own tier pieces must sum to its reported tier total.
    // (STOCKVEL-30K-6M-CALCULATION.md is internally inconsistent — its stated
    //  monthly figure disagrees with its own tier math — so the CODE is the
    //  reference here, not that document. See the note in BUSINESS-RULES.md.)
    const savings = 10500;
    const balance = 30000;
    const t = C.calculateTieredStockvelInterest(balance, savings);
    assert.ok(t.tiers1to4Interest >= 0);
    // Recompute the tiers independently from RATES and compare.
    const B = C.RATES.TIER_BOUNDS, R = C.RATES.TIER_RATES;
    const bounds = [
        [0, savings * B.T1, R.T1],
        [savings * B.T1, savings * B.T2, R.T2],
        [savings * B.T2, savings * B.T3, R.T3],
        [savings * B.T3, savings * B.T4, R.T4],
    ];
    let expected = 0;
    for (const [lo, hi, rate] of bounds) {
        const amt = Math.max(0, Math.min(balance, hi) - lo);
        expected += amt * rate;
    }
    assert.ok(Math.abs(t.tiers1to4Interest - expected) < 0.01,
        `tier total ${t.tiers1to4Interest} vs recomputed ${expected}`);
});

test('sanitize escapes every HTML-significant character', () => {
    assert.equal(Sanitize.esc(`<script>&"'`), '&lt;script&gt;&amp;&quot;&#39;');
    assert.equal(Sanitize.esc(null), '');
    assert.equal(Sanitize.esc(undefined), '');
    assert.equal(Sanitize.esc(1234), '1234');
});
