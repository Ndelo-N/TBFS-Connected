/**
 * Reloan bylaws — editable policy + calculator officer advice.
 * Run: node --test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const C = require('../shared/calculations.js');
// AppStateManager normalizes bylaws via the global Calculations object (browser).
globalThis.Calculations = C;
const M = require('../shared/app-state.js');

const asOf = new Date('2026-08-01T12:00:00');

function pay(status, daysAgo) {
    const d = new Date(asOf.getTime());
    d.setDate(d.getDate() - daysAgo);
    return { payment_status: status, date: d.toISOString(), amount: 900 };
}

function poorHistoryClient() {
    const client = { account_number: 'POOR1', status: 'active', total_loans: 1 };
    const history = [];
    // Chronic underpay + late (partial-late) → Poor band after completion
    for (let i = 0; i < 8; i++) {
        history.push(pay('partial-late', 30 * (8 - i)));
    }
    const loans = [{
        loan_id: 1,
        account_number: 'POOR1',
        status: 'completed',
        principal_amount: 3000,
        term_months: 3,
        created_at: '2025-12-01T12:00:00.000Z',
        payment_history: history,
        schedule: [
            { status: 'paid', due_date: '2026-01-31' },
            { status: 'paid', due_date: '2026-02-28' },
            { status: 'paid', due_date: '2026-03-31' }
        ]
    }];
    return { client, loans };
}

test('default bylaws expose all six score tiers', () => {
    const doc = C.getDefaultReloanBylaws();
    assert.equal(doc.title.includes('Bylaws'), true);
    for (const id of ['building', 'excellent', 'good', 'watch', 'poor', 'critical']) {
        assert.ok(doc.tiers[id], 'missing tier ' + id);
        assert.ok(Array.isArray(doc.tiers[id].conditions));
    }
    assert.equal(doc.tiers.poor.same_amount_allowed, false);
    assert.equal(doc.tiers.poor.max_principal_pct_of_prior, 50);
    assert.equal(doc.tiers.critical.stance, 'decline');
});

test('normalizeReloanBylaws merges edits and clamps fields', () => {
    const normalized = C.normalizeReloanBylaws({
        title: 'Custom Bylaws',
        tiers: {
            poor: {
                same_amount_allowed: false,
                max_principal_pct_of_prior: 999,
                require_rehab_clean_events: -3,
                calculator_severity: 'nope',
                summary: 'Custom poor summary',
                conditions: ['Rule A', '', 'Rule B'],
                officer_notes: 'Note'
            }
        }
    });
    assert.equal(normalized.title, 'Custom Bylaws');
    assert.equal(normalized.tiers.poor.max_principal_pct_of_prior, 200);
    assert.equal(normalized.tiers.poor.require_rehab_clean_events, 0);
    assert.equal(normalized.tiers.poor.calculator_severity, 'caution');
    assert.deepEqual(normalized.tiers.poor.conditions, ['Rule A', 'Rule B']);
    assert.equal(normalized.tiers.excellent.same_amount_allowed, true);
});

test('AppState persists and normalizes reloanBylaws', () => {
    const s = M.normalizeState({
        reloanBylaws: {
            title: 'Office Policy',
            tiers: { watch: { max_principal_pct_of_prior: 60, summary: 'Watch carefully' } }
        }
    });
    assert.ok(s.reloanBylaws);
    assert.equal(s.reloanBylaws.title, 'Office Policy');
    assert.equal(s.reloanBylaws.tiers.watch.max_principal_pct_of_prior, 60);
    assert.equal(s.reloanBylaws.tiers.watch.summary, 'Watch carefully');
    assert.ok(s.reloanBylaws.tiers.poor);
});

test('buildReloanAdvice: first client uses building / standard path', () => {
    const client = { account_number: 'NEW1', status: 'active', total_loans: 0 };
    const advice = C.buildReloanAdvice(client, [], { gracePeriodDays: 3 }, {
        requestedPrincipal: 3000,
        requestedTerm: 3,
        asOf
    });
    assert.equal(advice.is_returning, false);
    assert.equal(advice.band.id, 'building');
    assert.ok(advice.notes.some(n => /First financing/i.test(n)));
});

test('buildReloanAdvice: poor returning client blocks same amount', () => {
    const { client, loans } = poorHistoryClient();
    const metrics = C.computeClientPaymentMetrics(client, loans, { asOf, gracePeriodDays: 3 });
    assert.equal(metrics.provisional, false);
    assert.ok(metrics.score != null && metrics.score < 50, 'expected poor score, got ' + metrics.score);

    const advice = C.buildReloanAdvice(client, loans, {
        gracePeriodDays: 3,
        reloanBylaws: C.getDefaultReloanBylaws()
    }, {
        requestedPrincipal: 3000,
        requestedTerm: 3,
        asOf
    });
    assert.equal(advice.is_returning, true);
    assert.equal(advice.band.id, 'poor');
    assert.ok(advice.flags.includes('same_amount_blocked'));
    assert.ok(advice.flags.includes('principal_above_tier_cap'));
    assert.equal(advice.max_allowed_principal, 1500);
    assert.ok(advice.confirm_required);
    assert.match(advice.severity, /caution|block|watch/);
});

test('buildLoanBylawsReference stamps audit snapshot', () => {
    const { client, loans } = poorHistoryClient();
    const advice = C.buildReloanAdvice(client, loans, {
        gracePeriodDays: 3,
        reloanBylaws: C.getDefaultReloanBylaws()
    }, { requestedPrincipal: 3000, requestedTerm: 3, asOf });
    const ref = C.buildLoanBylawsReference(advice);
    assert.equal(ref.document, 'reloan_bylaws');
    assert.equal(ref.tier_id, 'poor');
    assert.equal(ref.band_id, 'poor');
    assert.ok(ref.applied_at);
    assert.ok(Array.isArray(ref.conditions));
    assert.ok(ref.flags.includes('same_amount_blocked'));
});

test('formatReloanAdviceForConfirm includes tier and stance', () => {
    const { client, loans } = poorHistoryClient();
    const advice = C.buildReloanAdvice(client, loans, {
        gracePeriodDays: 3,
        reloanBylaws: C.getDefaultReloanBylaws()
    }, { requestedPrincipal: 1500, requestedTerm: 1, asOf });
    const text = C.formatReloanAdviceForConfirm(advice);
    assert.match(text, /Poor/i);
    assert.match(text, /Stance:/);
});
