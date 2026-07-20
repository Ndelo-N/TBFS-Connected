/**
 * Client status PIN + encrypt/decrypt round-trip.
 * Run: node --test tests/client-status.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const require = createRequire(import.meta.url);
const ClientStatus = require('../shared/client-status.js');
const C = require('../shared/calculations.js');
// publishForClient looks up global Calculations
globalThis.Calculations = C;

test('PIN hash verifies and rejects wrong PIN', async () => {
    const client = { account_number: 'ACC-P' };
    await ClientStatus.enableAccess(client, '1234');
    assert.equal(client.client_access.enabled, true);
    assert.equal(await ClientStatus.verifyPin('1234', client.client_access), true);
    assert.equal(await ClientStatus.verifyPin('9999', client.client_access), false);
});

test('encrypt/decrypt status pack round-trip', async () => {
    const client = {
        account_number: 'ACC-77',
        first_name: 'Ada',
        last_name: 'Client',
        client_access: null
    };
    await ClientStatus.enableAccess(client, '5678');
    const pack = C.buildClientStatusPack(client, {
        loans: [{
            loan_id: 1,
            account_number: 'ACC-77',
            client_name: 'Ada Client',
            status: 'active',
            created_at: '2026-03-01T12:00:00.000Z',
            principal_amount: 5000,
            term_months: 2,
            remaining_principal: 5000,
            schedule: [{
                due_date: '2026-03-31', status: 'pending',
                principal_payment: 2500, interest_payment: 100,
                initiation_fee: 50, admin_fee: 60
            }],
            payment_history: []
        }],
        transactions: []
    });
    const envelope = await ClientStatus.encryptPack(pack, '5678', client.client_access.pin_salt);
    assert.ok(envelope.ct);
    assert.ok(envelope.accountHash);
    const decrypted = await ClientStatus.decryptEnvelope(envelope, 'ACC-77', '5678');
    assert.equal(decrypted.account_number, 'ACC-77');
    assert.equal(decrypted.loans.length, 1);
    assert.equal(decrypted.loans[0].loan_id, 1);
    await assert.rejects(
        () => ClientStatus.decryptEnvelope(envelope, 'ACC-77', '0000'),
        /./
    );
});

test('accountHash is stable and case-insensitive', async () => {
    const a = await ClientStatus.accountHash('acc-1');
    const b = await ClientStatus.accountHash('ACC-1');
    assert.equal(a, b);
    assert.equal(a.length, 32);
});

/** Minimal Storage for Node tests (session + local) */
function installStorageShims() {
    function makeStore() {
        const data = new Map();
        return {
            getItem(k) { return data.has(k) ? data.get(k) : null; },
            setItem(k, v) { data.set(k, String(v)); },
            removeItem(k) { data.delete(k); },
            clear() { data.clear(); }
        };
    }
    globalThis.sessionStorage = makeStore();
    globalThis.localStorage = makeStore();
    ClientStatus._publishDrain = Object.create(null);
    ClientStatus._publishCoalesce = Object.create(null);
}

test('session PIN vault: publish without explicit PIN after remember', async () => {
    installStorageShims();
    ClientStatus.clearRememberedPins();
    const client = {
        account_number: 'ACC-VAULT',
        first_name: 'Vault',
        last_name: 'Test',
        client_access: null
    };
    await ClientStatus.enableAccess(client, '4321');
    assert.equal(ClientStatus.getRememberedPin('ACC-VAULT'), '4321');

    const state = {
        loans: [{
            loan_id: 9,
            account_number: 'ACC-VAULT',
            client_name: 'Vault Test',
            status: 'active',
            created_at: '2026-03-01T12:00:00.000Z',
            principal_amount: 1000,
            term_months: 1,
            remaining_principal: 1000,
            schedule: [{
                due_date: '2026-03-31', status: 'pending',
                principal_payment: 1000, interest_payment: 50,
                initiation_fee: 20, admin_fee: 60
            }],
            payment_history: []
        }],
        transactions: []
    };
    const result = await ClientStatus.publishForClient(client, state, null);
    assert.ok(result.envelope.ct);
    assert.ok(client.client_access.published_at);

    ClientStatus.forgetPin('ACC-VAULT');
    await assert.rejects(
        () => ClientStatus.publishForClient(client, state, null),
        /PIN needed once this session/
    );
});

test('disableAccess clears session PIN and local pack; maybeAutoPublish skips without PIN', async () => {
    installStorageShims();
    ClientStatus.clearRememberedPins();
    const client = { account_number: 'ACC-OFF', first_name: 'Off', client_access: null };
    await ClientStatus.enableAccess(client, '9999');
    assert.ok(ClientStatus.getRememberedPin('ACC-OFF'));
    const published = await ClientStatus.publishForClient(client, {
        loans: [], transactions: []
    }, '9999');
    assert.ok(published.envelope.accountHash);
    assert.ok(ClientStatus.loadLocalEnvelope(published.envelope.accountHash));

    await ClientStatus.disableAccess(client);
    assert.equal(client.client_access.enabled, false);
    assert.equal(client.client_access.published_at, null);
    assert.equal(ClientStatus.getRememberedPin('ACC-OFF'), null);
    assert.equal(ClientStatus.loadLocalEnvelope(published.envelope.accountHash), null);

    await ClientStatus.enableAccess(client, '9999');
    ClientStatus.forgetPin('ACC-OFF');
    const auto = await ClientStatus.maybeAutoPublish(client, { loans: [], transactions: [] });
    assert.equal(auto.ok, false);
    assert.equal(auto.reason, 'no_pin');
});

