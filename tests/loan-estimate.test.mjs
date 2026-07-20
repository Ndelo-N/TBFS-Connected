/**
 * Portal quote-only standard vs stockvel comparison.
 * Run: node --test tests/loan-estimate.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const C = require('../shared/calculations.js');

test('estimateLoanComparison returns standard and stockvel quotes', () => {
    const cmp = C.estimateLoanComparison(10000, 3, {
        totalContributions: 8000,
        monthlyContribution: 500
    });
    assert.ok(cmp.standard.monthlyPayment > 0);
    assert.ok(cmp.stockvel.monthlyPayment > 0);
    assert.ok(cmp.standard.totalCost > 0);
    assert.ok(cmp.stockvel.totalCost > 0);
    // With solid contributions, stockvel should usually be cheaper
    assert.ok(cmp.savings.total > 0, 'expected stockvel savings with R8k contributions');
});

test('estimateStockvelLoanQuote zero principal is empty', () => {
    const q = C.estimateStockvelLoanQuote(0, 3, 1000, 100);
    assert.equal(q.totalCost, 0);
    assert.equal(q.monthlyPayment, 0);
});
