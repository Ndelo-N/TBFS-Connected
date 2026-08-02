/**
 * Post-grace delinquency: monthly late penalty (when unpaid installment
 * principal > 100) + interest under the 30% income cap (admin + late +
 * interest). Basket base = unpaid open-installment principal.
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
    // Cap = 30; admin requested 60 → admin squeezed to cap, interest 0
    assert.equal(low.incomeCap, 30);
    assert.equal(low.admin, 30);
    assert.equal(low.interest, 0);
    assert.equal(low.monthIncome, 30);
});

test('delinquency month income never exceeds 30% cap', () => {
    const month = C.calculateDelinquencyMonthIncome(150, 60, { latePenaltyDays: 7 });
    assert.equal(month.incomeCap, 45);
    assert.ok(month.admin + month.latePenalty + month.interest <= month.incomeCap + 0.001);
    assert.equal(month.monthIncome, month.incomeCap);
});

test('month income: admin + late penalty + interest = 30% outstanding', () => {
    const month = C.calculateDelinquencyMonthIncome(6000, 60, { latePenaltyDays: 7 });
    assert.equal(month.incomeCap, 1800);
    assert.equal(month.admin, 60);
    assert.equal(month.latePenalty, 42); // 6000 * 0.001 * 7
    assert.equal(month.interest, 1698);
    assert.equal(month.monthIncome, 1800);
});

test('month income: explicit admin 0 is honored (not defaulted to R60)', () => {
    const month = C.calculateDelinquencyMonthIncome(3000, 0, { latePenaltyDays: 7 });
    assert.equal(month.admin, 0);
    assert.equal(month.latePenalty, C.calculateLatePenalty(7, 3000));
    assert.equal(month.monthIncome, month.incomeCap);
    assert.equal(month.interest, C.round(month.incomeCap - month.latePenalty));
});

test('delinquency charges: late penalty on EVERY month while principal > 100', () => {
    const due = new Date(2026, 5, 30); // 30 Jun
    const loan = eligibleLoan({
        remaining_principal: 3000,
        schedule: [{
            due_date: due,
            principal_payment: 3000,
            admin_fee: 60,
            interest_payment: 660,
            status: 'pending'
        }]
    });
    // grace end = 3 Jul; +1 month anniversary = 3 Aug → 2 open-delinquency months
    // Single-due schedule: period end = that due, so extra admin also from month 1
    const asOf = new Date(2026, 7, 3);
    assert.equal(C.countExtraAdminMonths(due, asOf, 3), 2);
    const r = C.calculateDelinquencyCharges(loan, loan.schedule[0], asOf, 3);
    assert.equal(r.months, 2);
    assert.equal(r.adminMonths, 2);
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

test('interest basket uses unpaid installment principal; late uses full remaining', () => {
    // R3000 remaining, but open installment only owed R1000 principal (underpaid).
    const loan = eligibleLoan({
        remaining_principal: 3000,
        term_months: 3,
        schedule: [
            {
                due_date: '2026-06-30T12:00:00',
                principal_payment: 1000,
                admin_fee: 60,
                interest_payment: 420,
                status: 'partial',
                paid_breakdown: { initiation: 120, admin: 60, late_penalty: 0, interest: 717, principal: 0 }
            },
            { due_date: '2026-07-30T12:00:00', principal_payment: 1000, admin_fee: 60, interest_payment: 420, status: 'pending' },
            { due_date: '2026-08-30T12:00:00', principal_payment: 1000, admin_fee: 60, interest_payment: 420, status: 'pending' }
        ]
    });
    assert.equal(C.getDelinquencyOutstandingPrincipal(loan, loan.schedule[0]), 1000);

    const asOf = new Date(2026, 6, 4); // day after grace
    const r = C.calculateDelinquencyCharges(loan, loan.schedule[0], asOf, 3);
    assert.equal(r.outstanding, 1000); // interest / 30% cap base
    assert.equal(r.latePenaltyPrincipal, 3000); // late fee base unchanged
    assert.equal(r.monthsBreakdown[0].incomeCap, 300); // 30% of 1000, not 900
    assert.equal(r.monthsBreakdown[0].admin, 0); // still inside original 3-month term
    assert.equal(r.monthsBreakdown[0].latePenalty, C.calculateLatePenalty(1, 3000)); // R3, not R1
    assert.equal(r.monthsBreakdown[0].interest, 297);
    assert.equal(
        C.round(r.monthsBreakdown[0].admin + r.monthsBreakdown[0].latePenalty +
            r.monthsBreakdown[0].interest),
        300
    );

    // Partial principal pay-down shrinks interest base only; late still on remaining
    loan.schedule[0].paid_breakdown.principal = 400;
    loan.remaining_principal = 2600;
    assert.equal(C.getDelinquencyOutstandingPrincipal(loan, loan.schedule[0]), 600);
    const afterPay = C.calculateDelinquencyCharges(loan, loan.schedule[0], asOf, 3);
    assert.equal(afterPay.outstanding, 600);
    assert.equal(afterPay.latePenaltyPrincipal, 2600);
    assert.equal(afterPay.monthsBreakdown[0].incomeCap, 180);
    assert.equal(afterPay.monthsBreakdown[0].latePenalty, C.calculateLatePenalty(1, 2600));
});

test('extra admin starts only after original loan period ends', () => {
    // 3-month schedule: period ends 30 Aug. Open month-1 due 30 Jun.
    const loan = eligibleLoan({
        remaining_principal: 3000,
        term_months: 3,
        schedule: [
            { due_date: '2026-06-30T12:00:00', principal_payment: 1000, admin_fee: 60, interest_payment: 420, status: 'partial' },
            { due_date: '2026-07-30T12:00:00', principal_payment: 1000, admin_fee: 60, interest_payment: 420, status: 'pending' },
            { due_date: '2026-08-30T12:00:00', principal_payment: 1000, admin_fee: 60, interest_payment: 420, status: 'pending' }
        ]
    });
    const periodEnd = C.getLoanPeriodEndDueDate(loan);
    assert.equal(periodEnd.toISOString().slice(0, 10), '2026-08-30');

    // Still inside original period (30 Jul): late/interest yes, extra admin no
    const midTerm = C.calculateDelinquencyCharges(
        loan, loan.schedule[0], new Date(2026, 6, 30), 3);
    assert.equal(midTerm.months, 1);
    assert.equal(midTerm.adminMonths, 0);
    assert.equal(midTerm.extraAdmin, 0);
    assert.equal(midTerm.outstanding, 1000);
    assert.ok(midTerm.latePenalty > 0);
    assert.ok(midTerm.extraInterest > 0);
    assert.equal(midTerm.monthsBreakdown[0].adminBilled, false);

    // Month after period ends (30 Sep): first extra-admin month
    const afterTerm = C.calculateDelinquencyCharges(
        loan, loan.schedule[0], new Date(2026, 8, 30), 3);
    assert.ok(afterTerm.months >= 3);
    assert.equal(afterTerm.adminMonths, 1);
    assert.equal(afterTerm.extraAdmin, 60);
    assert.equal(afterTerm.monthsBreakdown.filter(m => m.adminBilled).length, 1);

    const due = C.calculateExtraAdminDue(loan, loan.schedule[0], new Date(2026, 8, 30), 3);
    assert.equal(due.months, 1);
    assert.equal(due.amount, 60);
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
    const loan = eligibleLoan({
        remaining_principal: 1081,
        schedule: [{
            due_date: '2026-06-30T12:00:00',
            principal_payment: 1081,
            admin_fee: 60,
            interest_payment: 660,
            status: 'pending'
        }]
    });
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

    // Legacy 1× ceiling is lifted on read so preview/allocation have headroom
    const legacy = eligibleLoan({ max_interest_allowed: 3960 });
    assert.equal(C.getMaxInterestAllowed(legacy), 7920);

    // Stored max inflated by delinquency-inclusive totals is not honored
    const inflatedStore = eligibleLoan({
        original_period_interest: 3960,
        max_interest_allowed: 9000,
        total_interest: 5000
    });
    assert.equal(C.getMaxInterestAllowed(inflatedStore), 7920);

    // Overpayment recalc keeps a deliberately lowered scheduled freeze
    const recalced = eligibleLoan({
        max_interest_allowed: 2000,
        interest_recalculated: true
    });
    assert.equal(C.getMaxInterestAllowed(recalced), 2000);
    assert.equal(C.ensureMaxInterestAllowed(recalced), 2000);

    // Later unpaid delinquency still has headroom on a frozen cap
    const recalcedWithExtra = eligibleLoan({
        max_interest_allowed: 2000,
        interest_recalculated: true,
        schedule: [{
            status: 'partial',
            interest_payment: 100,
            extra_interest_assessed: 250,
            paid_breakdown: { interest: 100 }
        }]
    });
    assert.equal(C.getMaxInterestAllowed(recalcedWithExtra), 2250);

    // Unpaid extras must not push a near-2× freeze above the statutory ceiling
    const nearCap = eligibleLoan({
        original_period_interest: 3960,
        max_interest_allowed: 7800,
        interest_recalculated: true,
        schedule: [{
            status: 'partial',
            interest_payment: 100,
            extra_interest_assessed: 500,
            paid_breakdown: { interest: 100 }
        }]
    });
    assert.equal(C.getMaxInterestAllowed(nearCap), 7920);

    // Live preview candidate is included for recalculated caps
    const livePreview = eligibleLoan({
        max_interest_allowed: 2000,
        interest_recalculated: true,
        schedule: [{
            status: 'pending',
            interest_payment: 100,
            extra_interest_assessed: 0,
            paid_breakdown: {}
        }]
    });
    assert.equal(
        C.getMaxInterestAllowed(livePreview, {
            openEntry: livePreview.schedule[0],
            openLiveExtraInterest: 300
        }),
        2300
    );
});

test('effective interest due includes extra_interest_assessed', () => {
    const entry = {
        interest_payment: 660,
        extra_interest_assessed: 819,
        paid_breakdown: { interest: 660 }
    };
    assert.equal(C.getEntryEffectiveInterestDue(entry), 819);
});

test('syncDelinquencyInterestTracking only ensures cap (no total rewrite)', () => {
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
    // Must not inflate to original + extras (double-count after adjustments)
    assert.equal(loan.total_interest, 3960);
});

test('applyExtraInterestAssessment bumps total_interest by delta only', () => {
    const entry = {
        due_date: '2026-06-30',
        status: 'partial',
        extra_interest_assessed: 100,
        extra_interest_in_total: 100,
        admin_fee: 60
    };
    const loan = eligibleLoan({
        total_interest: 3960,
        schedule: [entry]
    });
    const delta = C.applyExtraInterestAssessment(loan, entry, 819);
    assert.equal(delta, 719);
    assert.equal(entry.extra_interest_assessed, 819);
    assert.equal(entry.extra_interest_in_total, 819);
    assert.equal(loan.total_interest, 3960 + 719);
    // Second apply with same candidate is a no-op
    assert.equal(C.applyExtraInterestAssessment(loan, entry, 819), 0);
    assert.equal(loan.total_interest, 3960 + 719);
});

test('applyExtraInterestAssessment can stamp full assessment with partial total', () => {
    const entry = {
        due_date: '2026-06-30',
        status: 'partial',
        admin_fee: 60
    };
    const loan = eligibleLoan({
        total_interest: 3960,
        schedule: [entry]
    });
    assert.equal(C.applyExtraInterestAssessment(loan, entry, 819, 200), 200);
    assert.equal(entry.extra_interest_assessed, 819);
    assert.equal(entry.extra_interest_in_total, 200);
    assert.equal(loan.total_interest, 4160);
    // Later headroom can raise total without re-counting
    assert.equal(C.applyExtraInterestAssessment(loan, entry, 819, 500), 300);
    assert.equal(entry.extra_interest_in_total, 500);
    assert.equal(loan.total_interest, 4460);
});

test('paidScheduleExtraInterest counts only paid-toward-extra', () => {
    const loan = eligibleLoan({
        schedule: [{
            status: 'partial',
            interest_payment: 100,
            extra_interest_assessed: 50,
            paid_breakdown: { interest: 130 }
        }]
    });
    assert.equal(C.paidScheduleExtraInterest(loan), 30);
    assert.equal(C.unpaidScheduleExtraInterest(loan), 20);
});

test('unpaidScheduleExtraInterest ignores paid scheduled then extras', () => {
    const loan = eligibleLoan({
        schedule: [
            {
                status: 'partial',
                interest_payment: 100,
                extra_interest_assessed: 50,
                paid_breakdown: { interest: 120 } // 100 scheduled + 20 of extra
            },
            {
                status: 'pending',
                interest_payment: 200,
                extra_interest_assessed: 80,
                paid_breakdown: { interest: 0 }
            },
            {
                status: 'paid',
                interest_payment: 100,
                extra_interest_assessed: 40,
                paid_breakdown: { interest: 140 }
            }
        ]
    });
    // partial: 30 unpaid extra; pending: 80; paid ignored
    assert.equal(C.unpaidScheduleExtraInterest(loan), 110);
});

test('legacy applyExtraInterestAssessment does not poison period base', () => {
    const entry = {
        due_date: '2026-06-30',
        status: 'pending',
        admin_fee: 60
    };
    // Legacy loan: no original_period_interest stored
    const loan = {
        status: 'active',
        created_at: '2026-03-01T12:00:00.000Z',
        remaining_principal: 3000,
        total_interest: 480,
        max_interest_allowed: 480,
        interest_paid: 0,
        schedule: [entry]
    };
    C.applyExtraInterestAssessment(loan, entry, 200);
    assert.equal(loan.original_period_interest, 480);
    assert.equal(loan.total_interest, 680);
    assert.equal(loan.max_interest_allowed, 960); // 2× period, not 2× inflated total
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