test('enableAndPublish rolls back access when publish fails', async () => {
    installStorageShims();
    ClientStatus.clearRememberedPins();
    const client = { account_number: 'ACC-RB', first_name: 'Roll', client_access: null };
    const orig = ClientStatus.publishEnvelope;
    ClientStatus.publishEnvelope = async () => {
        throw new Error('simulated publish failure');
    };
    try {
        let threw = null;
        try {
            await ClientStatus.enableAndPublish(
                client, { loans: [], transactions: [] }, '5555');
        } catch (e) {
            threw = e;
        }
        assert.ok(threw, 'expected publish failure');
        assert.match(String(threw.message || threw), /simulated publish failure/);
        assert.equal(client.client_access && client.client_access.enabled, false);
        assert.equal(ClientStatus.getRememberedPin('ACC-RB'), null);
    } finally {
        ClientStatus.publishEnvelope = orig;
    }
});

test('overlapping maybeAutoPublish serializes and never double-publishes', async () => {
    installStorageShims();
    ClientStatus.clearRememberedPins();
    ClientStatus._publishDrain = Object.create(null);
    ClientStatus._publishCoalesce = Object.create(null);
    const client = { account_number: 'ACC-RACE', first_name: 'Race', client_access: null };
    await ClientStatus.enableAccess(client, '7777');
    const state = { loans: [], transactions: [] };

    let inFlight = 0;
    let maxInFlight = 0;
    let publishCount = 0;
    const orig = ClientStatus.publishEnvelope;
    ClientStatus.publishEnvelope = async function (envelope, opts) {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        publishCount += 1;
        await new Promise(r => setTimeout(r, 40));
        inFlight -= 1;
        return orig.call(ClientStatus, envelope, opts);
    };
    try {
        const p1 = ClientStatus.maybeAutoPublish(client, state);
        const p2 = ClientStatus.maybeAutoPublish(client, state);
        const [r1, r2] = await Promise.all([p1, p2]);
        assert.equal(maxInFlight, 1, 'must not overlap publishes for one account');
        // Coalesce: at most one in-flight drain; may run 1 job (second overwrote)
        // or 2 if second arrived after first started.
        assert.ok(publishCount >= 1 && publishCount <= 2);
        assert.equal(r1.ok, true);
        assert.equal(r2.ok, true);
        // Both waiters share the same drain — final reason must be published.
        assert.equal(r1.reason, 'published');
        assert.equal(r2.reason, 'published');
    } finally {
        ClientStatus.publishEnvelope = orig;
    }
});

test('trailing enqueue after job still runs on same drain', async () => {
    installStorageShims();
    ClientStatus.clearRememberedPins();
    const client = { account_number: 'ACC-TAIL', first_name: 'Tail', client_access: null };
    await ClientStatus.enableAccess(client, '8888');
    const state = { loans: [], transactions: [] };

    let publishCount = 0;
    const markers = [];
    const orig = ClientStatus.publishEnvelope;
    ClientStatus.publishEnvelope = async function (envelope, opts) {
        publishCount += 1;
        const n = publishCount;
        markers.push('start-' + n);
        await new Promise(r => setTimeout(r, 30));
        markers.push('end-' + n);
        return orig.call(ClientStatus, envelope, opts);
    };
    try {
        const p1 = ClientStatus.maybeAutoPublish(client, state);
        // Wait until first publish is in flight, then enqueue another
        await new Promise(r => setTimeout(r, 5));
        const p2 = ClientStatus.maybeAutoPublish(client, state);
        const [r1, r2] = await Promise.all([p1, p2]);
        assert.equal(r1.reason, 'published');
        assert.equal(r2.reason, 'published');
        assert.ok(publishCount >= 1);
        assert.ok(client.client_access.published_at);
    } finally {
        ClientStatus.publishEnvelope = orig;
    }
});

test('refreshAllPortalClients publishes remembered and skips others', async () => {
    installStorageShims();
    ClientStatus.clearRememberedPins();
    const withPin = { account_number: 'ACC-A', first_name: 'A', client_access: null };
    const noPin = { account_number: 'ACC-B', first_name: 'B', client_access: null };
    await ClientStatus.enableAccess(withPin, '1111');
    await ClientStatus.enableAccess(noPin, '2222');
    ClientStatus.forgetPin('ACC-B');

    const state = {
        clients: [withPin, noPin],
        loans: [],
        transactions: []
    };
    const summary = await ClientStatus.refreshAllPortalClients(state);
    assert.equal(summary.published, 1);
    assert.equal(summary.skipped, 1);
    assert.equal(summary.failed, 0);
    assert.ok(withPin.client_access.published_at);
});
