/**
 * State manager tests (F-11 / F-19).
 * Run: node --test   (Node 20+, no dependencies)
 *
 * These lock the schema normalization, the derived-total arithmetic, and
 * the restore-path validation that the whole app now depends on.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const M = require('../shared/app-state.js');

test('legacy field names migrate to canonical', () => {
    const s = M.normalizeState({
        deployedCapital: 500,
        transactionHistory: [{ type: 'a', timestamp: '2026-01-02' }],
        transactions: [{ type: 'b', timestamp: '2026-01-01' }]
    });
    assert.equal(s.deployed, 500);
    assert.equal(s.deployedCapital, undefined);
    assert.equal(s.transactions.length, 2);
    assert.equal(s.transactions[0].type, 'b');   // time-sorted: Jan 1 before Jan 2
    assert.equal(s.transactionHistory, undefined);
});

test('numeric fields are coerced; arrays are guaranteed', () => {
    const s = M.normalizeState({ capital: '1000', loans: undefined, clients: null });
    assert.equal(s.capital, 1000);
    assert.ok(Array.isArray(s.loans));
    assert.ok(Array.isArray(s.clients));
    assert.ok(Array.isArray(s.stockvelMembers));
});

test('counters are monotonic (never derived from array length)', () => {
    const s = M.normalizeState({
        loans: [{ loan_id: 7 }, { loan_id: 3 }],
        stockvelMembers: [{ memberNumber: 1004 }],
        nextLoanId: 2,          // stale — must not win over max+1
        nextMemberNumber: 1001
    });
    assert.equal(s.nextLoanId, 8);        // max(7,3) + 1
    assert.equal(s.nextMemberNumber, 1005);
});

test('getNextLoanId reserves and advances', () => {
    const s = M.normalizeState({ loans: [{ loan_id: 10 }] });
    const a = M.getNextLoanId(s);
    const b = M.getNextLoanId(s);
    assert.equal(a, 11);
    assert.equal(b, 12);
    assert.equal(s.nextLoanId, 13);
});

test('derived totals come from records, not stored counters', () => {
    const s = M.normalizeState({
        loans: [
            { loan_id: 1, status: 'active', remaining_principal: 300 },
            { loan_id: 2, status: 'active', remaining_principal: 200 },
            { loan_id: 3, status: 'completed', remaining_principal: 999 }  // excluded
        ],
        stockvelMembers: [
            { memberNumber: 1001, totalContributions: 100, accumulatedBonus: 5 },
            { memberNumber: 1002, totalContributions: 50, accumulatedBonus: 0 }
        ],
        deployed: 99999,          // stale — must be overwritten
        memberFundsHeld: 88888
    });
    M.recalculateDerivedTotals(s);
    assert.equal(s.deployed, 500);            // 300 + 200 (active only)
    assert.equal(s.memberFundsHeld, 155);     // 100+5 + 50+0
});

test('importJSON accepts a valid backup and fills defaults', () => {
    const ok = M.importJSON(JSON.stringify({ capital: 100, loans: [], clients: [] }));
    assert.equal(ok.capital, 100);
    assert.ok(Array.isArray(ok.stockvelReceipts));
    assert.equal(ok.gracePeriodDays, 3);
});

test('importJSON rejects malformed input', () => {
    assert.throws(() => M.importJSON('not json'), /valid JSON/);
    assert.throws(() => M.importJSON('[1,2,3]'), /state object/);
    assert.throws(() => M.importJSON(JSON.stringify({ capital: -5 })), /negative/);
    assert.throws(
        () => M.importJSON(JSON.stringify({ loans: [{ loan_id: 1 }, { loan_id: 1 }] })),
        /Duplicate/
    );
});

test('importJSON refuses an oversized payload', () => {
    const huge = JSON.stringify({ blob: 'x'.repeat(9 * 1024 * 1024) });
    assert.throws(() => M.importJSON(huge), /large/);
});

test('validate flags out-of-range grace period', () => {
    const s = M.getDefaultState();
    s.gracePeriodDays = 90;
    const r = M.validate(s);
    assert.equal(r.valid, false);
    assert.ok(r.issues.some(i => /gracePeriodDays/.test(i)));
});
