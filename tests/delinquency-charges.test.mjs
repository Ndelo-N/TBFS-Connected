/**
 * Post-grace delinquency: monthly late penalty (when principal > 100) +
 * interest under the 30% income cap (admin + late penalty + interest).
 * Run: node --test tests/delinquency-charges.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const C = require('../shared/calculations.js');

function eligibleLoan(overrides = {}) {
    return Object.assign({
        status: 'active',
        created_at: '2026-03-01T12:00:00.000Z',
        loan_type: 'standard',
        remaining_principal: 6000,
        total_interest: 3960,
        original_period_interest: 3960,
        max_interest_allowed: 7920,
        interest_paid: 0,
        schedule: [{
            due_date: '2026-06-30T12:00:00',
            admin_fee: 60,
            interest_payment: 660,
            status: 'pending'
        }]
    }, overrides);
}

test('late penalty principal floor: <=100 skips late penalty', () => {
    assert.equal(C.isLatePenaltyPrincipalEligible(100), false);
    assert.equal(C.isLatePenaltyPrincipalEligible(101), true);
    const low = C.calculateDelinquencyMonthIncome(100, 60, { latePenaltyDays: 7 });
    assert.equal(low.latePenalty, 0);
    assert.equal(low.latePenaltyApplied, false);
    // Cap = 30; admin 60 → interest squeezed to 0
    assert.equal(low.interest, 0);
});

test('month income: admin + late penalty + interest = 30% outstanding', () => {
    const month = C.calculateDelinquencyMonthIncome(6000, 60, { latePenaltyDays: 7 });
    assert.equal(month.incomeCap, 1800);
    assert.equal(month.admin, 60);
    assert.equal(month.latePenalty, 42); // 6000 * 0.001 * 7
    assert.equal(month.interest, 1698);
    assert.equal(month.monthIncome, 1800);
});

test('delinquency charges: late penalty on EVERY month while principal > 100', () => {
    const due = new Date(2026, 5, 30); // 30 Jun
    const loan = eligibleLoan({
        remaining_principal: 3000,
        schedule: [{
            due_date: due,
            admin_fee: 60,
            interest_payment: 660,
            status: 'pending'
        }]
    });
    // grace end = 3 Jul; +1 month anniversary = 3 Aug → 2 extra-admin months
    const asOf = new Date(2026, 7, 3);
    assert.equal(C.countExtraAdminMonths(due, asOf, 3), 2);
    const r = C.calculateDelinquencyCharges(loan, loan.schedule[0], asOf, 3);
    assert.equal(r.months, 2);
    assert.equal(r.extraAdmin, 120);
    // Month1 late (days past grace) + month2 full 7-day late
    assert.ok(r.latePenalty > C.calculateLatePenalty(7, 3000));
    assert.equal(r.monthsBreakdown.length, 2);
    assert.ok(r.monthsBreakdown[0].latePenalty > 0);
    assert.ok(r.monthsBreakdown[1].latePenalty > 0);
    assert.equal(r.monthsBreakdown[1].latePenalty, C.calculateLatePenalty(7, 3000));
    // Each month income at 30% ceiling
    r.monthsBreakdown.forEach(m => {
        assert.equal(m.monthIncome, m.incomeCap);
        assert.equal(
            C.round(m.admin + m.latePenalty + m.interest),
            m.incomeCap
        );
    });
});

test('delinquency charges: principal <= 100 → no late penalty any month', () => {
    const due = new Date(2026, 5, 30);
    const loan = eligibleLoan({
        remaining_principal: 100,
        schedule: [{
            due_date: due,
            admin_fee: 60,
            interest_payment: 660,
            status: 'pending'
        }]
    });
    const asOf = new Date(2026, 7, 3); // 2 months
    const r = C.calculateDelinquencyCharges(loan, loan.schedule[0], asOf, 3);
    assert.equal(r.months, 2);
    assert.equal(r.latePenalty, 0);
    r.monthsBreakdown.forEach(m => {
        assert.equal(m.latePenalty, 0);
        assert.equal(m.latePenaltyApplied, false);
    });
});

test('assessOpenInstallmentFees exposes extra interest candidate', () => {
    const loan = eligibleLoan({ remaining_principal: 1081 });
    const asOf = new Date(2026, 6, 4); // day after grace
    const fees = C.assessOpenInstallmentFees(loan, loan.schedule[0], asOf, 3);
    assert.equal(fees.extraAdminMonths, 1);
    assert.equal(fees.extraAdminAssessedCandidate, 60);
    assert.ok(fees.latePenaltyAssessedCandidate > 0);
    assert.ok(fees.extraInterestAssessedCandidate > 0);
    assert.equal(
        C.round(fees.extraAdminAssessedCandidate + fees.latePenaltyAssessedCandidate +
            fees.extraInterestAssessedCandidate),
        C.round(1081 * 0.30)
    );
});

test('max interest allowed is 2× original period interest', () => {
    const r = C.calculateStandardLoan(6000, 6);
    assert.equal(r.originalPeriodInterest, r.totalInterest);
    assert.equal(r.maxInterestAllowed, C.round(r.totalInterest * 2));

    const caps = C.addInterestCapFields({
        principal: 6000,
        term: 6,
        totalInterest: r.totalInterest
    });
    assert.equal(caps.original_period_interest, r.totalInterest);
    assert.equal(caps.max_interest_allowed, C.round(r.totalInterest * 2));

    const loan = eligibleLoan();
    assert.equal(C.getMaxInterestAllowed(loan), 7920);
});

test('effective interest due includes extra_interest_assessed', () => {
    const entry = {
        interest_payment: 660,
        extra_interest_assessed: 819,
        paid_breakdown: { interest: 660 }
    };
    assert.equal(C.getEntryEffectiveInterestDue(entry), 819);
});

test('syncDelinquencyInterestTracking raises total_interest for extras', () => {
    const loan = eligibleLoan({
        total_interest: 3960,
        schedule: [{
            due_date: '2026-06-30',
            status: 'partial',
            extra_interest_assessed: 819,
            admin_fee: 60
        }]
    });
    C.syncDelinquencyInterestTracking(loan);
    assert.equal(loan.max_interest_allowed, 7920);
    assert.equal(loan.total_interest, 3960 + 819);
});

test('stockvel loans use same delinquency eligibility', () => {
    const loan = eligibleLoan({
        loan_type: 'stockvel',
        isStockvelLoan: true,
        remaining_principal: 2000
    });
    const asOf = new Date(2026, 6, 4);
    const r = C.calculateDelinquencyCharges(loan, loan.schedule[0], asOf, 3);
    assert.equal(r.months, 1);
    assert.ok(r.extraInterest > 0);
    assert.ok(r.latePenalty > 0);
});
