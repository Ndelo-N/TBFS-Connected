#!/usr/bin/env node
/**
 * One-shot transform of settings.html for the security patch series.
 *
 * F-12  Deletes the page-local CloudBackup implementation and the
 *       settings-only AppStateManager.save hook — the single shared
 *       module (shared/cloud-backup.js, loaded on every page) now owns
 *       backup, so payments recorded on other pages back up too.
 * F-05  saveToken() encrypts the PAT under a user passphrase
 *       (AES-GCM-256 via the shared module) instead of btoa();
 *       adds passphrase fields to the setup form and a session-unlock
 *       row when a token is configured.
 * F-08  restoreData() routes through AppStateManager.importJSON — the
 *       only sanctioned restore path — instead of saving raw JSON.
 * F-04  Payment-reminder log renders through esc(); sanitize.js loaded.
 * F-17  Verbose logs gated behind DEBUG.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'settings.html';
let src = readFileSync(FILE, 'utf8');
let count = 0;

function rep(from, to, label) {
    if (!src.includes(from)) {
        console.error(`MISSING PATTERN [${label}]`);
        process.exit(1);
    }
    src = src.split(from).join(to);
    count++;
}

function splice(startMarker, endMarker, replacement, label) {
    const s = src.indexOf(startMarker);
    if (s === -1) { console.error(`MISSING SPLICE START [${label}]`); process.exit(1); }
    const sol = src.lastIndexOf('\n', s) + 1;
    const e = src.indexOf(endMarker, s + startMarker.length);
    if (e === -1) { console.error(`MISSING SPLICE END [${label}]`); process.exit(1); }
    const eol = src.lastIndexOf('\n', e) + 1;
    src = src.slice(0, sol) + replacement + src.slice(eol);
    count++;
}

/* ---- F-17: gate logs (sweep BEFORE the gate exists) --------------------- */
const nLogs = (src.match(/console\.log\(/g) || []).length;
src = src.split('console.log(').join('dbg(');
console.log(`${nLogs} console.log sites gated`);

/* ---- script tags: sanitize + shared cloud-backup ------------------------ */
rep(`    <script src="shared/app-state.js"></script>
    <script src="shared/calculations.js"></script>`,
`    <script src="shared/sanitize.js"></script>
    <script src="shared/app-state.js"></script>
    <script src="shared/calculations.js"></script>
    <script src="shared/cloud-backup.js"></script>`,
'sanitize + cloud-backup tags');

/* ---- DEBUG gate ---------------------------------------------------------- */
rep(`        let waitingServiceWorker = null;`,
`        // Verbose diagnostics are opt-in. (F-17)
        const DEBUG = false;
        function dbg(...args) { if (DEBUG) console.log(...args); }

        let waitingServiceWorker = null;`,
'DEBUG gate');

/* ---- UI: session-unlock row inside tokenConfigured ----------------------- */
rep(`                <div class="checkbox-container">
                    <input type="checkbox" id="autoBackupToggle" onchange="toggleAutoBackup()">`,
`                <div id="cbkUnlockRow" style="display: none; padding: 15px; border-radius: 10px; margin-bottom: 20px; background: #fff8e6; border: 2px solid #f39c12;">
                    <strong style="color: #b9770e;">&#128274; Session locked</strong>
                    <p style="margin: 5px 0 10px 0; font-size: 14px; color: #2c3e50;">
                        Enter your backup passphrase to unlock cloud backup for this session.
                        (First time after updating? The passphrase you enter here becomes your
                        passphrase and your token is upgraded to encrypted storage.)
                    </p>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <input type="password" id="cbkUnlockPass" placeholder="Backup passphrase"
                               style="flex: 1; min-width: 180px; font-family: monospace; font-size: 14px;">
                        <button class="btn btn-primary" onclick="unlockBackup()">&#128275; Unlock</button>
                    </div>
                    <p id="cbkUnlockMsg" style="font-size: 12px; color: #e74c3c; margin-top: 6px; min-height: 14px;"></p>
                </div>

                <div class="checkbox-container">
                    <input type="checkbox" id="autoBackupToggle" onchange="toggleAutoBackup()">`,
'unlock row');

/* ---- UI: passphrase fields in the setup form ------------------------------ */
rep(`                <div class="form-group">
                    <label for="backupRepoUrl">Backup Repository URL:</label>`,
`                <div class="form-group">
                    <label for="backupPassphrase">Backup passphrase (new):</label>
                    <input type="password" id="backupPassphrase" placeholder="Choose a passphrase"
                           style="font-family: monospace; font-size: 14px;">
                    <p style="font-size: 12px; color: #636e72; margin-top: 5px;">
                        &#128273; Encrypts your token on this device (AES-256) and signs your
                        cloud backups. Entered once per session. If forgotten, remove the
                        token and set up again with a fresh fine-grained PAT.
                    </p>
                </div>

                <div class="form-group">
                    <label for="backupPassphrase2">Confirm passphrase:</label>
                    <input type="password" id="backupPassphrase2" placeholder="Repeat passphrase"
                           style="font-family: monospace; font-size: 14px;">
                </div>

                <div class="form-group">
                    <label for="backupRepoUrl">Backup Repository URL:</label>`,
'passphrase fields');

/* ---- delete the page-local CloudBackup object (F-12) ---------------------- */
splice(
'const CloudBackup = {',
'         * Save GitHub token',
`        // The CloudBackup implementation lives in shared/cloud-backup.js
        // (single source of truth, loaded on every page). (F-12)

        /**
`,
'delete local CloudBackup');

/* ---- saveToken: passphrase-encrypted setup (F-05) -------------------------- */
splice(
'function saveToken() {',
'         * Remove GitHub token',
`        async function saveToken() {
            const token = document.getElementById('githubToken').value.trim();
            const pass = document.getElementById('backupPassphrase').value;
            const pass2 = document.getElementById('backupPassphrase2').value;

            if (!token) {
                alert('Please enter your GitHub token');
                return;
            }
            if (!token.startsWith('github_pat_') && !token.startsWith('ghp_')) {
                alert('Invalid token format. Token should start with "github_pat_" or "ghp_"');
                return;
            }
            if (!pass || pass.length < 8) {
                alert('Choose a backup passphrase of at least 8 characters.');
                return;
            }
            if (pass !== pass2) {
                alert('The passphrases do not match.');
                return;
            }

            // Encrypt the token under the passphrase (AES-GCM-256; key via
            // PBKDF2 310k iterations) and keep it unlocked for this session.
            await CloudBackup.setupToken(token, pass);

            document.getElementById('githubToken').value = '';
            document.getElementById('backupPassphrase').value = '';
            document.getElementById('backupPassphrase2').value = '';

            alert('✅ Token encrypted and saved!\\n\\n' +
                  '💡 Enable "Auto-Backup" if this device should sync changes to ' +
                  'cloud automatically. You will enter the passphrase once per session.');
        }

        /**
         * Unlock cloud backup for this session (F-05)
         */
        async function unlockBackup() {
            const pass = document.getElementById('cbkUnlockPass').value;
            const msg = document.getElementById('cbkUnlockMsg');
            if (!pass) { msg.textContent = 'Enter your passphrase.'; return; }
            const ok = await CloudBackup.unlock(pass);
            if (ok) {
                document.getElementById('cbkUnlockPass').value = '';
                msg.textContent = '';
                CloudBackup.updateUI();
                CloudBackup.syncPendingBackups();
            } else {
                msg.textContent = 'Wrong passphrase.';
            }
        }

        /**
         * Remove GitHub token
`,
'saveToken + unlockBackup');

/* ---- removeToken: delegate to the module ------------------------------------ */
splice(
'function removeToken() {',
'function toggleAutoBackup() {',
`        function removeToken() {
            if (!confirm('Remove GitHub token? You won\\'t be able to backup or restore from cloud until you add it again.')) {
                return;
            }
            CloudBackup.removeToken();
            alert('Token removed.');
        }

        /**
         * Toggle auto-backup on this device
         */
`,
'removeToken');

/* ---- toggleAutoBackup: unlock-aware ------------------------------------------ */
splice(
'function toggleAutoBackup() {',
'async function restoreFromCloud() {',
`        function toggleAutoBackup() {
            const box = document.getElementById('autoBackupToggle');

            if (box.checked) {
                if (!CloudBackup.isUnlocked()) {
                    alert('🔒 Unlock cloud backup with your passphrase first, then enable auto-backup.');
                    box.checked = false;
                    return;
                }
                CloudBackup.setAutoBackup(true);
                CloudBackup.backup({ manual: true });
                alert('✅ Auto-backup enabled! Changes on any page will sync to cloud ' +
                      'while the session is unlocked.');
            } else {
                if (confirm('Disable auto-backup on this device? You can still restore from cloud anytime.')) {
                    CloudBackup.setAutoBackup(false);
                    alert('Auto-backup disabled. You can still restore from cloud anytime.');
                } else {
                    box.checked = true;
                }
            }
        }

        /**
         * Restore from cloud
         */
        `,
'toggleAutoBackup');

/* ---- restoreData: importJSON is the only restore path (F-08) ------------------ */
splice(
'const data = JSON.parse(e.target.result);',
"alert('✅ Data restored successfully",
`                        // F-08: the ONLY sanctioned restore path — parse,
                        // normalize, and VALIDATE before anything is saved.
                        // Malformed or corrupt files throw with the reason.
                        const restored = AppStateManager.importJSON(e.target.result);
                        AppStateManager.save(restored);
                        
`,
'restoreData → importJSON');

/* ---- delete the settings-only save hook (F-12) --------------------------------- */
splice(
'// Hook into AppStateManager.save to trigger cloud backup',
'// Initialize on page load',
`        // Cloud auto-backup now hooks AppStateManager.save inside
        // shared/cloud-backup.js (loaded on every page), so payments and
        // other mutations back up too — not only settings-page saves. (F-12)

`,
'delete save hook');

/* ---- clearAllData: also clear the encrypted-token keys --------------------------- */
rep(`                localStorage.removeItem('githubBackupToken');
                localStorage.removeItem('autoBackupEnabled');`,
`                localStorage.removeItem('githubBackupToken');
                localStorage.removeItem('tbfsBackupToken.v2');
                localStorage.removeItem('autoBackupEnabled');
                localStorage.removeItem('lastCloudSync');
                localStorage.removeItem('pendingCloudBackup');
                localStorage.removeItem('tbfsBackupConflict');`,
'clearAllData keys');

/* ---- F-04: escape the payment-reminder log --------------------------------------- */
rep('<strong style="color: #2c3e50;">\${r.clientName} (Loan #\${r.loanId})</strong>',
    '<strong style="color: #2c3e50;">\${esc(r.clientName)} (Loan #\${esc(r.loanId)})</strong>',
    'esc reminder client');
rep('font-size: 11px; font-weight: 600;">\${r.method}</span>',
    'font-size: 11px; font-weight: 600;">\${esc(r.method)}</span>',
    'esc reminder method');
rep('<em>Notes: \${r.notes}</em>',
    '<em>Notes: \${esc(r.notes)}</em>',
    'esc reminder notes');
rep('<strong>Response:</strong> \${r.clientResponse}',
    '<strong>Response:</strong> \${esc(r.clientResponse)}',
    'esc reminder response');

writeFileSync(FILE, src);
console.log(`Applied ${count} transforms to ${FILE}`);
