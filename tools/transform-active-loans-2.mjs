#!/usr/bin/env node
/**
 * Pass 2 of the active-loans.html transform (run after pass 1).
 * Sweeps the sites the first pass's anchors did not cover:
 *  - residual hardcoded rates → Calculations.RATES (F-07)
 *  - getStockvelAdminFee() delegates to the shared rule (F-16)
 *  - early-payoff and loan-adjustment logs write to the canonical
 *    AppState.transactions (F-09), with derived totals refreshed after
 *    an early payoff (F-06)
 *  - the two remaining transactionHistory READS consolidated onto
 *    transactions (the load-time normalizer merges legacy data there),
 *    with an id-dedupe guard in the adjustment-timeline reader.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'active-loans.html';
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

/* ---- residual rates ---------------------------------------------------- */
rep(`                            const tbfsIncome = balance * Calculations.RATES.INCOME_TABLE_RATE;
                            const adminFee = 60;`,
`                            const tbfsIncome = balance * Calculations.RATES.INCOME_TABLE_RATE;
                            const adminFee = Calculations.RATES.ADMIN_FEE_STANDARD;`,
'recalc admin fee');

rep('principalPerMonth * 0.10;',
    'principalPerMonth * Calculations.RATES.STOCKVEL_MIN_MONTHLY_RATE;',
    'breakdown minimum (both sites)');

rep(`                let adminPayment = 60;`,
    `                let adminPayment = Calculations.RATES.ADMIN_FEE_STANDARD;`,
    'breakdown admin base');
rep(`                    adminPayment = 60 * (1 - effectiveRate);`,
    `                    adminPayment = Calculations.RATES.ADMIN_FEE_STANDARD * (1 - effectiveRate);`,
    'breakdown admin variable');

rep(`const totalInitiationFee = loan.total_initiation_fee || (originalPrincipal * 0.12);`,
    `const totalInitiationFee = loan.total_initiation_fee || (originalPrincipal * Calculations.RATES.INITIATION_FEE_RATE);`,
    'adjust initiation fallback');
rep(`            let adminFee = 60;`,
    `            let adminFee = Calculations.RATES.ADMIN_FEE_STANDARD;`,
    'adjust admin fee (both sites)');
rep(`newTotalInitiationFee = newPrincipal <= totalContributions ? 0 : (newPrincipal - totalContributions) * 0.12;`,
    `newTotalInitiationFee = newPrincipal <= totalContributions ? 0 : (newPrincipal - totalContributions) * Calculations.RATES.INITIATION_FEE_RATE;`,
    'increase stockvel initiation');
rep(`newTotalInitiationFee = newPrincipal * 0.12;`,
    `newTotalInitiationFee = newPrincipal * Calculations.RATES.INITIATION_FEE_RATE;`,
    'increase standard initiation');

/* ---- shared admin-fee rule --------------------------------------------- */
rep(`        function getStockvelAdminFee(totalContributions) {
            if (totalContributions >= 20000) return 45;
            if (totalContributions >= 10000) return 50;
            return 60;
        }`,
`        function getStockvelAdminFee(totalContributions) {
            // Shared rule — single source of truth (F-16)
            return Calculations.getAdminFeeForContributions(totalContributions);
        }`,
'admin-fee helper delegates');

/* ---- early payoff: canonical log + derived totals ----------------------- */
rep(`                AppState.totalFeesEarned = (AppState.totalFeesEarned || 0) + payoffData.initiationFeeOwed + payoffData.adminFeesOwed;`,
`                AppState.totalFeesEarned = (AppState.totalFeesEarned || 0) + payoffData.initiationFeeOwed + payoffData.adminFeesOwed;

                // Deployed capital is derived from the active book. (F-06)
                AppStateManager.recalculateDerivedTotals(AppState);`,
'payoff derived totals');

rep(`                if (!AppState.transactionHistory) AppState.transactionHistory = [];
                AppState.transactionHistory.push({
                    type: 'early_payoff',`,
`                if (!AppState.transactions) AppState.transactions = [];
                AppState.transactions.push({
                    id: Date.now(),
                    type: 'early_payoff',
                    description: 'Early payoff \\u2014 ' + loan.client_name + ' (Loan #' + loan.loan_id + ')',`,
'payoff transactions push');

/* ---- adjustment log: canonical field ------------------------------------ */
rep(`            // Legacy global history
            if (!Array.isArray(AppState.transactionHistory)) AppState.transactionHistory = [];
            AppState.transactionHistory.push({
                id,
                type: 'loan_adjustment',`,
`            // Global transaction log (canonical field — F-09)
            if (!Array.isArray(AppState.transactions)) AppState.transactions = [];
            AppState.transactions.push({
                id,
                type: 'loan_adjustment',
                description: 'Loan adjustment \\u2014 ' + loan.client_name + ' (Loan #' + loan.loan_id + ')',`,
'adjustment transactions push');

/* ---- reads consolidated on the canonical field --------------------------- */
rep(`            const paymentEvents = [
                ...(Array.isArray(AppState.transactionHistory) ? AppState.transactionHistory : []),
                ...(Array.isArray(AppState.transactions) ? AppState.transactions : [])
            ].filter(t => t && t.type === 'payment');`,
`            // Legacy transactionHistory is merged into transactions at load
            // time by the state normalizer. (F-09)
            const paymentEvents = (Array.isArray(AppState.transactions) ? AppState.transactions : [])
                .filter(t => t && t.type === 'payment');`,
'revenue reader');

rep(`            // 2) Legacy: AppState.transactionHistory (older shape)
            (Array.isArray(AppState.transactionHistory) ? AppState.transactionHistory : []).forEach(tx => {
                if (!tx || tx.type !== 'loan_adjustment') return;
                const details = tx.details || {};
                if (details.loanId !== loanId) return;
`,
`            // 2) Global log — adjustment events recorded before loan-local
            // history existed (legacy records were merged in at load time).
            (Array.isArray(AppState.transactions) ? AppState.transactions : []).forEach(tx => {
                if (!tx || tx.type !== 'loan_adjustment') return;
                const details = tx.details || {};
                if (details.loanId !== loanId) return;
                const txId = tx.id || details.id;
                if (txId && events.some(e2 => e2.id === txId)) return; // already in loan-local history
`,
'adjustment timeline reader');

writeFileSync(FILE, src);
console.log(`Pass 2: applied ${count} transforms to ${FILE}`);
