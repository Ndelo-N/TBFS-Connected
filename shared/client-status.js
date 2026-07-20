/**
 * TBFS Client Status — PIN access + encrypted public status packs.
 * Operator publishes ciphertext; clients decrypt with account + PIN.
 */
function dbg(...args) { if (globalThis.TBFS_DEBUG) console.log(...args); }

const ClientStatus = {
    PBKDF2_ITERATIONS: 210000,
    LOCAL_PREFIX: 'tbfsClientStatus.',
    /** sessionStorage key — PINs for this admin browser session only */
    PIN_VAULT_KEY: 'tbfsClientStatusPinVault',
    /**
     * Per-account publish drain promise + coalesced next job.
     * Overlapping callers share one drain; only the latest job runs each turn.
     */
    _publishDrain: Object.create(null),
    _publishCoalesce: Object.create(null),
    /** Public app repo used for GitHub Pages client-status/ files */
    statusRepoOwner: 'Ndelo-N',
    statusRepoName: 'TBFS-Connected',
    statusPathPrefix: 'client-status/',

    _sessionStore() {
        try {
            if (typeof sessionStorage !== 'undefined') return sessionStorage;
        } catch (e) { /* private mode / node */ }
        return null;
    },

    _readPinVault() {
        const store = this._sessionStore();
        if (!store) return {};
        try {
            const raw = store.getItem(this.PIN_VAULT_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            return {};
        }
    },

    _writePinVault(map) {
        const store = this._sessionStore();
        if (!store) return;
        try {
            store.setItem(this.PIN_VAULT_KEY, JSON.stringify(map || {}));
        } catch (e) {
            dbg('PIN vault write failed', e);
        }
    },

    rememberPin(account, pin) {
        const key = this.normalizeAccount(account);
        if (!key || !pin) return;
        const map = this._readPinVault();
        map[key] = String(pin);
        this._writePinVault(map);
    },

    getRememberedPin(account) {
        const key = this.normalizeAccount(account);
        if (!key) return null;
        const pin = this._readPinVault()[key];
        return pin ? String(pin) : null;
    },

    forgetPin(account) {
        const key = this.normalizeAccount(account);
        if (!key) return;
        const map = this._readPinVault();
        if (map[key] == null) return;
        delete map[key];
        this._writePinVault(map);
    },

    clearRememberedPins() {
        const store = this._sessionStore();
        if (!store) return;
        try { store.removeItem(this.PIN_VAULT_KEY); } catch (e) { /* ignore */ }
    },

    /**
     * Prefer explicit PIN; else session vault. Never returns empty.
     */
    resolvePin(client, pin) {
        const account = client && (client.account_number || client.accountNumber);
        const explicit = pin != null && String(pin) !== '' ? String(pin) : null;
        const resolved = explicit || this.getRememberedPin(account);
        if (!resolved) {
            throw new Error(
                'PIN needed once this session. Publish status (or set PIN) to remember it.'
            );
        }
        return resolved;
    },

    _b64(bytes) {
        if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
        let s = '';
        const b = new Uint8Array(bytes);
        for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
        return btoa(s);
    },
    _b64d(str) {
        if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(str, 'base64'));
        const s = atob(str);
        const b = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
        return b;
    },
    _hex(bytes) {
        return Array.from(new Uint8Array(bytes))
            .map(x => ('0' + x.toString(16)).slice(-2)).join('');
    },

    normalizeAccount(account) {
        return String(account || '').trim().toUpperCase();
    },

    async accountHash(account) {
        const norm = this.normalizeAccount(account);
        const dig = await crypto.subtle.digest(
            'SHA-256', new TextEncoder().encode('tbfs-client-status|' + norm));
        return this._hex(dig).slice(0, 32);
    },

    async _derivePinKey(pin, saltBytes) {
        const passKey = await crypto.subtle.importKey(
            'raw', new TextEncoder().encode(String(pin)),
            'PBKDF2', false, ['deriveBits']);
        const bits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: saltBytes,
                iterations: this.PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            passKey, 256);
        return crypto.subtle.importKey(
            'raw', bits, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    },

    async hashPin(pin) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const key = await this._derivePinKey(pin, salt);
        // Store a verification digest: encrypt a fixed probe under the PIN key
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key, new TextEncoder().encode('tbfs-pin-ok'));
        return {
            pin_salt: this._b64(salt),
            pin_hash: this._b64(new Uint8Array(ct)),
            pin_iv: this._b64(iv)
        };
    },

    async verifyPin(pin, access) {
        if (!access || !access.pin_salt || !access.pin_hash || !access.pin_iv) return false;
        try {
            const key = await this._derivePinKey(pin, this._b64d(access.pin_salt));
            const pt = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: this._b64d(access.pin_iv) },
                key, this._b64d(access.pin_hash));
            return new TextDecoder().decode(pt) === 'tbfs-pin-ok';
        } catch (e) {
            return false;
        }
    },

    async enableAccess(client, pin) {
        if (!client) throw new Error('Client required');
        if (!pin || String(pin).length < 4) throw new Error('PIN must be at least 4 characters');
        const hashed = await this.hashPin(pin);
        client.client_access = Object.assign({}, client.client_access || {}, {
            enabled: true,
            pin_salt: hashed.pin_salt,
            pin_hash: hashed.pin_hash,
            pin_iv: hashed.pin_iv,
            published_at: (client.client_access && client.client_access.published_at) || null,
            publish_id: (client.client_access && client.client_access.publish_id) || null
        });
        this.rememberPin(client.account_number || client.accountNumber, pin);
        return client.client_access;
    },

    /**
     * Disable portal access and revoke any published pack (local + remote when
     * Cloud Backup is unlocked). Async so callers can await remote delete.
     */
    async disableAccess(client, options) {
        if (!client) return { local: false, remote: false };
        this.forgetPin(client.account_number || client.accountNumber);
        const revoke = await this.revokePublishedStatus(client, options || {});
        client.client_access = Object.assign({}, client.client_access || {}, {
            enabled: false,
            published_at: null,
            publish_id: null
        });
        return revoke;
    },

    /**
     * Remove local envelope and delete GitHub status file when possible.
     */
    async revokePublishedStatus(client, options) {
        const result = { local: false, remote: false, path: null };
        if (!client) return result;
        const account = client.account_number || client.accountNumber;
        let hash = client.client_access && client.client_access.publish_id;
        if (!hash && account) {
            try { hash = await this.accountHash(account); } catch (e) { hash = null; }
        }
        if (!hash) return result;

        const localKey = this.LOCAL_PREFIX + hash;
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(localKey);
                result.local = true;
            }
        } catch (e) { /* ignore */ }

        const path = this.statusPathPrefix + hash + '.json';
        result.path = path;

        const Cloud = (typeof CloudBackup !== 'undefined') ? CloudBackup : null;
        if (!Cloud || !Cloud.isUnlocked || !Cloud.isUnlocked()) {
            if (options && options.requireRemote) {
                throw new Error(
                    'Unlock cloud backup to remove the remote published status pack.'
                );
            }
            return result;
        }

        const token = Cloud._token;
        const owner = this.statusRepoOwner;
        const repo = this.statusRepoName;
        const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        try {
            const getRes = await fetch(apiBase, {
                headers: {
                    Authorization: 'Bearer ' + token,
                    Accept: 'application/vnd.github.v3+json'
                }
            });
            if (getRes.status === 404) {
                return result;
            }
            if (!getRes.ok) {
                throw new Error('GitHub read failed: ' + getRes.status);
            }
            const existing = await getRes.json();
            const delRes = await fetch(apiBase, {
                method: 'DELETE',
                headers: {
                    Authorization: 'Bearer ' + token,
                    Accept: 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'Revoke client status ' + hash,
                    sha: existing.sha
                })
            });
            if (!delRes.ok) {
                const body = await delRes.text();
                throw new Error(
                    'GitHub delete failed: ' + delRes.status + ' ' + body.slice(0, 180)
                );
            }
            result.remote = true;
            dbg('Revoked client status', path);
        } catch (e) {
            if (options && options.requireRemote) throw e;
            dbg('revokePublishedStatus remote failed', e);
            result.error = (e && e.message) || String(e);
        }
        return result;
    },

    async encryptPack(pack, pin, saltB64) {
        const salt = saltB64
            ? this._b64d(saltB64)
            : crypto.getRandomValues(new Uint8Array(16));
        const key = await this._derivePinKey(pin, salt);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key, new TextEncoder().encode(JSON.stringify(pack)));
        const accountHash = await this.accountHash(pack.account_number);
        return {
            v: 1,
            accountHash,
            updatedAt: pack.published_at || new Date().toISOString(),
            salt: this._b64(salt),
            iv: this._b64(iv),
            ct: this._b64(new Uint8Array(ct))
        };
    },

    async decryptEnvelope(envelope, account, pin) {
        if (!envelope || !envelope.ct) throw new Error('Invalid status pack');
        const expected = await this.accountHash(account);
        if (envelope.accountHash && envelope.accountHash !== expected) {
            throw new Error('Account does not match status pack');
        }
        const key = await this._derivePinKey(pin, this._b64d(envelope.salt));
        const pt = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: this._b64d(envelope.iv) },
            key, this._b64d(envelope.ct));
        return JSON.parse(new TextDecoder().decode(pt));
    },

    saveLocalEnvelope(envelope) {
        if (!envelope || !envelope.accountHash) return;
        localStorage.setItem(this.LOCAL_PREFIX + envelope.accountHash, JSON.stringify(envelope));
    },

    removeLocalEnvelope(accountHash) {
        if (!accountHash) return;
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(this.LOCAL_PREFIX + accountHash);
            }
        } catch (e) { /* ignore */ }
    },

    loadLocalEnvelope(accountHash) {
        const raw = localStorage.getItem(this.LOCAL_PREFIX + accountHash);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch (e) { return null; }
    },

    /**
     * Serialize work per account. Overlapping callers share one drain and
     * coalesce to the newest job — never two concurrent GitHub PUTs for the
     * same account, and a later payment always rebuilds from latest AppState.
     *
     * After the coalesce queue looks empty, we yield a microtask so any
     * overlapping enqueue that raced the empty check still attaches to THIS
     * drain (instead of starting an unawaited follow-up drain).
     */
    _enqueueAccountPublish(account, jobFn) {
        const key = this.normalizeAccount(account);
        if (!key) return Promise.resolve(jobFn());

        this._publishCoalesce[key] = jobFn;

        if (this._publishDrain[key]) {
            return this._publishDrain[key];
        }

        const drain = (async () => {
            let lastResult = {
                ok: true,
                reason: 'superseded',
                pub: { superseded: true }
            };
            let lastError = null;
            for (;;) {
                while (this._publishCoalesce[key]) {
                    const fn = this._publishCoalesce[key];
                    this._publishCoalesce[key] = null;
                    try {
                        lastResult = await fn();
                        lastError = null;
                    } catch (err) {
                        lastError = err;
                    }
                }
                // Microtask checkpoint: overlapping callers can set coalesce and
                // still await this same drain promise.
                await Promise.resolve();
                if (!this._publishCoalesce[key]) break;
            }
            if (lastError) throw lastError;
            return lastResult;
        })();

        this._publishDrain[key] = drain;
        const clearDrain = () => {
            if (this._publishDrain[key] === drain) {
                this._publishDrain[key] = null;
            }
        };
        drain.then(clearDrain, clearDrain);

        return drain;
    },

    /**
     * Publish ciphertext: local always when Cloud Backup is locked;
     * when unlocked, remote must succeed before local is saved (no orphan packs).
     * Callers that need race-safety must go through _enqueueAccountPublish.
     */
    async publishEnvelope(envelope, opts) {
        const options = opts || {};
        const path = this.statusPathPrefix + envelope.accountHash + '.json';
        const result = { local: false, remote: false, path, url: null };

        const Cloud = (typeof CloudBackup !== 'undefined') ? CloudBackup : null;
        const cloudUnlocked = !!(Cloud && Cloud.isUnlocked && Cloud.isUnlocked());

        if (!cloudUnlocked) {
            if (options.requireRemote) {
                throw new Error('Unlock cloud backup (GitHub token) to publish for remote clients.');
            }
            this.saveLocalEnvelope(envelope);
            result.local = true;
            return result;
        }

        const token = Cloud._token;
        const owner = this.statusRepoOwner;
        const repo = this.statusRepoName;
        const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        let sha;
        const getRes = await fetch(apiBase, {
            headers: {
                Authorization: 'Bearer ' + token,
                Accept: 'application/vnd.github.v3+json'
            }
        });
        if (getRes.status === 200) {
            const existing = await getRes.json();
            sha = existing.sha;
        } else if (getRes.status !== 404) {
            throw new Error('GitHub read failed: ' + getRes.status);
        }

        const content = this._b64(new TextEncoder().encode(JSON.stringify(envelope, null, 2)));
        const putRes = await fetch(apiBase, {
            method: 'PUT',
            headers: {
                Authorization: 'Bearer ' + token,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Publish client status ' + envelope.accountHash + ' @ ' + envelope.updatedAt,
                content,
                sha: sha || undefined
            })
        });
        if (!putRes.ok) {
            const body = await putRes.text();
            throw new Error('GitHub publish failed: ' + putRes.status + ' ' + body.slice(0, 180));
        }

        this.saveLocalEnvelope(envelope);
        result.local = true;
        result.remote = true;
        result.url = this.publicUrlForHash(envelope.accountHash);
        dbg('Published client status', path);
        return result;
    },

    publicUrlForHash(accountHash) {
        // Same-origin relative path works on GitHub Pages after deploy.
        return 'client-status/' + accountHash + '.json';
    },

    portalUrl() {
        try {
            return new URL('client-portal.html', location.href).href;
        } catch (e) {
            return 'client-portal.html';
        }
    },

    async fetchEnvelope(account) {
        const hash = await this.accountHash(account);
        const candidates = [
            this.publicUrlForHash(hash),
            'https://ndelo-n.github.io/TBFS-Connected/client-status/' + hash + '.json',
            'https://raw.githubusercontent.com/Ndelo-N/TBFS-Connected/main/client-status/' + hash + '.json'
        ];
        for (let i = 0; i < candidates.length; i++) {
            try {
                const res = await fetch(candidates[i], { cache: 'no-store' });
                if (res.ok) return await res.json();
            } catch (e) { /* try next */ }
        }
        return this.loadLocalEnvelope(hash);
    },

    /**
     * Core publish (no queue). Prefer publishForClient / maybeAutoPublish.
     */
    async _publishForClientCore(client, state, pin, options) {
        if (!client || !client.client_access || !client.client_access.enabled) {
            throw new Error('Enable client access and set a PIN first.');
        }
        const resolvedPin = this.resolvePin(client, pin);
        const ok = await this.verifyPin(resolvedPin, client.client_access);
        if (!ok) {
            this.forgetPin(client.account_number || client.accountNumber);
            throw new Error('PIN incorrect.');
        }
        if (typeof Calculations === 'undefined' || !Calculations.buildClientStatusPack) {
            throw new Error('Calculations.buildClientStatusPack unavailable');
        }
        const opts = options || {};
        const account = client.account_number || client.accountNumber;
        // Build pack at execution time so queued jobs see the latest AppState.
        const pack = Calculations.buildClientStatusPack(client, state, opts);
        const envelope = await this.encryptPack(
            pack, resolvedPin, client.client_access.pin_salt);
        const pub = await this.publishEnvelope(envelope, opts);
        client.client_access.published_at = envelope.updatedAt;
        client.client_access.publish_id = envelope.accountHash;
        this.rememberPin(account, resolvedPin);
        return { pack, envelope, pub };
    },

    /**
     * Operator: build pack, encrypt with PIN, publish (queued per account).
     * PIN may be omitted when remembered for this browser session.
     */
    async publishForClient(client, state, pin, options) {
        const account = client && (client.account_number || client.accountNumber);
        return this._enqueueAccountPublish(account, () =>
            this._publishForClientCore(client, state, pin, options || {}));
    },

    /**
     * Enable PIN access and publish in one step. Rolls back enable on publish failure
     * so a later unrelated save cannot persist portal-enabled without a pack.
     */
    async enableAndPublish(client, state, pin, options) {
        if (!client) throw new Error('Client required');
        const prevAccess = client.client_access
            ? Object.assign({}, client.client_access)
            : null;
        await this.enableAccess(client, pin);
        try {
            return await this.publishForClient(client, state, pin, options || {});
        } catch (e) {
            if (prevAccess) {
                client.client_access = prevAccess;
            } else {
                client.client_access = { enabled: false };
            }
            this.forgetPin(client.account_number || client.accountNumber);
            try {
                const hash = await this.accountHash(
                    client.account_number || client.accountNumber);
                this.removeLocalEnvelope(hash);
            } catch (err) { /* ignore */ }
            throw e;
        }
    },

    /**
     * Silent republish after loan mutations. Never throws into caller UI.
     * Skips when access off or PIN not in session vault.
     * Queued + coalesced per account so overlapping payments cannot race
     * GitHub PUTs or leave a stale remote pack.
     */
    async maybeAutoPublish(client, state, options) {
        if (!client || !client.client_access || !client.client_access.enabled) {
            return { ok: false, reason: 'disabled' };
        }
        const account = client.account_number || client.accountNumber;
        if (!this.getRememberedPin(account)) {
            return { ok: false, reason: 'no_pin' };
        }
        try {
            const result = await this._enqueueAccountPublish(account, async () => {
                const published = await this._publishForClientCore(
                    client, state, null, options || {});
                return {
                    ok: true,
                    reason: 'published',
                    remote: !!(published.pub && published.pub.remote),
                    published_at: client.client_access.published_at,
                    pub: published.pub
                };
            });
            if (result && result.reason === 'superseded') {
                return { ok: true, reason: 'superseded' };
            }
            return result;
        } catch (e) {
            dbg('maybeAutoPublish failed', e);
            return { ok: false, reason: 'error', error: (e && e.message) || String(e) };
        }
    },

    formatAutoPublishNote(result) {
        if (!result) return '';
        if (result.ok) {
            return result.remote
                ? '\n\n📡 Portal updated (local + remote).'
                : '\n\n📡 Portal updated (local' +
                    (typeof CloudBackup !== 'undefined' && CloudBackup.isUnlocked &&
                        CloudBackup.isUnlocked()
                        ? ''
                        : '; unlock Cloud Backup for remote') + ').';
        }
        if (result.reason === 'no_pin') {
            return '\n\n📡 Portal not refreshed — Publish once to remember PIN this session.';
        }
        if (result.reason === 'disabled') return '';
        if (result.reason === 'error') {
            return '\n\n📡 Portal refresh failed: ' + (result.error || 'unknown error');
        }
        return '';
    },

    /**
     * Republish every portal-enabled client using session-remembered PINs.
     */
    async refreshAllPortalClients(state, options) {
        const clients = (state && state.clients) || [];
        const summary = {
            published: 0,
            skipped: 0,
            failed: 0,
            remote: 0,
            details: []
        };
        for (let i = 0; i < clients.length; i++) {
            const client = clients[i];
            if (!client || !client.client_access || !client.client_access.enabled) continue;
            const account = client.account_number || client.accountNumber || '?';
            if (!this.getRememberedPin(account)) {
                summary.skipped++;
                summary.details.push({ account, status: 'skipped', reason: 'no_pin' });
                continue;
            }
            try {
                const result = await this.publishForClient(client, state, null, options || {});
                summary.published++;
                if (result.pub && result.pub.remote) summary.remote++;
                summary.details.push({
                    account,
                    status: 'published',
                    remote: !!(result.pub && result.pub.remote)
                });
            } catch (e) {
                summary.failed++;
                summary.details.push({
                    account,
                    status: 'failed',
                    reason: (e && e.message) || String(e)
                });
            }
        }
        return summary;
    }
};

if (typeof window !== 'undefined') {
    window.ClientStatus = ClientStatus;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientStatus;
}
