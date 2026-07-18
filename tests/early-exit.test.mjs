/**
 * Early-exit settlement engine tests.
 * Run: node --test   (Node 20+, no dependencies)
 *
 * Locks the guarantees of calculateEarlyExitSettlement (Model C):
 * blockers actually block, the exit cost is exactly pro-rata on months
 * remaining, the net payout can never go below zero, and the capital
 * guard fires. Assertions are self-consistent against the settlement's
 * own reported monthsRemaining, so calendar arithmetic differences
 * cannot cause false failures.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const C = require('../shared/calculations.js');

function makeMember(overrides = {}) {
    return {
        memberNumber: 1001,
        name: 'Test Member',
        totalContributions: 10000,
        accumulatedBonus: 0,
        membershipStartDate: '2026-01-01',
        membershipEndDate: '2026-12-31',
        status: 'active',
        ...overrides
    };
}

test('early exit: active loan is a hard blocker', () => {
    const member = makeMember();
    const loans = [{ loan_id: 1, status: 'active', memberNumber: 1001,
        loan_type: 'stockvel', principal_amount: 5000, term_months: 6 }];
    const s = C.calculateEarlyExitSettlement(member, loans, [], '2026-06-15');
    assert.equal(s.canExit, false);
    assert.ok(s.blockers.some(b => /active loan/i.test(b)));
});

test('early exit: ended membership routes to normal payouts', () => {
    const member = makeMember();
    const s = C.calculateEarlyExitSettlement(member, [], [], '2027-01-15');
    assert.equal(s.canExit, false);
    assert.equal(s.monthsRemaining, 0);
    assert.ok(s.blockers.some(b => /ended/i.test(b)));
});

test('early exit: already-exited member is blocked', () => {
    const member = makeMember({ status: 'exited_early' });
    const s = C.calculateEarlyExitSettlement(member, [], [], '2026-06-15');
    assert.equal(s.canExit, false);
    assert.ok(s.blockers.some(b => /already exited/i.test(b)));
});

test('early exit: zero benefit → full contributions back, zero exit cost', () => {
    const member = makeMember({ accumulatedBonus: 0 });
    const s = C.calculateEarlyExitSettlement(member, [], [], '2026-06-15');
    assert.equal(s.benefit.total, 0);
    assert.equal(s.exitCost, 0);
    assert.equal(s.netPayout, member.totalContributions);
    assert.equal(s.canExit, true);
});

test('early exit: exit cost is exactly pro-rata on the reported months', () => {
    // Benefit built purely from unpaid bonus so the expected figure is exact.
    const member = makeMember({ accumulatedBonus: 2400 });
    const s = C.calculateEarlyExitSettlement(member, [], [], '2026-06-15');
    assert.equal(s.benefit.total, 2400);
    assert.ok(s.monthsRemaining > 0 && s.monthsRemaining <= 12);
    const expected = Math.round(2400 * (s.monthsRemaining / 12) * 100) / 100;
    assert.equal(s.exitCost, expected);
    assert.equal(s.netPayout,
        Math.round((member.totalContributions - expected) * 100) / 100);
});

test('early exit: earlier exit never costs less than a later one', () => {
    const member = makeMember({ accumulatedBonus: 2400 });
    const early = C.calculateEarlyExitSettlement(member, [], [], '2026-02-15');
    const late = C.calculateEarlyExitSettlement(member, [], [], '2026-10-15');
    assert.ok(early.monthsRemaining >= late.monthsRemaining);
    assert.ok(early.exitCost >= late.exitCost);
});

test('early exit: net payout floors at zero — a member can never owe', () => {
    const member = makeMember({ totalContributions: 100, accumulatedBonus: 5000 });
    const s = C.calculateEarlyExitSettlement(member, [], [], '2026-01-20');
    assert.ok(s.exitCost > member.totalContributions);
    assert.equal(s.netPayout, 0);
});

test('early exit: unpaid bonus is clawed, never added to the payout', () => {
    const member = makeMember({ totalContributions: 10000, accumulatedBonus: 3000 });
    const s = C.calculateEarlyExitSettlement(member, [], [], '2026-06-15');
    assert.equal(s.benefit.bonusUnpaid, 3000);
    // Payout derives from contributions minus cost only — bonus never enters.
    assert.ok(s.netPayout <= member.totalContributions);
});

test('early exit: capital-sufficiency blocker fires', () => {
    const member = makeMember({ accumulatedBonus: 0, totalContributions: 10000 });
    const s = C.calculateEarlyExitSettlement(member, [], [], '2026-06-15',
        { availableCapital: 500 });
    assert.equal(s.canExit, false);
    assert.ok(s.blockers.some(b => /capital/i.test(b)));
});

test('early exit: window-scoped bonus receipts feed the benefit', () => {
    const member = makeMember({ accumulatedBonus: 0 });
    const receipts = [
        { memberNumber: 1001, type: 'bonus_payout', amount: 600, date: '2026-03-01' }, // in window
        { memberNumber: 1001, type: 'bonus_payout', amount: 999, date: '2025-06-01' }, // before window
        { memberNumber: 2002, type: 'bonus_payout', amount: 999, date: '2026-03-01' }  // other member
    ];
    const s = C.calculateEarlyExitSettlement(member, [], receipts, '2026-06-15');
    assert.equal(s.benefit.bonusPaid, 600);
});
