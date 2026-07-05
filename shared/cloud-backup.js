/**
 * TBFS Cloud Backup — single shared implementation (F-12).
 * Loaded on EVERY page so auto-backup fires wherever state changes,
 * not only on the Settings page.
 *
 * Security model (F-05 / F-03 mitigations):
 *  - The GitHub PAT is encrypted at rest with AES-GCM-256. The key is
 *    derived from a user passphrase via PBKDF2 (310,000 iterations,
 *    SHA-256, random salt) and HKDF-split into an encryption key and a
 *    separate HMAC-SHA-256 signing key. Nothing sensitive persists in
 *    plaintext; the passphrase is entered once per page session.
 *  - Every backup is the FULL AppStateManager state (F-08's exportJSON
 *    shape), wrapped in a signed envelope:
 *        { format:'tbfs-backup', version:2, updatedAt, hmac, state }
 *    Restores verify the HMAC before anything touches local data, and
 *    always go through AppStateManager.importJSON — the only sanctioned
 *    restore path.
 *  - Uploads write latest.json AND an immutable snapshots/<timestamp>.json
 *    (the old scheme overwrote one file per day, so a corrupted state
 *    could destroy the same-day restore point).
 *  - A monotonic guard refuses to silently overwrite a remote backup that
 *    is NEWER than local state (multi-device safety).
 *
 * Version: 2.0.0 (security remediation series)
 */

const DEBUG = false;
function dbg(...args) { if (DEBUG) console.log(...args); }

