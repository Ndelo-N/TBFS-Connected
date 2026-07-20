/**
 * Loan statement model — activity, schedule, corrected totals.
 * Run: node --test tests/loan-statement.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const C = require('../shared/calculations.js');

function sampleLoan() {
    return {
        loan_id: 77,
        client_name: 'Ada Client',
        account_number: 'ACC-77',
        status: 'active',
        created_at: '2026-03-01T12:00:00.000Z',
        principal_amount: 10000,
        original_principal: 10000,
        term_months: 3,
        monthly_payment: 3800,
        remaining_principal: 7000,
        total_interest: 900,
        interest_paid: 300,
        total_initiation_fee: 300,
        initiation_fee_paid: 100,
        payments_made: 1,
        total_principal_received: 3000,
        payment_history: [{
            date: '2026-04-05T12:00:00.000Z',
            amount: 3800,
            principal: 3000,
            interest: 300,
            initiation_fee: 100,
            admin_fee: 60,
            late_penalty: 40,
            payment_status: 'late',
            days_late: 5,
            remaining_principal_after: 7000,
            payments_made_after: 1
        }],
        adjustment_history: [{
            id: 1,
            timestamp: '2026-03-15T12:00:00.000Z',
            adjustmentType: 'add_amount',
            reason: 'Top-up',
            changes: [{
                label: 'Principal', format: 'currency', before: 8000, after: 10000
            }],
            meta: { amountAdded: 2000 }
        }],
        schedule: [
            {
                due_date: '2026-03-31',
                status: 'paid',
                principal_payment: 3000,
                interest_payment: 300,
                initiation_fee: 100,
                admin_fee: 60,
                amount_paid: 3800,
                paid_breakdown: {
                    principal: 3000, interest: 300, initiation: 100, admin: 60, late_penalty: 40
                },
                late_penalty_assessed: 40,
                extra_admin_assessed: 0
            },
            {
                due_date: '2026-04-30',
                status: 'partial',
                principal_payment: 3500,
                interest_payment: 300,
                initiation_fee: 100,
                admin_fee: 60,
                extra_admin_assessed: 60,
                late_penalty_assessed: 20,
                amount_paid: 100,
                paid_breakdown: { admin: 60 },
                partial_payment: true
            },
            {
                due_date: '2026-05-31',
                status: 'pending',
                principal_payment: 3500,
                interest_payment: 300,
                initiation_fee: 100,
                admin_fee: 60
            }
        ]
    };
}

test('buildLoanStatementModel includes payments, adjustments, fees, schedule', () => {
    const loan = sampleLoan();
    const model = C.buildLoanStatementModel(loan, { transactions: [] });
    assert.equal(model.loan_id, 77);
    assert.equal(model.summary.status, 'active');
    assert.equal(model.schedule.length, 3);

    const types = model.activity.map(a => a.type);
    assert.ok(types.includes('creation'));
    assert.ok(types.includes('payment'));
    assert.ok(types.includes('adjustment'));
    assert.ok(types.includes('extra_admin'));
    assert.ok(types.includes('late_penalty'));

    const payment = model.activity.find(a => a.type === 'payment');
    assert.match(payment.detail, /Late penalty/);
    assert.match(payment.detail, /late/);

    assert.ok(model.financials.admin_extra_assessed >= 60);
    assert.ok(model.financials.late_penalties_assessed >= 40);
    assert.ok(model.position.admin_paid >= 60);
    assert.ok(model.position.late_penalty_paid >= 40);
    // Totals must not pretend admin is only term×60 when schedule exists
    assert.notEqual(model.financials.admin_total, 180);

    // Open partial installment should expose amount still due + interest/initiation
    assert.ok(model.position.installment_amount_due > 0);
    assert.ok(model.position.monthly_installment > 0);
    const open = model.schedule.find(r => r.status === 'partial');
    assert.ok(open);
    assert.ok(open.interest > 0);
    assert.ok(open.initiation_fee > 0);
    assert.ok(open.amount_due > 0);
    assert.ok(open.due_interest >= 0);
});

test('addInterestCapFields uses calculated interest (not principal ceiling)', () => {
    const r = C.calculateStandardLoan(10000, 10);
    assert.ok(r.totalInterest > 10000);
    const caps = C.addInterestCapFields({
        principal: 10000,
        term: 10,
        totalInterest: r.totalInterest
    });
    assert.equal(caps.interest_calculation_months, 5);
    assert.equal(caps.max_interest_allowed, r.totalInterest);
});

test('buildLoanStatementModel early payoff pulls tx fee detail', () => {
    const loan = sampleLoan();
    loan.status = 'completed';
    loan.early_payoff = true;
    loan.payoff_date = '2026-05-01T12:00:00.000Z';
    loan.payoff_month = 2;
    loan.payoff_amount = 7500;
    loan.savings_from_early_payoff = 500;
    loan.completion_date = '2026-05-01T12:00:00.000Z';
    loan.schedule = loan.schedule.map(e => ({ ...e, status: 'paid' }));
    const state = {
        transactions: [{
            type: 'early_payoff',
            details: {
                loanId: 77,
                latePenaltyPaid: 20,
                extraAdminPaid: 60
            }
        }]
    };
    const model = C.buildLoanStatementModel(loan, state);
    const early = model.activity.find(a => a.type === 'early_payoff');
    assert.ok(early);
    assert.match(early.detail, /Late penalty collected/);
    assert.match(early.detail, /Extra admin collected/);
    assert.ok(model.activity.some(a => a.type === 'completion'));
});

test('buildClientStatusPack includes active loans for client', () => {
    const client = { account_number: 'ACC-77', first_name: 'Ada', last_name: 'Client' };
    const state = { loans: [sampleLoan()], transactions: [] };
    const pack = C.buildClientStatusPack(client, state);
    assert.equal(pack.account_number, 'ACC-77');
    assert.equal(pack.loans.length, 1);
    assert.equal(pack.loans[0].loan_id, 77);
    assert.ok(pack.loans[0].schedule.length >= 1);
});

test('getLoanAdjustmentEvents does not duplicate details+data on same tx', () => {
    const loan = { loan_id: 9, adjustment_history: [] };
    const tx = {
        id: 501,
        type: 'loan_adjustment',
        timestamp: '2026-04-01T12:00:00.000Z',
        date: '2026-04-01T12:00:00.000Z',
        details: {
            loanId: 9,
            adjustmentType: 'change_repayment_period',
            reason: 'Extend',
            changes: [{ label: 'Term', before: 3, after: 6 }]
        },
        data: {
            loanId: 9,
            adjustmentType: 'change_repayment_period',
            reason: 'Extend',
            changes: [{ label: 'Term', before: 3, after: 6 }]
        }
    };
    const events = C.getLoanAdjustmentEvents(loan, { transactions: [tx] });
    assert.equal(events.length, 1);
    assert.equal(events[0].id, 501);
});

test('getClientLoans matches account numbers case-insensitively', () => {
    const client = { account_number: 'acc-mix' };
    const loans = [
        { loan_id: 1, account_number: 'ACC-MIX', status: 'active', principal_amount: 100, term_months: 1 },
        { loan_id: 2, account_number: 'other', status: 'active', principal_amount: 100, term_months: 1 }
    ];
    const matched = C.getClientLoans(client, loans);
    assert.equal(matched.length, 1);
    assert.equal(matched[0].loan_id, 1);

    const pack = C.buildClientStatusPack(
        { account_number: 'Acc-Mix', first_name: 'Case' },
        { loans, transactions: [] }
    );
    assert.equal(pack.loans.length, 1);
    assert.equal(pack.loans[0].loan_id, 1);
});

test('buildLoanStatementModel caps interest remaining to max_interest_allowed', () => {
    const loan = sampleLoan();
    loan.total_interest = 900;
    loan.interest_paid = 300;
    loan.max_interest_allowed = 400; // cap below scheduled total interest
    loan.interest_recalculated = true;
    const model = C.buildLoanStatementModel(loan, { transactions: [] });
    assert.equal(model.position.interest_remaining, 100);
    assert.equal(model.summary.max_interest_allowed, 400);
    // total_remaining must use capped interest, not 900 − 300
    const withoutCapInterest = 900 - 300;
    assert.ok(model.position.total_remaining <
        (model.position.principal_remaining + withoutCapInterest +
            model.position.initiation_fee_remaining +
            model.position.admin_remaining +
            model.position.late_penalty_remaining));
    assert.equal(
        model.position.total_remaining,
        C.round(
            model.position.principal_remaining +
            model.position.interest_remaining +
            model.position.initiation_fee_remaining +
            model.position.admin_remaining +
            model.position.late_penalty_remaining
        )
    );
    const open = model.schedule.find(r => r.status === 'partial' || r.status === 'pending');
    assert.ok(open);
    assert.ok(open.due_interest <= 100);
    // Installment display totals must not include uncapped scheduled interest
    const cappedInterest = C.round(open.paid_interest + open.due_interest);
    assert.ok(cappedInterest < open.interest, 'cap should reduce claimable interest vs schedule');
    assert.equal(
        open.installment_total,
        C.round(
            open.principal + cappedInterest + open.initiation_fee +
            open.admin_fee + open.extra_admin_assessed + open.late_penalty_assessed
        )
    );
    assert.equal(
        open.monthly_payment,
        C.round(open.principal + cappedInterest + open.initiation_fee + open.admin_fee)
    );
    // Cap waterfalls: later pending rows must not show remaining claimable interest
    const laterPending = model.schedule.filter(r =>
        r.status === 'pending' || r.status === 'partial');
    const dueInterestSum = laterPending.reduce((s, r) => s + (r.due_interest || 0), 0);
    assert.ok(dueInterestSum <= 100 + 0.001);
    assert.equal(model.position.interest_remaining, C.round(dueInterestSum));
});

test('buildLoanStatementModel includes live late/extra admin before persist', () => {
    const loan = sampleLoan();
    // Only the first pending/partial row is "open"; make it past grace with no fees persisted
    loan.schedule[1].status = 'paid';
    loan.schedule[1].extra_admin_assessed = 0;
    loan.schedule[1].late_penalty_assessed = 0;
    loan.schedule[2].due_date = '2026-05-01';
    loan.schedule[2].status = 'pending';
    loan.schedule[2].extra_admin_assessed = 0;
    loan.schedule[2].late_penalty_assessed = 0;
    loan.schedule[2].paid_breakdown = {};
    const asOf = '2026-06-15T12:00:00.000Z';
    const model = C.buildLoanStatementModel(loan, { transactions: [] }, {
        asOf,
        gracePeriodDays: 3
    });
    const open = model.schedule.find(r => r.status === 'pending');
    assert.ok(open);
    assert.ok(open.late_penalty_assessed > 0, 'live late penalty should be assessed');
    assert.ok(open.extra_admin_assessed > 0, 'live extra admin should be assessed');
    assert.ok(open.amount_due > open.principal + open.interest + open.initiation_fee + open.admin_fee);
    assert.ok(model.financials.late_penalties_assessed >= open.late_penalty_assessed);
    assert.ok(model.financials.admin_extra_assessed >= open.extra_admin_assessed);
    assert.equal(model.position.installment_amount_due, open.amount_due);
});

test('buildClientStatusPack uses state.gracePeriodDays for statement signals', () => {
    const client = { account_number: 'ACC-77', first_name: 'Ada', last_name: 'Client' };
    const loan = sampleLoan();
    // Open installment due well in the past so grace length changes signals
    loan.schedule[0].due_date = '2020-01-01';
    loan.schedule[0].status = 'pending';
    const shortGrace = C.buildClientStatusPack(client, {
        loans: [loan], transactions: [], gracePeriodDays: 0
    });
    const longGrace = C.buildClientStatusPack(client, {
        loans: [JSON.parse(JSON.stringify(loan))], transactions: [], gracePeriodDays: 60
    }, { asOf: '2020-01-10T12:00:00.000Z' });
    const shortAsOf = C.buildClientStatusPack(client, {
        loans: [JSON.parse(JSON.stringify(loan))], transactions: [], gracePeriodDays: 0
    }, { asOf: '2020-01-10T12:00:00.000Z' });
    // With 0-day grace on Jan 10 after Jan 1 due → past grace; 60-day still inside
    assert.ok(
        (shortAsOf.loans[0].position.days_past_grace || 0) >
        (longGrace.loans[0].position.days_past_grace || 0)
    );
    assert.ok(shortGrace.loans.length === 1);
});
