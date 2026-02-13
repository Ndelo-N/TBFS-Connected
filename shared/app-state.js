/**
 * TBFS App State Manager
 * Central state management for multi-page PWA
 * Handles localStorage persistence and cross-tab synchronization
 * 
 * Version: 2.0.0 (Multi-Page Architecture)
 */

class AppStateManager {
    static STORAGE_KEY = 'tbfsAppState';
    static VERSION = '1.7.5';
    
    /**
     * Get default state structure
     */
    static getDefaultState() {
        return {
            // Financial Data
            capital: 0,
            deployedCapital: 0,
            totalInterestEarned: 0,
            totalFeesEarned: 0,
            totalProfit: 0,
            profitGoal: 0,
            
            // Loan Data
            loans: [],
            nextLoanId: 1,
            
            // Client Data
            clients: [],
            
            // Stockvel Data (v1.7.0+)
            stockvelMembers: [],
            stockvelReceipts: [],
            nextMemberNumber: 1001,
            
            // Transaction History
            transactions: [],
            
            // Payment Management (v1.8.0+)
            gracePeriodDays: 3,           // Days after due date before penalty applies
            paymentReminders: [],          // Log of payment reminders sent
            
            // Metadata
            lastBackupDate: null,
            version: this.VERSION,
            createdDate: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };
    }
    
    /**
     * Load state from localStorage
     */
    static load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            
            if (!saved) {
                console.log('📦 No saved state found. Creating default state...');
                return this.getDefaultState();
            }
            
            const state = JSON.parse(saved);
            console.log('✅ State loaded successfully');
            
            // Ensure all required fields exist (backwards compatibility)
            const defaultState = this.getDefaultState();
            const mergedState = { ...defaultState, ...state };
            
            // Ensure arrays exist
            mergedState.loans = mergedState.loans || [];
            mergedState.clients = mergedState.clients || [];
            mergedState.stockvelMembers = mergedState.stockvelMembers || [];
            mergedState.stockvelReceipts = mergedState.stockvelReceipts || [];
            mergedState.transactions = mergedState.transactions || [];
            mergedState.paymentReminders = mergedState.paymentReminders || [];
            if (typeof mergedState.gracePeriodDays !== 'number') mergedState.gracePeriodDays = 3;
            
            return mergedState;
            
        } catch (error) {
            console.error('❌ Error loading state:', error);
            alert('Error loading data. Using default state.');
            return this.getDefaultState();
        }
    }
    
    /**
     * Save state to localStorage
     */
    static save(state) {
        try {
            // Update last modified timestamp
            state.lastModified = new Date().toISOString();
            
            // Save to localStorage
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
            
            // Broadcast change to other tabs/windows
            this.broadcastUpdate();
            
            console.log('💾 State saved successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Error saving state:', error);
            
            // Check if quota exceeded
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
        // Dispatch custom event for same-window listeners
        window.dispatchEvent(new CustomEvent('appStateUpdated', {
            detail: { timestamp: Date.now() }
        }));
        
        // StorageEvent automatically fires in other tabs when localStorage changes
        // No need to manually dispatch it
    }
    
    /**
     * Listen for state changes (from other tabs or same page)
     */
    static onUpdate(callback) {
        // Listen for updates from other tabs
        window.addEventListener('storage', (event) => {
            if (event.key === this.STORAGE_KEY) {
                console.log('🔄 State updated from another tab');
                callback();
            }
        });
        
        // Listen for updates from same page
        window.addEventListener('appStateUpdated', () => {
            console.log('🔄 State updated in current tab');
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
            console.log('🗑️ All data cleared');
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
     * Import state from JSON string (for restore)
     */
    static importJSON(jsonString) {
        try {
            const state = JSON.parse(jsonString);
            
            // Validate basic structure
            if (!state.loans || !state.clients) {
                throw new Error('Invalid data structure');
            }
            
            return state;
            
        } catch (error) {
            console.error('❌ Error importing JSON:', error);
            throw new Error('Invalid backup file format');
        }
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
     * Validate state integrity
     */
    static validate(state) {
        const issues = [];
        
        // Check required fields
        if (typeof state.capital !== 'number') issues.push('Invalid capital');
        if (!Array.isArray(state.loans)) issues.push('Invalid loans array');
        if (!Array.isArray(state.clients)) issues.push('Invalid clients array');
        if (!Array.isArray(state.stockvelMembers)) issues.push('Invalid stockvelMembers array');
        
        // Check for data consistency
        if (state.deployedCapital > state.capital) {
            issues.push('Deployed capital exceeds total capital');
        }
        
        // Check loan integrity
        state.loans.forEach((loan, index) => {
            if (!loan.loan_id) issues.push(`Loan ${index} missing ID`);
            if (loan.remaining_principal < 0) issues.push(`Loan ${loan.loan_id} has negative balance`);
        });
        
        return {
            valid: issues.length === 0,
            issues: issues
        };
    }
    
    /**
     * Recalculate deployed capital from active loans
     * Fixes accumulated errors
     */
    static recalculateDeployedCapital(state) {
        let deployed = 0;
        
        state.loans.forEach(loan => {
            if (loan.status === 'active' && loan.remaining_principal > 0) {
                deployed += loan.remaining_principal;
            }
        });
        
        state.deployedCapital = Math.round(deployed * 100) / 100;
        console.log(`📊 Recalculated deployed capital: R${state.deployedCapital.toFixed(2)}`);
        
        return state;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppStateManager;
}
