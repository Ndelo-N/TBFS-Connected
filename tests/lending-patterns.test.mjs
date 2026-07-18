/**
 * Client lending patterns by amount and term.
 * Run: node --test tests/lending-patterns.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const C = require('../shared/calculations.js');

const client = { account_number: 'ACC-P1', first_name: 'Pat', last_name: 'Pattern' };

function loan(id, principal, term, status = 'completed') {
    return {
        loan_id: id,
        account_number: 'ACC-P1',
        client_name: 'Pat Pattern',
        principal_amount: principal,
        original_principal: principal,
        term_months: term,
        status,
        remaining_principal: status === 'active' ? principal * 0.5 : 0
    };
}

test('buildClientLendingPatterns groups by term and amount band', () => {
    const state = {
        loans: [
            loan(1, 8000, 3),
            loan(2, 9000, 3),
            loan(3, 15000, 6),
            loan(4, 10000, 3, 'active')
        ]
    };
    const p = C.buildClientLendingPatterns(client, state);
    assert.equal(p.loans_considered, 4);
    assert.equal(p.typical.most_common_term, 3);
    assert.ok(p.typical.most_common_band);
    assert.equal(p.typical.most_common_band.id, '5_10k');
    assert.ok(p.by_term.some(r => r.term_months === 3 && r.count === 3));
    // R10k active + R15k completed both land in the R10–20k band
    assert.ok(p.by_amount_band.some(r => r.id === '10_20k' && r.count === 2));
    assert.ok(p.typical.top_combination);
    assert.equal(p.typical.top_combination.term_months, 3);
    assert.equal(p.current_active.length, 1);
    assert.ok(p.typical.median_principal >= 8000);
});

test('formatLendingPatternBrief includes typical amount and term', () => {
    const state = {
        loans: [loan(1, 12000, 4), loan(2, 12000, 4)]
    };
    const brief = C.formatLendingPatternBrief(C.buildClientLendingPatterns(client, state));
    assert.match(brief, /Loans in pattern: 2/);
    assert.match(brief, /Most common term: 4/);
    assert.match(brief, /R10,000/);
});

test('assessTopUpAgainstPatterns flags above historical max', () => {
    const state = { loans: [loan(1, 10000, 3), loan(2, 10000, 3, 'active')] };
    const patterns = C.buildClientLendingPatterns(client, state);
    const active = state.loans[1];
    const a = C.assessTopUpAgainstPatterns(patterns, active, 8000);
    assert.equal(a.new_principal, 18000);
    assert.equal(a.severity, 'caution');
    assert.ok(a.notes.some(n => /largest historical/i.test(n)));
});

test('assessTermChangeAgainstPatterns flags longer than historical max', () => {
    const state = { loans: [loan(1, 10000, 3), loan(2, 10000, 3, 'active')] };
    const patterns = C.buildClientLendingPatterns(client, state);
    const a = C.assessTermChangeAgainstPatterns(patterns, state.loans[1], 12);
    assert.equal(a.severity, 'caution');
    assert.ok(a.notes.some(n => /longer than any term/i.test(n)));
});

test('empty history returns safe empty pattern', () => {
    const p = C.buildClientLendingPatterns(client, { loans: [] });
    assert.equal(p.loans_considered, 0);
    assert.equal(C.formatLendingPatternBrief(p),
        'No prior loan history for amount/term patterns.');
    const a = C.assessTopUpAgainstPatterns(p, loan(9, 5000, 3, 'active'), 1000);
    assert.match(a.summary, /No historical/);
});
