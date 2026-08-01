/**
 * TBFS Portal API client (operator side).
 *
 * Copyright (c) 2026 NGECE Holdings (Pty) Ltd. All rights reserved.
 * Proprietary and confidential. See LICENSE.
 *
 * Publishes a client's statement to the TBFS API (a Cloudflare Worker) so it
 * is stored in PRIVATE Cloudflare KV behind a rate-limited login — instead of
 * committing encrypted files into the public repository. When this is
 * configured, ClientStatus routes publish/revoke here and no client data is
 * ever written to git.
 *
 * Config:
 *   - base URL   persisted (not secret): localStorage 'tbfsPortalApiBase'
 *   - operator token  SECRET: held in memory for this browser session only
 *     (set once per session, like unlocking cloud backup).
 */
function dbg(...args) { if (globalThis.TBFS_DEBUG) console.log(...args); }

const PortalAPI = {
    BASE_KEY: 'tbfsPortalApiBase',
    _token: null,

    baseUrl() {
        try { return (localStorage.getItem(this.BASE_KEY) || '').replace(/\/+$/, ''); }
        catch (e) { return ''; }
    },
    setBaseUrl(url) {
        const clean = String(url || '').trim().replace(/\/+$/, '');
        try { localStorage.setItem(this.BASE_KEY, clean); } catch (e) { /* ignore */ }
        return clean;
    },
    setToken(token) { this._token = token ? String(token) : null; },
    clearToken() { this._token = null; },
    hasToken() { return !!this._token; },
    isConfigured() { return !!this.baseUrl() && this.hasToken(); },

    /**
     * Generate a high-entropy access code (base64url, ~11 chars for 8 bytes).
     * Use this instead of a memorable PIN — the API rejects codes < 8 chars,
     * and this gives ~64 bits so there is no practical guessing attack even
     * before the server-side rate limit.
     */
    generateCode(bytes) {
        const n = Math.max(6, Number(bytes) || 8);
        const b = crypto.getRandomValues(new Uint8Array(n));
        let s = '';
        for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
        return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    },

    async _post(path, body) {
        if (!this.isConfigured()) {
            throw new Error('Portal API not configured — set the API base URL and operator token in Settings.');
        }
        let res;
        try {
            res = await fetch(this.baseUrl() + path, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + this._token
                },
                body: JSON.stringify(body)
            });
        } catch (e) {
            throw new Error('Could not reach the TBFS API. Check the base URL and your connection.');
        }
        let data = {};
        try { data = await res.json(); } catch (e) { /* non-JSON */ }
        if (!res.ok) {
            const reason = (data && data.error) ? data.error : (res.statusText || ('HTTP ' + res.status));
            throw new Error('API ' + res.status + ': ' + reason);
        }
        return data;
    },

    /** Store/refresh a client's statement + access-code hash server-side. */
    async publish(account, code, statement) {
        const data = await this._post('/v1/operator/publish', {
            account: String(account || ''),
            code: String(code || ''),
            statement: statement || {}
        });
        dbg('PortalAPI.publish ok', account);
        return data;
    },

    /** Remove a client's portal record (disables their login). */
    async revoke(account) {
        const data = await this._post('/v1/operator/revoke', { account: String(account || '') });
        dbg('PortalAPI.revoke ok', account);
        return data;
    },

    /** Liveness probe for the Settings "Test" button. */
    async health() {
        const base = this.baseUrl();
        if (!base) throw new Error('Set the API base URL first.');
        const res = await fetch(base + '/v1/health');
        if (!res.ok) throw new Error('Health check failed: HTTP ' + res.status);
        return res.json();
    }
};

if (typeof window !== 'undefined') window.PortalAPI = PortalAPI;
if (typeof module !== 'undefined' && module.exports) module.exports = PortalAPI;
