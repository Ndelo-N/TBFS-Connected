/**
 * Copyright (c) 2026 NGECE Holdings (Pty) Ltd. All rights reserved.
 * PortalAPI client tests (mock fetch). Run: node --test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// shims
const store = new Map();
globalThis.localStorage = {
  getItem: k => store.has(k) ? store.get(k) : null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k)
};
const PortalAPI = require('../shared/portal-api.js');

test('generateCode: base64url, no padding, min length honoured', () => {
  const c = PortalAPI.generateCode(8);
  assert.match(c, /^[A-Za-z0-9_-]+$/);
  assert.ok(c.length >= 10);
});

test('setBaseUrl strips trailing slashes; isConfigured needs base + token', () => {
  PortalAPI.setBaseUrl('https://api.mytbfs.co.za/');
  assert.equal(PortalAPI.baseUrl(), 'https://api.mytbfs.co.za');
  PortalAPI.clearToken();
  assert.equal(PortalAPI.isConfigured(), false);
  PortalAPI.setToken('op-token');
  assert.equal(PortalAPI.isConfigured(), true);
});

test('publish posts to the right URL with auth + body', async () => {
  let captured = null;
  globalThis.fetch = async (url, opts) => {
    captured = { url, opts };
    return { ok: true, status: 200, json: async () => ({ ok: true, updatedAt: '2026-07-31T00:00:00Z' }) };
  };
  PortalAPI.setBaseUrl('https://api.mytbfs.co.za');
  PortalAPI.setToken('op-token');
  const res = await PortalAPI.publish('2025001', 'strong-code', { loans: [] });
  assert.equal(res.updatedAt, '2026-07-31T00:00:00Z');
  assert.equal(captured.url, 'https://api.mytbfs.co.za/v1/operator/publish');
  assert.equal(captured.opts.headers['Authorization'], 'Bearer op-token');
  const body = JSON.parse(captured.opts.body);
  assert.equal(body.account, '2025001');
  assert.equal(body.code, 'strong-code');
  assert.deepEqual(body.statement, { loans: [] });
});

test('publish surfaces API errors', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 422, statusText: 'Unprocessable', json: async () => ({ error: 'weak_code' }) });
  PortalAPI.setBaseUrl('https://api.mytbfs.co.za');
  PortalAPI.setToken('op-token');
  await assert.rejects(() => PortalAPI.publish('2025001', 'x', {}), /422: weak_code/);
});

test('publish refuses when not configured', async () => {
  PortalAPI.clearToken();
  await assert.rejects(() => PortalAPI.publish('2025001', 'code', {}), /not configured/);
});

test('revoke posts account only', async () => {
  let captured = null;
  globalThis.fetch = async (url, opts) => { captured = { url, opts }; return { ok: true, status: 200, json: async () => ({ ok: true, revoked: true }) }; };
  PortalAPI.setBaseUrl('https://api.mytbfs.co.za');
  PortalAPI.setToken('op-token');
  const res = await PortalAPI.revoke('2025001');
  assert.equal(res.revoked, true);
  assert.equal(captured.url, 'https://api.mytbfs.co.za/v1/operator/revoke');
  assert.deepEqual(JSON.parse(captured.opts.body), { account: '2025001' });
});
