/**
 * TBFS App State Manager
 * Central state management for multi-page PWA
 * Handles localStorage persistence, cross-tab synchronization,
 * schema normalization, and restore-path validation.
 *
 * Version: 2.1.0 (Security remediation series)
 *
 * Canonical field names (F-09):
 *   - deployed          (legacy alias: deployedCapital — migrated on load)
 *   - transactions      (legacy alias: transactionHistory — merged on load)
 *
 * Derived values (F-06) — recomputed from records, never hand-incremented:
 *   - deployed          = Σ remaining_principal over ACTIVE loans
 *   - memberFundsHeld   = Σ (totalContributions + accumulatedBonus) over members
 */

function dbg(...args) { if (globalThis.TBFS_DEBUG) console.log(...args); }

class AppStateManager {
    static STORAGE_KEY = 'tbfsAppState';
    static VERSION = '1.9.0';
    static MAX_IMPORT_BYTES = 8 * 1024 * 1024; // 8 MB restore-file ceiling

    /**
     * Get default state structure
     */
    static getDefaultState() {
        return {
            // Financial Data
            capital: 0,
            deployed: 0,
            totalInterestEarned: 0,
            totalFeesEarned: 0,
            totalPenaltiesEarned: 0,
            profitGoal: 0,

            // Member-funds liability (derived): contributions + bonuses held
            // on behalf of stockvel members. Lendable funds are
            // capital − memberFundsHeld, not raw capital.
            memberFundsHeld: 0,

            // Loan Data
            loans: [],
            nextLoanId: 1,

            // Client Data
            clients: [],
            nextAccountNumber: 2025001,

            // Stockvel Data (v1.7.0+)
            stockvelMembers: [],
            stockvelReceipts: [],
            nextMemberNumber: 1001,

            // Transaction History (canonical name: transactions)
            transactions: [],

            // Payment Management (v1.8.0+)
            gracePeriodDays: 3,
            paymentReminders: [],

            // Metadata
            lastBackupDate: null,
            version: this.VERSION,
            createdDate: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };
    }

    /**
     * Coerce a value to a finite number, else fall back.
     */
    static num(value, fallback = 0) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    /**
     * Normalize any historical state shape onto the canonical schema (F-09).
     * - Migrates deployedCapital → deployed
     * - Merges transactionHistory → transactions (sorted by time)
     * - Guarantees arrays exist and counters are monotonic
     * Mutates and returns the given object.
     */
    static normalizeState(state) {
        const d = this.getDefaultState();

        // ---- Field-name migrations -------------------------------------
        if (state.deployed === undefined && state.deployedCapital !== undefined) {
            state.deployed = state.deployedCapital;
        }
        delete state.deployedCapital;

        const legacyTx = Array.isArray(state.transactionHistory) ? state.transactionHistory : [];
        const currentTx = Array.isArray(state.transactions) ? state.transactions : [];
        if (legacyTx.length) {
            const txTime = (t) => new Date(t?.timestamp || t?.date || 0).getTime() || 0;
            state.transactions = currentTx.concat(legacyTx)
                .sort((a, b) => txTime(a) - txTime(b));
        } else {
            state.transactions = currentTx;
        }
        delete state.transactionHistory;

        // totalProfit was a stored duplicate of interest+fees; it is derived.
        delete state.totalProfit;

        // ---- Numeric guards --------------------------------------------
        state.capital = this.num(state.capital, d.capital);
        state.deployed = this.num(state.deployed, d.deployed);
        state.totalInterestEarned = this.num(state.totalInterestEarned, 0);
        state.totalFeesEarned = this.num(state.totalFeesEarned, 0);
        state.totalPenaltiesEarned = this.num(state.totalPenaltiesEarned, 0);
        state.profitGoal = this.num(state.profitGoal, d.profitGoal);
        state.memberFundsHeld = this.num(state.memberFundsHeld, 0);
        state.gracePeriodDays = this.num(state.gracePeriodDays, d.gracePeriodDays);

        // ---- Arrays ------------------------------------------------------
        for (const key of ['loans', 'clients', 'stockvelMembers', 'stockvelReceipts',
                           'transactions', 'paymentReminders']) {
            if (!Array.isArray(state[key])) state[key] = [];
        }

        // ---- Monotonic counters (F-09: never derive IDs from length) ----
        const maxLoanId = state.loans.reduce(
            (max, l) => Math.max(max, this.num(l?.loan_id, 0)), 0);
        state.nextLoanId = Math.max(this.num(state.nextLoanId, 1), maxLoanId + 1);

        const maxMember = state.stockvelMembers.reduce(
            (max, m) => Math.max(max, this.num(m?.memberNumber, 0)), 0);
        state.nextMemberNumber = Math.max(
            this.num(state.nextMemberNumber, d.nextMemberNumber), maxMember + 1);

        state.nextAccountNumber = this.num(state.nextAccountNumber, d.nextAccountNumber);

        // ---- Metadata ----------------------------------------------------
        if (typeof state.version !== 'string') state.version = this.VERSION;
        if (typeof state.createdDate !== 'string') state.createdDate = d.createdDate;

        return state;
    }

