#!/usr/bin/env node
/**
 * One-shot transform of calculator.html for the security patch series.
 *
 * F-09  loan_id via AppStateManager.getNextLoanId() — deleting or importing
 *       loans can no longer produce colliding IDs; loan creation logged to
 *       the canonical AppState.transactions.
 * dates Start-year via Calculations.resolveScheduleStartYear (a schedule
 *       cannot begin before disbursement).
 * F-07  Remaining hardcoded rates → Calculations.RATES / shared admin rule.
 * F-04  Client-controlled strings escaped in rendered markup; sanitize.js
 *       loaded.
 * F-06  Derived totals recalculated on acceptance.
 * F-17  Verbose logs gated behind DEBUG.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'calculator.html';
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

/* ---- sanitize.js + DEBUG gate ---------------------------------------- */
rep(`    <script src="shared/app-state.js"></script>
    <script src="shared/calculations.js"></script>`,
`    <script src="shared/sanitize.js"></script>
    <script src="shared/app-state.js"></script>
    <script src="shared/calculations.js"></script>`,
'sanitize tag');

rep(`    <!-- Page Logic -->
    <script>
        // Global state`,
`    <!-- Page Logic -->
    <script>
        // Verbose diagnostics are opt-in — client financial details must not
        // stream to the console in normal use. (F-17)
        const DEBUG = false;
        function dbg(...args) { if (DEBUG) console.log(...args); }

        // Global state`,
'DEBUG gate');

/* ---- start-year via shared resolver (both derivation sites) ----------- */
rep(`                const loanDateObj = loanDate ? new Date(\`\${loanDate}T12:00:00\`) : null;
                const startYear = (loanDateObj && !isNaN(loanDateObj.getTime()))
                    ? loanDateObj.getFullYear()
                    : new Date().getFullYear();`,
`                const loanDateObj = loanDate ? new Date(\`\${loanDate}T12:00:00\`) : null;
                // A schedule cannot start before disbursement: an earlier
                // calendar month means the NEXT occurrence of that month.
                const startYear = Calculations.resolveScheduleStartYear(
                    (loanDateObj && !isNaN(loanDateObj.getTime())) ? loanDateObj : new Date(),
                    startMonthIndex);`,
'calculateLoan start year');

rep(`                            const loanDateObj = loanData.loanDate ? new Date(\`\${loanData.loanDate}T12:00:00\`) : new Date();
                            const startYear = !isNaN(loanDateObj.getTime())
                                ? loanDateObj.getFullYear()
                                : new Date().getFullYear();`,
`                            const loanDateObj = loanData.loanDate ? new Date(\`\${loanData.loanDate}T12:00:00\`) : new Date();
                            const startYear = Calculations.resolveScheduleStartYear(
                                !isNaN(loanDateObj.getTime()) ? loanDateObj : new Date(),
                                loanData.startMonthIndex);`,
'acceptLoan expired-member start year');

/* ---- rates → RATES / shared rule (F-07) -------------------------------- */
rep(`                const initiationFee = principal <= currentSavings ? 0 : (principal - currentSavings) * 0.12;`,
    `                const initiationFee = principal <= currentSavings ? 0 : (principal - currentSavings) * Calculations.RATES.INITIATION_FEE_RATE;`,
    'stockvel schedule initiation');
rep(`(principal / term) * 0.10;`,
    `(principal / term) * Calculations.RATES.STOCKVEL_MIN_MONTHLY_RATE;`,
    'stockvel per-month minimum (both sites)');
rep(`                    let adminFee = 60; // Default R60`,
    `                    let adminFee = Calculations.RATES.ADMIN_FEE_STANDARD;`,
    'schedule admin base');
rep(`                        adminFee = 60 * (1 - effectiveRate);`,
    `                        adminFee = Calculations.RATES.ADMIN_FEE_STANDARD * (1 - effectiveRate);`,
    'schedule admin variable');

/* ---- F-09: collision-free loan IDs + creation log + derived totals ------ */
rep(`                loan_id: (AppState.loans || []).length + 1,`,
    `                loan_id: AppStateManager.getNextLoanId(AppState),`,
    'monotonic loan id');

rep(`            // Update capital
            AppState.capital = (AppState.capital || 0) - loanData.principal;
            AppState.deployed = (AppState.deployed || 0) + loanData.principal;
            
            // Save state
            AppStateManager.save(AppState);`,
`            // Update capital
            AppState.capital = (AppState.capital || 0) - loanData.principal;

            // Deployed capital is derived from the active book. (F-06)
            AppStateManager.recalculateDerivedTotals(AppState);

            // Log creation to the canonical transaction history (F-09)
            if (!AppState.transactions) AppState.transactions = [];
            AppState.transactions.push({
                id: Date.now(),
                type: 'loan_created',
                timestamp: new Date().toISOString(),
                description: 'Loan created \\u2014 ' + loan.client_name + ' (Loan #' + loan.loan_id + ')',
                details: {
                    loanId: loan.loan_id,
                    clientName: loan.client_name,
                    principal: loan.principal_amount,
                    termMonths: loan.term_months,
                    loanType: loan.loan_type
                }
            });

            // Save state
            AppStateManager.save(AppState);`,
'creation: derived totals + log');

/* ---- F-04: escape client-controlled strings ------------------------------ */
rep(`                    <strong>Client:</strong> \${loanData.firstName} \${loanData.lastName} | 
                    <strong>Account:</strong> \${loanData.accountNumber} | `,
`                    <strong>Client:</strong> \${esc(loanData.firstName)} \${esc(loanData.lastName)} | 
                    <strong>Account:</strong> \${esc(loanData.accountNumber)} | `,
'esc client info');

writeFileSync(FILE, src);
console.log(`Applied ${count} transforms to ${FILE}`);
