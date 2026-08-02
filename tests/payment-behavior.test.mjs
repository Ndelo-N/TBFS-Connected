/**
 * Grace-linked extra admin accrual + client payment metrics.
 * Run: node --test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const C = require('../shared/calculations.js');

test('extra admin months: 0 inside grace', () => {
    const due = new Date(2026, 5, 30); // 30 Jun 2026
    const asOf = new Date(2026, 6, 2); // 2 Jul — still within 3-day grace
    assert.equal(C.countExtraAdminMonths(due, asOf, 3), 0);
});

test('extra admin months: 1 when grace lapses', () => {
    const due = new Date(2026, 5, 30);
    const asOf = new Date(2026, 6, 4); // day after grace end (3 Jul)
    assert.equal(C.countExtraAdminMonths(due, asOf, 3), 1);
});

test('extra admin months: 2 after one full month past grace end', () => {
    const due = new Date(2026, 5, 30);
    // grace end = 3 Jul; +1 month anniversary = 3 Aug → count 2
    const asOf = new Date(2026, 7, 3);
    assert.equal(C.countExtraAdminMonths(due, asOf, 3), 2);
});

test('calculateExtraAdminDue: ineligible pre-cutoff loan is zero', () => {
    const loan = {
        created_at: '2025-12-01T12:00:00.000Z',
        loan_type: 'standard',
        schedule: [{ due_date: '2026-06-30', admin_fee: 60, status: 'pending' }]
    };
    const r = C.calculateExtraAdminDue(loan, loan.schedule[0], new Date(2026, 7, 15), 3);
    assert.equal(r.months, 0);
    assert.equal(r.amount, 0);
});

test('calculateExtraAdminDue: eligible loan bills months × admin', () => {
    // Single-due schedule: period end = that due, so extra admin from first
    // post-grace month. remaining_principal required for 30% income basket.
    const loan = {
        status: 'active',
        created_at: '2026-03-01T12:00:00.000Z',
        loan_type: 'standard',
        remaining_principal: 3000,
        schedule: [{
            due_date: '2026-06-30T12:00:00',
            principal_payment: 3000,
            admin_fee: 60,
            status: 'partial'
        }]
    };
    const r = C.calculateExtraAdminDue(loan, loan.schedule[0], new Date(2026, 6, 4), 3);
    assert.equal(r.months, 1);
    assert.equal(r.amount, 60);
});

test('calculateExtraAdminDue: completed loan / no open entry is zero', () => {
    const loan = {
        status: 'completed',
        created_at: '2026-03-01T12:00:00.000Z',
        payments_made: 3,
        start_month_index: 2,
        schedule: [{ due_date: '2026-06-30', admin_fee: 60, status: 'paid' }]
    };
    const asOf = new Date(2026, 7, 15);
    assert.equal(C.calculateExtraAdminDue(loan, null, asOf, 3).months, 0);
    assert.equal(C.calculateExtraAdminDue(loan, loan.schedule[0], asOf, 3).months, 0);
    C.updateLoanPaymentSignals(loan, 3, asOf);
    assert.equal(loan.payment_signals.extra_admin_months, 0);
    assert.equal(loan.payment_signals.days_past_grace, 0);
});

test('score: completed loans do not inflate extra_admin_months', () => {
    const asOf = new Date('2026-07-15T12:00:00');
    const client = { account_number: 'ACC-DONE', status: 'active' };
    const loans = [{
        account_number: 'ACC-DONE',
        status: 'completed',
        created_at: '2026-03-01T12:00:00.000Z',
        payments_made: 3,
        start_month_index: 2,
        payment_history: [
            { payment_status: 'on-time', date: '2026-05-15T12:00:00.000Z' },
            { payment_status: 'on-time', date: '2026-06-15T12:00:00.000Z' }
        ],
        schedule: [{ status: 'paid', due_date: '2026-04-30', admin_fee: 60 }]
    }];
    const m = C.computeClientPaymentMetrics(client, loans, { asOf, gracePeriodDays: 3 });
    assert.equal(m.extra_admin_months, 0);
});

test('waterfall: effective admin includes extra_admin_assessed', () => {
    const entry = {
        initiation_fee: 0,
        admin_fee: 60,
        extra_admin_assessed: 120,
        interest_payment: 0,
        principal_payment: 1000,
        paid_breakdown: { admin: 60 }
    };
    // Still owed admin = 60+120-60 = 120
    const adminDue = C.getEntryEffectiveAdminDue(entry);
    assert.equal(adminDue, 120);
    const alloc = C.allocateScheduledPayment(200, {
        entry: {
            initiation_fee: 0,
            admin_fee: adminDue,
            interest_payment: 0,
            principal_payment: 1000
        }
    });
    assert.equal(alloc.adminPaid, 120);
    assert.equal(alloc.principalPaid, 80);
});

test('getPaymentStatus: amount and timing are independent', () => {
    const due = new Date(2026, 5, 30); // 30 Jun
    const inGrace = new Date(2026, 6, 2); // 2 Jul
    const afterGrace = new Date(2026, 6, 4); // 4 Jul
    assert.equal(C.getPaymentStatus(inGrace, due, 1600, 1600, 3), 'on-time');
    assert.equal(C.getPaymentStatus(afterGrace, due, 1600, 1600, 3), 'late');
    assert.equal(C.getPaymentStatus(inGrace, due, 900, 1600, 3), 'partial');
    assert.equal(C.getPaymentStatus(afterGrace, due, 900, 1600, 3), 'partial-late');
    assert.equal(C.getPaymentStatus(afterGrace, due, 0, 1600, 3), 'missed');
    assert.equal(C.isPartialPaymentStatus('partial-late'), true);
    assert.equal(C.isLatePaymentStatus('partial-late'), true);
    assert.equal(C.formatPaymentStatus('partial-late'), 'partial + late');
});

test('score: partial-late penalizes both amount and timing', () => {
    const asOf = new Date('2026-08-15T12:00:00');
    const client = { account_number: 'ACC-PL', status: 'active' };
    const loans = [{
        account_number: 'ACC-PL',
        status: 'completed',
        created_at: '2026-03-01T12:00:00.000Z',
        payment_history: [
            { payment_status: 'partial', date: '2026-06-30T12:00:00.000Z' },
            { payment_status: 'partial-late', date: '2026-07-30T12:00:00.000Z' }
        ],
        schedule: [{ status: 'paid', due_date: '2026-06-30' }]
    }];
    const m = C.computeClientPaymentMetrics(client, loans, { asOf, gracePeriodDays: 3 });
    assert.equal(m.provisional, false);
    assert.equal(m.partial_count, 2); // both payments underpaid
    assert.equal(m.late_count, 1);    // only the second was past grace
    assert.equal(m.on_time_count, 0);
    // −8 partial (2×4) −6 late = −14 → 86
    assert.equal(m.penalties.loan.partial, 8);
    assert.equal(m.penalties.loan.late, 6);
    assert.equal(m.score, 86);
});

test('client payment metrics: clean payer scores 100 (dated window events)', () => {
    const asOf = new Date('2026-07-15T12:00:00');
    const client = { account_number: 'ACC1', first_name: 'A', last_name: 'B', status: 'active' };
    const loans = [{
        account_number: 'ACC1',
        status: 'completed',
        created_at: '2026-03-01T12:00:00.000Z',
        payment_history: [
            { payment_status: 'on-time', date: '2026-05-15T12:00:00.000Z' },
            { payment_status: 'on-time', date: '2026-06-15T12:00:00.000Z' }
        ],
        schedule: [{ status: 'paid', due_date: '2026-04-30' }]
    }];
    const m = C.computeClientPaymentMetrics(client, loans, { asOf });
    assert.equal(m.score, 100);
    assert.equal(m.on_time_count, 2);
});

test('client payment metrics: blacklist ceiling caps score', () => {
    const asOf = new Date('2026-07-15T12:00:00');
    const client = { account_number: 'ACC2', status: 'blacklisted' };
    const loans = [{
        account_number: 'ACC2',
        status: 'defaulted',
        created_at: '2026-03-01T12:00:00.000Z',
        payment_history: [
            { payment_status: 'late', date: '2026-05-01T12:00:00.000Z' },
            { payment_status: 'partial', date: '2026-06-01T12:00:00.000Z' }
        ],
        schedule: [{
            status: 'partial',
            due_date: '2026-01-31',
            extra_admin_assessed: 120,
            admin_fee: 60
        }]
    }];
    const m = C.computeClientPaymentMetrics(client, loans, { asOf });
    assert.equal(m.blacklisted, true);
    assert.equal(m.ceiling, 40);
    assert.ok(m.score <= 40);
    assert.ok(m.late_count >= 1);
});