    /**
     * Recompute derived totals from the underlying records (F-06).
     * Deployed capital and member-funds liability are always calculated,
     * never trusted from hand-maintained counters.
     */
    static recalculateDerivedTotals(state) {
        let deployed = 0;
        for (const loan of state.loans || []) {
            if (loan && loan.status === 'active') {
                deployed += Math.max(0, this.num(loan.remaining_principal,
                    this.num(loan.principal_amount, 0)));
            }
        }
        state.deployed = Math.round(deployed * 100) / 100;

        let memberFunds = 0;
        for (const m of state.stockvelMembers || []) {
            if (!m) continue;
            memberFunds += this.num(m.totalContributions, 0) + this.num(m.accumulatedBonus, 0);
        }
        state.memberFundsHeld = Math.round(memberFunds * 100) / 100;

        dbg(`📊 Derived totals — deployed: R${state.deployed.toFixed(2)}, ` +
            `member funds held: R${state.memberFundsHeld.toFixed(2)}`);
        return state;
    }

    /**
     * Back-compat alias for the previous helper name.
     */
    static recalculateDeployedCapital(state) {
        return this.recalculateDerivedTotals(state);
    }

    /**
     * Reserve and return the next loan ID (monotonic, collision-free).
     */
    static getNextLoanId(state) {
        this.normalizeState(state);
        const id = state.nextLoanId;
        state.nextLoanId = id + 1;
        return id;
    }

    /**
     * Load state from localStorage
     */
    static load() {
        let saved = null;
        try {
            saved = localStorage.getItem(this.STORAGE_KEY);

            if (!saved) {
                dbg('📦 No saved state found. Creating default state...');
                return this.getDefaultState();
            }

            const state = JSON.parse(saved);
            if (!state || typeof state !== 'object' || Array.isArray(state)) {
                throw new Error('Stored state is not an object');
            }

            const merged = { ...this.getDefaultState(), ...state };
            this.normalizeState(merged);
            this.recalculateDerivedTotals(merged);

            dbg('✅ State loaded successfully');
            return merged;

        } catch (error) {
            console.error('❌ Error loading state:', error);
            // Preserve the unreadable blob for manual recovery before
            // falling back — never silently discard the ledger.
            try {
                if (saved) {
                    localStorage.setItem(
                        this.STORAGE_KEY + '.corrupt.' + Date.now(), saved);
                }
            } catch (_) { /* quota — nothing more we can do */ }
            alert('Error loading data. A copy of the unreadable data was kept ' +
                  'in browser storage; using a fresh state for now.');
            return this.getDefaultState();
        }
    }

    /**
     * Save state to localStorage
     */
    static save(state) {
        try {
            state.lastModified = new Date().toISOString();
            state.version = this.VERSION;

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
            this.broadcastUpdate();

            dbg('💾 State saved successfully');
            return true;

        } catch (error) {
            console.error('❌ Error saving state:', error);
            if (error.name === 'QuotaExceededError') {
                alert('Storage quota exceeded! Please backup and clear old data.');
            } else {
                alert('Error saving data: ' + error.message);
            }
            return false;
        }
    }

    /**
     * Broadcast state update to other open tabs/windows
     */
    static broadcastUpdate() {
        window.dispatchEvent(new CustomEvent('appStateUpdated', {
            detail: { timestamp: Date.now() }
        }));
        // StorageEvent automatically fires in other tabs when localStorage changes
    }

    /**
     * Listen for state changes (from other tabs or same page)
     */
    static onUpdate(callback) {
        window.addEventListener('storage', (event) => {
            if (event.key === this.STORAGE_KEY) {
                dbg('🔄 State updated from another tab');
                callback();
            }
        });
        window.addEventListener('appStateUpdated', () => {
            dbg('🔄 State updated in current tab');
            callback();
        });
    }