const CloudBackup = {
    repoOwner: 'Ndelo-N',
    repoName: 'TBFS-Data-Backup',

    // Storage keys
    KEY_BLOB: 'tbfsBackupToken.v2',      // {v, salt, iv, ct} — encrypted PAT
    KEY_LEGACY: 'githubBackupToken',     // old btoa() token (migrated away)
    KEY_AUTO: 'autoBackupEnabled',
    KEY_SYNC: 'lastCloudSync',
    KEY_PENDING: 'pendingCloudBackup',
    KEY_CONFLICT: 'tbfsBackupConflict',

    PBKDF2_ITERATIONS: 310000,

    autoBackupEnabled: false,
    _token: null,        // in-memory only, per page session
    _encKey: null,
    _macKey: null,
    _debounceTimer: null,
    _hooked: false,

    /* =================== base64 helpers =================== */
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
            .map(x => x.toString(16).padStart(2, '0')).join('');
    },

    /* =================== key derivation =================== */
    async _deriveKeys(passphrase, saltBytes) {
        const subtle = crypto.subtle;
        const passKey = await subtle.importKey(
            'raw', new TextEncoder().encode(passphrase),
            'PBKDF2', false, ['deriveBits']);
        const master = await subtle.deriveBits(
            { name: 'PBKDF2', salt: saltBytes, iterations: this.PBKDF2_ITERATIONS, hash: 'SHA-256' },
            passKey, 256);
        const hkdfKey = await subtle.importKey('raw', master, 'HKDF', false, ['deriveKey']);
        const encKey = await subtle.deriveKey(
            { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0),
              info: new TextEncoder().encode('tbfs-token-enc') },
            hkdfKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
        const macKey = await subtle.deriveKey(
            { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0),
              info: new TextEncoder().encode('tbfs-payload-mac') },
            hkdfKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
        return { encKey, macKey };
    },

    /* =================== lifecycle =================== */
    init() {
        this.autoBackupEnabled = localStorage.getItem(this.KEY_AUTO) === 'true';
        this.updateUI();
        if (this.autoBackupEnabled) this.updateSyncTime();
        window.addEventListener('online', () => this.syncPendingBackups());
        this._hookSave();
        this._maybeInjectLockedChip();
    },

    hasToken() {
        return !!(localStorage.getItem(this.KEY_BLOB) || localStorage.getItem(this.KEY_LEGACY));
    },

    isUnlocked() {
        return !!(this._token && this._macKey);
    },

    /**
     * First-time setup (or re-setup): encrypt the PAT under a passphrase.
     * Removes the legacy btoa()-obfuscated token if present.
     */
    async setupToken(token, passphrase) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const keys = await this._deriveKeys(passphrase, salt);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ct = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            keys.encKey, new TextEncoder().encode(token));
        localStorage.setItem(this.KEY_BLOB, JSON.stringify({
            v: 2, salt: this._b64(salt), iv: this._b64(iv), ct: this._b64(ct)
        }));
        localStorage.removeItem(this.KEY_LEGACY);
        this._token = token;
        this._encKey = keys.encKey;
        this._macKey = keys.macKey;
        this.updateUI();
        dbg('🔐 Token encrypted and stored');
        return true;
    },

    /**
     * Unlock the session with the passphrase. If only a legacy btoa token
     * exists, the passphrase entered here becomes the new passphrase and
     * the token is migrated to encrypted storage in one step.
     * Returns true on success, false on a wrong passphrase.
     */
    async unlock(passphrase) {
        const blobRaw = localStorage.getItem(this.KEY_BLOB);
        if (!blobRaw) {
            const legacy = localStorage.getItem(this.KEY_LEGACY);
            if (!legacy) return false;
            // Migrate: decode the old obfuscated token, encrypt it properly.
            let token;
            try {
                token = decodeURIComponent(escape(atob(legacy)));
            } catch (e) {
                return false;
            }
            await this.setupToken(token, passphrase);
            dbg('🔁 Legacy token migrated to encrypted storage');
            return true;
        }
        // Only the CRYPTO lives in the try — a wrong passphrase surfaces as
        // an AES-GCM authentication failure here. UI work happens after, so
        // an unrelated error can never masquerade as a bad passphrase.
        let keys, pt;
        try {
            const blob = JSON.parse(blobRaw);
            keys = await this._deriveKeys(passphrase, this._b64d(blob.salt));
            pt = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: this._b64d(blob.iv) },
                keys.encKey, this._b64d(blob.ct));
        } catch (e) {
            return false;
        }
        this._token = new TextDecoder().decode(pt);
        this._encKey = keys.encKey;
        this._macKey = keys.macKey;
        this.updateUI();
        this._removeLockedChip();
        dbg('🔓 Backup unlocked for this session');
        return true;
    },

    lock() {
        this._token = null;
        this._encKey = null;
        this._macKey = null;
        this.updateUI();
    },

    removeToken() {
        localStorage.removeItem(this.KEY_BLOB);
        localStorage.removeItem(this.KEY_LEGACY);
        localStorage.removeItem(this.KEY_AUTO);
        localStorage.removeItem(this.KEY_PENDING);
        localStorage.removeItem(this.KEY_CONFLICT);
        this.autoBackupEnabled = false;
        this.lock();
    },

    setAutoBackup(enabled) {
        this.autoBackupEnabled = !!enabled;
        localStorage.setItem(this.KEY_AUTO, enabled ? 'true' : 'false');
        this.updateUI();
    },

    /* =================== payload signing =================== */
    async _sign(updatedAt, stateJson) {
        const sig = await crypto.subtle.sign(
            'HMAC', this._macKey,
            new TextEncoder().encode(updatedAt + '\n' + stateJson));
        return this._hex(sig);
    },

    async _verify(payload) {
        const stateJson = JSON.stringify(payload.state);
        const expected = await this._sign(payload.updatedAt, stateJson);
        return expected === payload.hmac;
    },

    /* =================== GitHub contents API =================== */
    async _getRemote(path) {
        const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${path}`;
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this._token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (res.status === 404) return { status: 404 };
        if (!res.ok) return { status: res.status };
        const fileData = await res.json();
        let parsed = null;
        try {
            parsed = JSON.parse(decodeURIComponent(escape(atob(fileData.content))));
        } catch (e) { /* unreadable remote — treated as legacy/opaque */ }
        return { status: 200, sha: fileData.sha, payload: parsed };
    },

    async _put(path, bodyObj, sha) {
        const url = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${path}`;
        const content = this._b64(new TextEncoder().encode(JSON.stringify(bodyObj, null, 2)));
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${this._token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Backup: ${new Date().toISOString()}`,
                content: content,
                sha: sha || undefined
            })
        });
        if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
    },

    /* =================== backup =================== */
    /**
     * Auto path: silently skips when disabled, locked, or offline
     * (offline queues a pending flag + background sync).
     * Manual path ({manual:true}): surfaces every obstacle to the user.
     */
    async backup(opts) {
        const manual = !!(opts && opts.manual);

        if (!this.hasToken()) {
            if (manual) alert('Configure your GitHub token first.');
            return false;
        }
        if (!manual && !this.autoBackupEnabled) return false;
        if (!this.isUnlocked()) {
            if (manual) alert('🔒 Unlock cloud backup with your passphrase first.');
            else this._maybeInjectLockedChip();
            return false;
        }
        if (!navigator.onLine) {
            localStorage.setItem(this.KEY_PENDING, 'true');
            if (typeof registerBackgroundSync === 'function') registerBackgroundSync();
            dbg('Offline: backup queued (background sync registered)');
            if (manual) alert('You are offline — the backup is queued and will sync when online.');
            return false;
        }

        const state = AppStateManager.load();
        const stateJson = JSON.stringify(state);
        const updatedAt = state.lastModified || new Date().toISOString();

        try {
            // Monotonic guard: never silently clobber a NEWER remote backup.
            const remote = await this._getRemote('latest.json');
            if (remote.status === 200 && remote.payload && remote.payload.updatedAt &&
                remote.payload.updatedAt > updatedAt) {
                localStorage.setItem(this.KEY_CONFLICT, remote.payload.updatedAt);
                if (manual) {
                    if (!confirm('⚠️ The cloud backup is NEWER than this device\'s data ' +
                                 `(cloud: ${remote.payload.updatedAt}).\n\n` +
                                 'Overwrite it with this device\'s data anyway?')) {
                        return false;
                    }
                } else {
                    dbg('⚠️ Remote backup newer than local — auto-backup skipped');
                    return false;
                }
            }
            localStorage.removeItem(this.KEY_CONFLICT);

            const envelope = {
                format: 'tbfs-backup',
                version: 2,
                updatedAt: updatedAt,
                hmac: await this._sign(updatedAt, stateJson),
                state: state
            };

            await this._put('latest.json', envelope, remote.status === 200 ? remote.sha : null);
            const snapName = 'snapshots/' + updatedAt.replace(/[:.]/g, '-') + '.json';
            await this._put(snapName, envelope, null);

            localStorage.setItem(this.KEY_SYNC, new Date().toISOString());
            localStorage.removeItem(this.KEY_PENDING);
            this.updateSyncTime();
            dbg('✅ Cloud backup successful');
            return true;
        } catch (error) {
            console.error('Cloud backup failed:', error);
            localStorage.setItem(this.KEY_PENDING, 'true');
            if (typeof registerBackgroundSync === 'function') registerBackgroundSync();
            if (manual) alert('❌ Cloud backup failed: ' + error.message);
            return false;
        }
    },

    async syncPendingBackups() {
        if (localStorage.getItem(this.KEY_PENDING) &&
            this.autoBackupEnabled && this.hasToken() && this.isUnlocked()) {
            dbg('🔄 Syncing pending backup...');
            const ok = await this.backup();
            if (ok) dbg('✅ Pending backup synced');
        }
    },

    /* =================== restore =================== */
    async restore() {
        if (!this.hasToken()) {
            alert('Please configure your GitHub token first in Settings');
            return;
        }
        if (!this.isUnlocked()) {
            alert('🔒 Unlock cloud backup with your passphrase first.');
            return;
        }
        try {
            const remote = await this._getRemote('latest.json');
            if (remote.status === 404) {
                alert('📥 No cloud backup found yet.\n\n' +
                      'Enable Auto-Backup or use "Backup Now" to create the first one.');
                return;
            }
            if (remote.status === 401) throw new Error('Authentication failed. Check your GitHub token.');
            if (remote.status === 403) throw new Error('Access denied. The token needs "Contents: Read and write" on the backup repository.');
            if (remote.status !== 200) throw new Error(`Unable to access cloud backup (Error ${remote.status}).`);
            if (!remote.payload) throw new Error('Cloud backup file is unreadable.');

            let stateJson;
            if (remote.payload.format === 'tbfs-backup' && remote.payload.version >= 2) {
                const ok = await this._verify(remote.payload);
                if (!ok) {
                    alert('❌ Backup signature check FAILED.\n\n' +
                          'The cloud file was not signed with this passphrase — it may ' +
                          'have been tampered with, or was created under a different ' +
                          'passphrase. Restore aborted.');
                    return;
                }
                stateJson = JSON.stringify(remote.payload.state);
            } else {
                // Legacy, unsigned backup (pre-remediation format)
                if (!confirm('⚠️ This cloud backup uses the older UNSIGNED format.\n\n' +
                             'Its integrity cannot be verified. Restore it anyway?')) {
                    return;
                }
                stateJson = JSON.stringify(remote.payload);
            }

            // F-08: the only sanctioned restore path — validates before saving.
            const imported = AppStateManager.importJSON(stateJson);
            AppStateManager.save(imported);

            alert('✅ Data restored from cloud successfully!\n\nReloading app...');
            setTimeout(() => location.reload(), 500);
        } catch (error) {
            alert('❌ Failed to restore from cloud: ' + error.message);
        }
    },

    /* =================== auto-backup hook =================== */
    _hookSave() {
        if (this._hooked || typeof AppStateManager === 'undefined') return;
        this._hooked = true;
        const self = this;
        const originalSave = AppStateManager.save.bind(AppStateManager);
        AppStateManager.save = function (state) {
            const result = originalSave(state);
            if (self.autoBackupEnabled && self.hasToken()) {
                clearTimeout(self._debounceTimer);
                self._debounceTimer = setTimeout(() => self.backup(), 1500);
            }
            return result;
        };
    },

    /* =================== UI (guarded — most ids exist only on Settings) === */
    updateUI() {
        if (typeof document === 'undefined') return;
        const show = (id, on) => {
            const el = document.getElementById(id);
            if (el) el.style.display = on ? (id === 'tokenConfigured' || id === 'cbkUnlockRow' || id === 'autoBackupStatus' ? 'block' : 'block') : 'none';
        };
        if (this.hasToken()) {
            show('tokenConfigured', true);
            show('cloudBackupSetup', false);
            show('cbkUnlockRow', !this.isUnlocked());
            const toggle = document.getElementById('autoBackupToggle');
            if (toggle) toggle.checked = this.autoBackupEnabled;
            show('autoBackupStatus', this.autoBackupEnabled);
        } else {
            show('tokenConfigured', false);
            show('cloudBackupSetup', true);
        }
    },

    updateSyncTime() {
        if (typeof document === 'undefined') return;
        const lastSync = localStorage.getItem(this.KEY_SYNC);
        const el = document.getElementById('lastSyncTime');
        if (!lastSync || !el) return;
        const diffMinutes = Math.floor((new Date() - new Date(lastSync)) / 60000);
        el.textContent = diffMinutes < 1 ? 'Just now'
            : diffMinutes < 60 ? `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
            : `${Math.floor(diffMinutes / 60)} hour${Math.floor(diffMinutes / 60) > 1 ? 's' : ''} ago`;
    },

    /* ---- minimal unlock chip for non-Settings pages ---- */
    _maybeInjectLockedChip() {
        if (typeof document === 'undefined') return;
        if (!this.autoBackupEnabled || !this.hasToken() || this.isUnlocked()) return;
        if (document.getElementById('cbkUnlockRow')) return;   // Settings has its own UI
        if (document.getElementById('cbkChip')) return;
        const chip = document.createElement('div');
        chip.id = 'cbkChip';
        chip.setAttribute('style',
            'position:fixed;bottom:14px;right:14px;z-index:3000;background:#2c3e50;color:#fff;' +
            'padding:10px 14px;border-radius:22px;font-size:13px;box-shadow:0 6px 20px rgba(0,0,0,.3);cursor:pointer;');
        chip.textContent = '🔒 Cloud backup locked — tap to unlock';
        chip.onclick = () => this._showChipDialog();
        const attach = () => document.body.appendChild(chip);
        if (document.body) attach();
        else document.addEventListener('DOMContentLoaded', attach);
    },
    _removeLockedChip() {
        if (typeof document === 'undefined') return;
        const chip = document.getElementById('cbkChip');
        if (chip) chip.remove();
        const dlg = document.getElementById('cbkChipDlg');
        if (dlg) dlg.remove();
    },
    _showChipDialog() {
        if (typeof document === 'undefined') return;
        if (document.getElementById('cbkChipDlg')) return;
        const wrap = document.createElement('div');
        wrap.id = 'cbkChipDlg';
        wrap.setAttribute('style',
            'position:fixed;inset:0;z-index:3001;background:rgba(0,0,0,.5);display:flex;' +
            'align-items:center;justify-content:center;padding:16px;');
        wrap.innerHTML =
            '<div style="background:#fff;border-radius:12px;max-width:360px;width:100%;padding:20px;">' +
            '<strong style="color:#2c3e50;">🔓 Unlock cloud backup</strong>' +
            '<p style="font-size:13px;color:#636e72;margin:6px 0 12px 0;">Enter your backup passphrase for this session.</p>' +
            '<input type="password" id="cbkChipPass" style="width:100%;padding:10px;border:2px solid #e0e6ed;border-radius:8px;font-size:15px;margin-bottom:8px;">' +
            '<p id="cbkChipMsg" style="color:#e74c3c;font-size:12px;min-height:14px;margin:0 0 10px 0;"></p>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
            '<button id="cbkChipCancel" style="padding:8px 14px;border:none;border-radius:8px;background:#e0e6ed;cursor:pointer;">Cancel</button>' +
            '<button id="cbkChipGo" style="padding:8px 14px;border:none;border-radius:8px;background:#27ae60;color:#fff;cursor:pointer;">Unlock</button>' +
            '</div></div>';
        document.body.appendChild(wrap);
        document.getElementById('cbkChipCancel').onclick = () => wrap.remove();
        document.getElementById('cbkChipGo').onclick = async () => {
            const pass = document.getElementById('cbkChipPass').value;
            if (!pass) return;
            const ok = await this.unlock(pass);
            if (ok) {
                wrap.remove();
                this._removeLockedChip();
                this.syncPendingBackups();
            } else {
                document.getElementById('cbkChipMsg').textContent = 'Wrong passphrase.';
            }
        };
        document.getElementById('cbkChipPass').focus();
    }
};

// Browser bootstrapping
if (typeof window !== 'undefined') {
    window.CloudBackup = CloudBackup;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CloudBackup.init());
    } else {
        CloudBackup.init();
    }
}

// Export for Node-based tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CloudBackup;
}
