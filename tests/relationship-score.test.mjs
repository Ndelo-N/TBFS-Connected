/**
 * Redeemable reliability score (Score v2) + stockvel blend.
 * Run: node --test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const C = require('../shared/calculations.js');

const asOf = new Date('2026-07-15T12:00:00');

function pay(status, daysAgo, extras = {}) {
    const d = new Date(asOf.getTime());
    d.setDate(d.getDate() - daysAgo);
    return { payment_status: status, date: d.toISOString(), amount: 1000, ...extras };
}

test('score v2: clean payer in window scores 100 (with credits capped)', () => {
    const client = { account_number: 'ACC1', status: 'active' };
    const loans = [{
        account_number: 'ACC1',
        status: 'completed',
        created_at: '2026-03-01T12:00:00.000Z',
        payment_history: [pay('on-time', 60), pay('on-time', 30)],
        schedule: [{ status: 'paid', due_date: '2026-05-31' }]
    }];
    const m = C.computeClientPaymentMetrics(client, loans, { asOf });
    assert.equal(m.provisional, false);
    assert.equal(m.score, 100);
    assert.equal(m.band.id, 'excellent');
    assert.equal(m.on_time_count, 2);
});

test('score v2: thin file is Building (provisional)', () => {
    const client = { account_number: 'ACC0', status: 'active' };
    const loans = [{
        account_number: 'ACC0',
        status: 'active',
        created_at: '2026-06-01T12:00:00.000Z',
        payment_history: [pay('on-time', 10)],
        schedule: [{ status: 'paid', due_date: '2026-06-30' }]
    }];
    const m = C.computeClientPaymentMetrics(client, loans, { asOf });
    assert.equal(m.provisional, true);
    assert.equal(m.score, null);
    assert.equal(m.band.id, 'building');
});

test('score v2: late events penalize; rehab credits restore', () => {
    const client = { account_number: 'ACC3', status: 'active' };
    const loans = [{
        account_number: 'ACC3',
        status: 'active',
        created_at: '2026-01-01T12:00:00.000Z',
        payment_history: [
            pay('late', 120),
            pay('late', 90),
            pay('on-time', 60),
            pay('on-time', 30),
            pay('on-time', 5)
        ],
        schedule: [{ status: 'paid', due_date: '2026-06-30' }]
    }];
    const m = C.computeClientPaymentMetrics(client, loans, { asOf });
    assert.equal(m.provisional, false);
    // 2 lates (−12) + 3 clean credits (+15) → 103 → 100
    assert.equal(m.score, 100);
    assert.ok(m.redemption.clean_streak >= 3);
    assert.ok(m.penalties.total >= 12);
});

test('score v2: blacklist applies ceiling 40 until rehab', () => {
    const client = { account_number: 'ACC2', status: 'blacklisted' };
    const loans = [{
        account_number: 'ACC2',
        status: 'defaulted',
        created_at: '2026-03-01T12:00:00.000Z',
        payment_history: [pay('on-time', 40), pay('on-time', 10)],
        schedule: [{ status: 'paid', due_date: '2026-06-30' }]
    }];
    const m = C.computeClientPaymentMetrics(client, loans, { asOf });
    assert.equal(m.blacklisted, true);
    assert.equal(m.ceiling, 40);
    assert.ok(m.score <= 40);
});

test('score v2: defaulted ceiling 60', () => {
    const client = { account_number: 'ACC4', status: 'defaulted' };
    const loans = [{
        account_number: 'ACC4',
        status: 'defaulted',
        created_at: '2026-03-01T12:00:00.000Z',
        payment_history: [pay('on-time', 40), pay('on-time', 10)],
        schedule: [{ status: 'paid', due_date: '2026-06-30' }]
    }];
    const m = C.computeClientPaymentMetrics(client, loans, { asOf });
    assert.equal(m.ceiling, 60);
    assert.ok(m.score <= 60);
});

test('score v2: stockvel blends loan 60% + membership 40%', () => {
    const client = {
        account_number: 'ACC5',
        status: 'active',
        client_type: 'stockvel',
        memberNumber: 1001
    };
    const loans = [{
        account_number: 'ACC5',
        memberNumber: 1001,
        status: 'completed',
        created_at: '2026-01-01T12:00:00.000Z',
        payment_history: [pay('on-time', 50), pay('on-time', 20)],
        schedule: [{ status: 'paid', due_date: '2026-05-31' }]
    }];
    const members = [{
        memberNumber: 1001,
        name: 'Member',
        membershipStartDate: '2026-01-01',
        membershipEndDate: '2026-12-31',
        status: 'active',
        totalContributions: 6000,
        accumulatedBonus: 0
    }];
    // Only two contribution months in a long window → several missed months
    const receipts = [
        { memberNumber: 1001, type: 'contribution', amount: 500, date: '2026-01-15' },
        { memberNumber: 1001, type: 'contribution', amount: 500, date: '2026-02-15' }
    ];
    const m = C.computeClientPaymentMetrics(client, loans, {
        asOf,
        stockvelMembers: members,
        stockvelReceipts: receipts
    });
    assert.equal(m.is_stockvel, true);
    assert.equal(m.blend_weights.loan, 0.6);
    assert.equal(m.blend_weights.membership, 0.4);
    assert.ok(m.membership_score != null);
    assert.ok(m.membership_score < 100);
    // Blended should be below perfect loan-only 100
    assert.ok(m.score < 100);
});

test('score v2: membership clean streak accumulates consecutive receipts', () => {
    const member = {
        memberNumber: 2002,
        membershipStartDate: '2026-05-01',
        membershipEndDate: '2026-12-31',
        status: 'active'
    };
    const receipts = [
        { memberNumber: 2002, type: 'contribution', amount: 500, date: '2026-05-15' },
        { memberNumber: 2002, type: 'contribution', amount: 500, date: '2026-06-15' },
        { memberNumber: 2002, type: 'contribution', amount: 500, date: '2026-07-10' }
    ];
    const track = C._scoreMembershipTrack(member, receipts, asOf, 12, 3);
    assert.equal(track.missed_contribution_months, 0);
    assert.equal(track.clean_streak, 3);
    assert.equal(track.credits.clean_streak, 15);
});

test('score v2: accruing extra admin counts before persist', () => {
    const client = { account_number: 'ACC-EA', status: 'active' };
    const loans = [{
        account_number: 'ACC-EA',
        status: 'active',
        created_at: '2026-03-01T12:00:00.000Z',
        payment_history: [pay('on-time', 60), pay('on-time', 30)],
        schedule: [{
            status: 'pending',
            due_date: '2026-06-30',
            admin_fee: 60
            // no extra_admin_assessed — still accruing
        }]
    }];
    const m = C.computeClientPaymentMetrics(client, loans, { asOf, gracePeriodDays: 3 });
    assert.ok(m.extra_admin_months >= 1);
    assert.ok(m.penalties.loan.extra_admin >= 5);
});

test('timeline and economics helpers return shapes', () => {
    const client = { account_number: 'ACC9', first_name: 'T', last_name: 'U', status: 'active' };
    const state = {
        loans: [{
            account_number: 'ACC9',
            loan_id: 9,
            status: 'active',
            principal_amount: 10000,
            remaining_principal: 4000,
            total_principal_received: 6000,
            interest_paid: 500,
            initiation_fee_paid: 200,
            created_at: '2026-03-01T12:00:00.000Z',
            payment_history: [pay('on-time', 20, { admin_fee: 60 })],
            schedule: [{ status: 'partial', due_date: '2026-06-30', admin_fee: 60 }]
        }],
        stockvelMembers: [],
        stockvelReceipts: []
    };
    const timeline = C.buildClientRelationshipTimeline(client, state, { asOf, months: 24 });
    assert.ok(Array.isArray(timeline));
    assert.ok(timeline.length >= 1);
    const econ = C.buildClientRelationshipEconomics(client, state);
    assert.equal(econ.disbursed, 10000);
    assert.equal(econ.repaid_principal, 6000);
    assert.ok(econ.revenue >= 500);
});