    /**
     * Clear all data (use with caution!)
     */
    static clear() {
        if (confirm('⚠️ This will delete ALL data. Are you sure?\n\nThis action cannot be undone!')) {
            localStorage.removeItem(this.STORAGE_KEY);
            this.broadcastUpdate();
            dbg('🗑️ All data cleared');
            return true;
        }
        return false;
    }

    /**
     * Export state as JSON string (for backup)
     */
    static exportJSON(state) {
        return JSON.stringify(state, null, 2);
    }

    /**
     * Import state from a JSON string (F-08).
     * The ONLY sanctioned restore path: parses, normalizes, validates,
     * and throws with a readable reason on anything malformed.
     * Returns a normalized state object ready for save().
     */
    static importJSON(jsonString) {
        if (typeof jsonString !== 'string') {
            throw new Error('Backup must be provided as text');
        }
        if (jsonString.length > this.MAX_IMPORT_BYTES) {
            throw new Error('Backup file is unreasonably large — refusing to import');
        }

        let parsed;
        try {
            parsed = JSON.parse(jsonString);
        } catch (e) {
            throw new Error('Backup file is not valid JSON');
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Backup file does not contain a TBFS state object');
        }

        const merged = { ...this.getDefaultState(), ...parsed };
        this.normalizeState(merged);
        this.recalculateDerivedTotals(merged);

        const check = this.validate(merged);
        if (!check.valid) {
            throw new Error('Backup failed validation:\n• ' + check.issues.join('\n• '));
        }
        return merged;
    }

    /**
     * Get storage info (usage statistics)
     */
    static getStorageInfo() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        const bytes = saved ? new Blob([saved]).size : 0;
        const kb = (bytes / 1024).toFixed(2);
        const mb = (bytes / (1024 * 1024)).toFixed(2);

        return {
            bytes: bytes,
            kb: kb,
            mb: mb,
            readable: bytes < 1024 ? `${bytes} bytes` :
                     bytes < 1048576 ? `${kb} KB` :
                     `${mb} MB`
        };
    }

    /**
     * Validate state integrity (F-08).
     * Structural checks a restore must pass before it may be persisted.
     */
    static validate(state) {
        const issues = [];

        if (!state || typeof state !== 'object' || Array.isArray(state)) {
            return { valid: false, issues: ['State is not an object'] };
        }

        // Required numerics
        for (const key of ['capital', 'deployed', 'totalInterestEarned', 'totalFeesEarned']) {
            if (!Number.isFinite(state[key])) issues.push(`Invalid ${key} (not a finite number)`);
        }
        if (Number.isFinite(state.capital) && state.capital < 0) {
            issues.push('Capital is negative');
        }
        if (Number.isFinite(state.deployed) && state.deployed < 0) {
            issues.push('Deployed capital is negative');
        }

        // Required arrays
        for (const key of ['loans', 'clients', 'stockvelMembers', 'stockvelReceipts', 'transactions']) {
            if (!Array.isArray(state[key])) issues.push(`Invalid ${key} array`);
        }
        if (issues.length) return { valid: false, issues };

        // Loan integrity
        const seenIds = new Set();
        state.loans.forEach((loan, index) => {
            if (!loan || typeof loan !== 'object') {
                issues.push(`Loan ${index} is not an object`);
                return;
            }
            if (loan.loan_id === undefined || loan.loan_id === null) {
                issues.push(`Loan ${index} missing ID`);
            } else if (seenIds.has(loan.loan_id)) {
                issues.push(`Duplicate loan ID ${loan.loan_id}`);
            } else {
                seenIds.add(loan.loan_id);
            }
            const rp = Number(loan.remaining_principal);
            if (Number.isFinite(rp) && rp < 0) {
                issues.push(`Loan ${loan.loan_id} has negative balance`);
            }
            const term = Number(loan.term_months);
            if (loan.term_months !== undefined && (!Number.isFinite(term) || term < 1)) {
                issues.push(`Loan ${loan.loan_id} has invalid term`);
            }
        });

        // Grace period sanity
        if (!Number.isFinite(state.gracePeriodDays) ||
            state.gracePeriodDays < 0 || state.gracePeriodDays > 60) {
            issues.push('Invalid gracePeriodDays');
        }

        return { valid: issues.length === 0, issues };
    }
}

// Export for use in Node-based tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppStateManager;
}
