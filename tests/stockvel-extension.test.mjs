/**
 * Regression: stockvel top-up then 1→2 month extension near month-end.
 *
 * Scenario (Lindelo):
 *   contributions R5,000 → borrow R1,500 (1m) → top-up +R2,000 (=R3,500)
 *   → extend unpaid 1-month loan to 2 months.
 *
 * Bug was dual pricing engines:
 *   - top-up / business rules: 10% of outstanding balance
 *   - term change / old calculator: 10% of (principal / term) + principal scaling
 * which undercharged month-1 interest on extension (R350 → R205).
 *
 * Run: node --test tests/stockvel-extension.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const C = require('../shared/calculations.js');

const CONTRIBUTIONS = 5000;
const INITIAL_PRINCIPAL = 1500;
const TOP_UP = 2000;
const TOTAL_PRINCIPAL = INITIAL_PRINCIPAL + TOP_UP; // 3500

test('priceStockvelMonth uses balance × 10% minimum (not principal/term)', () => {
    const priced = C.priceStockvelMonth(TOTAL_PRINCIPAL, CONTRIBUTIONS);
    // Tiered on R3500 with R5000 savings: tier1 1500@3% + tier2 2000@8% = 205
    assert.equal(C.round(priced.tieredInterest), 205);
    assert.equal(C.round(priced.minimumInterest), 350); // 3500 × 10%
    assert.equal(priced.usedMinimum, true);
    assert.equal(C.round(priced.interest), 350);
    // When minimum applies, admin is standard R60
    assert.equal(priced.adminFee, C.RATES.ADMIN_FEE_STANDARD);
});

test('1-month stockvel at R1500 / R5000 contributions charges R150 min', () => {
    const plan = C.buildStockvelRepaymentPlan({
        remainingPrincipal: INITIAL_PRINCIPAL,
        remainingMonths: 1,
        remainingInitiationFee: 0,
        startingContributions: CONTRIBUTIONS,
        monthlyContribution: 0
    });
    assert.equal(C.round(plan.totalInterestRaw), 150);
    assert.equal(plan.breakdown.length, 1);
    assert.equal(C.round(plan.breakdown[0].interest_payment), 150);
});

test('top-up to R3500 for remaining 1 month keeps balance × 10% interest', () => {
    const plan = C.buildStockvelRepaymentPlan({
        remainingPrincipal: TOTAL_PRINCIPAL,
        remainingMonths: 1,
        remainingInitiationFee: 0,
        startingContributions: CONTRIBUTIONS,
        monthlyContribution: 0
    });
    assert.equal(C.round(plan.totalInterestRaw), 350);
    assert.equal(C.round(plan.breakdown[0].admin_fee), 60);
});

test('extend unpaid R3500 loan from 1→2 months does not drop month-1 below R350', () => {
    // Near month-end unpaid extension: preserveThrough=0, regenerate 2 months
    // on full outstanding R3500.
    const plan = C.buildStockvelRepaymentPlan({
        remainingPrincipal: TOTAL_PRINCIPAL,
        remainingMonths: 2,
        remainingInitiationFee: 0,
        startingContributions: CONTRIBUTIONS,
        monthlyContribution: 0
    });

    assert.equal(plan.breakdown.length, 2);

    const m1 = plan.breakdown[0];
    const m2 = plan.breakdown[1];

    // Month 1 still priced on full R3500 outstanding → R350 minimum (NOT R205)
    assert.equal(C.round(m1.interest_payment), 350);
    assert.equal(m1.used_minimum, true);
    assert.equal(C.round(m1.admin_fee), 60);

    // Month 2 on R1750: tiered ~65, min 175 → R175; minimum applies → admin R60
    assert.equal(C.round(m2.interest_payment), 175);
    assert.equal(m2.used_minimum, true);
    assert.equal(C.round(m2.admin_fee), 60);

    // Total interest R525 — the old (principal/term)×10% path only charged R380
    assert.equal(C.round(plan.totalInterestRaw), 525);

    // Equal monthly installment = (3500 + 525 + 120) / 2
    assert.equal(C.round(plan.equalMonthlyPaymentRaw), 2072.5);
});

test('extension plan matches originating a fresh R3500 / 2-month loan', () => {
    const viaExtension = C.buildStockvelRepaymentPlan({
        remainingPrincipal: TOTAL_PRINCIPAL,
        remainingMonths: 2,
        remainingInitiationFee: 0,
        startingContributions: CONTRIBUTIONS,
        monthlyContribution: 0
    });
    const viaOrigination = C.estimateStockvelLoanQuote(
        TOTAL_PRINCIPAL, 2, CONTRIBUTIONS, 0
    );
    assert.equal(viaOrigination.totalInterest, C.round(viaExtension.totalInterestRaw));
    assert.equal(viaOrigination.monthlyPayment, C.round(viaExtension.equalMonthlyPaymentRaw));
});

test('loan #89 style: extension must not invent initiation when waived', () => {
    // After top-up: principal 3500 <= contributions 5000 → initiation 0.
    // Broken term-change used `total_initiation_fee || principal*12%` → R420.
    const principal = 3500;
    const contributions = 5000;
    const waived = 0;
    const brokenFallback = waived || (principal * 0.12);
    assert.equal(brokenFallback, 420);

    assert.equal(C.calculateStockvelInitiationFee(principal, contributions), 0);
    // Corrupted stored R420 must still resolve to waived 0 for stockvel.
    assert.equal(
        C.resolveInitiationFeeForLoan(
            { loan_type: 'stockvel', total_initiation_fee: 420 },
            principal,
            contributions
        ),
        0
    );

    const plan = C.buildStockvelRepaymentPlan({
        remainingPrincipal: principal,
        remainingMonths: 2,
        remainingInitiationFee: 0,
        startingContributions: contributions,
        monthlyContribution: 500
    });
    assert.equal(C.round(plan.breakdown[0].interest_payment), 350);
    assert.equal(C.round(plan.breakdown[0].initiation_fee), 0);
    assert.equal(C.round(plan.breakdown[1].initiation_fee), 0);
    assert.equal(C.round(plan.totalInterestRaw), 525);
});

test('stockvel initiation charges 12% on excess only, even if stored fee is 0', () => {
    // Regression: preserving stored 0 when principal > contributions undercharged.
    assert.equal(C.calculateStockvelInitiationFee(6000, 5000), 120);
    assert.equal(
        C.resolveInitiationFeeForLoan(
            { loan_type: 'stockvel', total_initiation_fee: 0 },
            6000,
            5000
        ),
        120
    );
    assert.equal(
        C.resolveInitiationFeeForLoan(
            { isStockvelLoan: true, total_initiation_fee: 999 },
            6000,
            5000
        ),
        120
    );
});

test('standard initiation keeps stored fee including explicit 0', () => {
    assert.equal(
        C.resolveInitiationFeeForLoan(
            { loan_type: 'standard', total_initiation_fee: 0 },
            3500,
            0
        ),
        0
    );
    assert.equal(
        C.resolveInitiationFeeForLoan(
            { loan_type: 'standard' },
            3500,
            0
        ),
        420
    );
});

test('old wrong formula undercharges vs canonical plan (guards against regression)', () => {
    // Reproduce the broken calculator/term-change math for documentation/guard.
    const principal = TOTAL_PRINCIPAL;
    const months = 2;
    const ppm = principal / months;
    let bal = principal;
    let wrongTotal = 0;
    for (let m = 1; m <= months; m++) {
        const tiered = C.calculateTieredStockvelInterest(bal, CONTRIBUTIONS);
        const scaled = tiered.tiers1to4Interest * (principal / Math.max(bal, 0.01));
        const wrongMin = ppm * C.RATES.STOCKVEL_MIN_MONTHLY_RATE;
        wrongTotal += Math.max(scaled, wrongMin);
        bal -= ppm;
    }
    const canonical = C.buildStockvelRepaymentPlan({
        remainingPrincipal: principal,
        remainingMonths: months,
        remainingInitiationFee: 0,
        startingContributions: CONTRIBUTIONS,
        monthlyContribution: 0
    });
    assert.ok(wrongTotal < canonical.totalInterestRaw,
        `expected old formula (${wrongTotal}) < canonical (${canonical.totalInterestRaw})`);
    assert.equal(C.round(wrongTotal), 380);
    assert.equal(C.round(canonical.totalInterestRaw), 525);
});
