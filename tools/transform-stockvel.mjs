#!/usr/bin/env node
/**
 * One-shot transform of stockvel.html for the security patch series.
 * Single-line changes use exact-match rep(); multi-line surgeries use
 * line-anchored splices. Aborts loudly on any missing anchor.
 *
 * F-06  Member cash flows now move capital: contributions (incl. initial
 *       contribution on registration) raise it, bonus/contribution payouts
 *       lower it with sufficiency guards, and memberFundsHeld is
 *       recalculated after every mutation. The hardcoded 10% bonus on
 *       manual 'loan_payment' receipts fabricated liability — removed
 *       (the real bonus rule runs in Active Loans makePayment).
 * bug   payoutBonus zeroed the ENTIRE accrued bonus regardless of the
 *       amount actually paid — now subtracts only the paid amount.
 * dates renewMembership formatted via toISOString(), shifting SAST dates
 *       back a day — now uses the shared timezone-safe rule.
 * F-09  Receipts, payouts, and registrations log to the canonical
 *       AppState.transactions.
 * F-04  Member names, phones, account numbers, and notes escaped in every
 *       rendered template; sanitize.js loaded.
 * F-17  Verbose logs gated behind DEBUG.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'stockvel.html';
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

/** Replace from the start of the line containing startMarker up to (not
 *  including) the start of the line containing endMarker. */
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

/* ---- F-17: gate verbose logs (sweep BEFORE the gate is inserted) ------ */
const nLogs = (src.match(/console\.log\(/g) || []).length;
src = src.split('console.log(').join('dbg(');
console.log(`${nLogs} console.log sites gated`);

/* ---- sanitize.js + DEBUG gate ------------------------------------------ */
rep(`    <script src="shared/app-state.js"></script>
    <script src="shared/calculations.js"></script>`,
`    <script src="shared/sanitize.js"></script>
    <script src="shared/app-state.js"></script>
    <script src="shared/calculations.js"></script>`,
'sanitize tag');

rep(`    <script>
        // Global state
        let AppState = {};`,
`    <script>
        // Verbose diagnostics are opt-in — member financial details must not
        // stream to the console in normal use. (F-17)
        const DEBUG = false;
        function dbg(...args) { if (DEBUG) console.log(...args); }

        // Global state
        let AppState = {};`,
'DEBUG gate');

/* ---- F-04: escape member-controlled strings in every template ---------- */
rep('<option value="\${m.memberNumber}">\${m.name} (Member #\${m.memberNumber})</option>',
    '<option value="\${m.memberNumber}">\${esc(m.name)} (Member #\${m.memberNumber})</option>',
    'esc member options');
rep('<td>\${member.name || \'Unknown\'}</td>',
    '<td>\${esc(member.name || \'Unknown\')}</td>',
    'esc registry name');
rep('<td><strong style="color: #667eea;">\${member.account_number || member.phone || \'N/A\'}</strong></td>',
    '<td><strong style="color: #667eea;">\${esc(member.account_number || member.phone || \'N/A\')}</strong></td>',
    'esc registry account');
rep('<td>\${member.phone || \'N/A\'}</td>',
    '<td>\${esc(member.phone || \'N/A\')}</td>',
    'esc registry phone');
rep('<div><strong>Name:</strong> \${member.name}</div>',
    '<div><strong>Name:</strong> \${esc(member.name)}</div>',
    'esc lookup name');
rep('<div><strong>Account #:</strong> \${member.account_number || member.phone || \'N/A\'}</div>',
    '<div><strong>Account #:</strong> \${esc(member.account_number || member.phone || \'N/A\')}</div>',
    'esc lookup account');
rep('<div><strong>Phone:</strong> \${member.phone || \'N/A\'}</div>',
    '<div><strong>Phone:</strong> \${esc(member.phone || \'N/A\')}</div>',
    'esc lookup phone');
rep('<td>\${receipt.memberName} (#\${receipt.memberNumber})</td>',
    '<td>\${esc(receipt.memberName)} (#\${receipt.memberNumber})</td>',
    'esc receipt member (both tables)');
rep('<td>\${receipt.notes || \'-\'}</td>',
    '<td>\${esc(receipt.notes || \'-\')}</td>',
    'esc receipt notes (both tables)');
rep('<h4>⚠️ \${member.name} (Member #\${member.memberNumber})</h4>',
    '<h4>⚠️ \${esc(member.name)} (Member #\${member.memberNumber})</h4>',
    'esc renewal heading');
rep('<td><strong>\${member.name}</strong> (#\${member.memberNumber})</td>',
    '<td><strong>\${esc(member.name)}</strong> (#\${member.memberNumber})</td>',
    'esc report name (both reports)');

/* ---- F-06: recordReceipt — cash moves with the receipt type ------------- */
splice(
'// Update member based on type',
'// Create receipt',
`            // Update member based on type
            switch (type) {
                case 'contribution':
                    newTotal = previousTotal + amount;
                    member.totalContributions = newTotal;
                    // Cash received: capital rises; the matching liability
                    // (memberFundsHeld) is recalculated below. (F-06)
                    AppState.capital = (AppState.capital || 0) + amount;
                    break;

                case 'loan_payment':
                    // Loan payments are processed on the Active Loans page,
                    // where the real bonus rule runs and capital moves; this
                    // manual receipt is a record only. The previous hardcoded
                    // 10% bonus fabricated liability and has been removed.
                    break;

                case 'bonus_payout':
                    if (amount > previousBonus) {
                        alert('❌ Cannot payout more than accumulated bonus!');
                        return;
                    }
                    if (amount > (AppState.capital || 0)) {
                        alert('❌ Insufficient capital on hand for this payout!');
                        return;
                    }
                    newBonus = previousBonus - amount;
                    member.accumulatedBonus = newBonus;
                    // Cash paid out. (F-06)
                    AppState.capital = (AppState.capital || 0) - amount;
                    break;

                case 'adjustment':
                    // Book correction to the liability only — no cash moves.
                    newTotal = previousTotal + amount; // Can be negative for deductions
                    member.totalContributions = Math.max(0, newTotal);
                    break;
            }

`,
'recordReceipt switch');

splice(
'// Ensure receipts array exists',
'// Success message',
`            // Ensure receipts array exists
            if (!AppState.stockvelReceipts) AppState.stockvelReceipts = [];
            AppState.stockvelReceipts.push(receipt);

            // Member funds held is derived from the registry. (F-06)
            AppStateManager.recalculateDerivedTotals(AppState);

            // Canonical transaction log (F-09)
            if (!AppState.transactions) AppState.transactions = [];
            AppState.transactions.push({
                id: receipt.id,
                type: 'stockvel_receipt',
                timestamp: new Date().toISOString(),
                description: 'Stockvel receipt (' + type + ') \\u2014 ' + member.name,
                details: { memberNumber: memberNumber, memberName: member.name, receiptType: type, amount: amount }
            });

            // Save state
            AppStateManager.save(AppState);

`,
'recordReceipt log + derived totals');

/* ---- F-06: payoutContributions — guard, cash out, log ------------------- */
rep(`            if (!confirm(\`💰 Payout ALL contributions to \${member.name}?\\n\\nAmount: \${Calculations.formatCurrency(currentContributions)}\\n\\n⚠️ This will reset their contribution total to zero.\`)) {
                return;
            }`,
`            if (!confirm(\`💰 Payout ALL contributions to \${member.name}?\\n\\nAmount: \${Calculations.formatCurrency(currentContributions)}\\n\\n⚠️ This will reset their contribution total to zero.\`)) {
                return;
            }

            if (currentContributions > (AppState.capital || 0)) {
                alert('❌ Insufficient capital on hand for this payout!');
                return;
            }`,
'contribution payout guard');

splice(
'// Reset contributions to zero',
'// Save receipt',
`            // Reset contributions to zero
            member.totalContributions = 0;

            // Cash paid out; member funds held recalculated below. (F-06)
            AppState.capital = (AppState.capital || 0) - currentContributions;
            AppStateManager.recalculateDerivedTotals(AppState);

            // Canonical transaction log (F-09)
            if (!AppState.transactions) AppState.transactions = [];
            AppState.transactions.push({
                id: receipt.id,
                type: 'stockvel_payout',
                timestamp: new Date().toISOString(),
                description: 'Contribution payout \\u2014 ' + member.name,
                details: { memberNumber: memberNumber, memberName: member.name, amount: currentContributions }
            });

`,
'contribution payout cash + log');

/* ---- F-06 + bugfix: payoutBonus — guards, subtract-only, cash out, log --- */
rep(`            if (!confirm(\`💰 Payout bonus to \${member.name}?\\n\\nAmount: \${Calculations.formatCurrency(amount)}\`)) {
                return;
            }`,
`            if (!confirm(\`💰 Payout bonus to \${member.name}?\\n\\nAmount: \${Calculations.formatCurrency(amount)}\`)) {
                return;
            }

            if (!(amount > 0)) {
                alert('❌ No bonus amount to pay out.');
                return;
            }
            if (amount > (member.accumulatedBonus || 0)) {
                alert('❌ Cannot payout more than accumulated bonus!');
                return;
            }
            if (amount > (AppState.capital || 0)) {
                alert('❌ Insufficient capital on hand for this payout!');
                return;
            }`,
'bonus payout guards');

splice(
`// Update member
            member.accumulatedBonus = 0;`,
'// Save receipt',
`            // Update member — subtract only the paid amount; any remainder
            // stays accrued (previously this zeroed the whole balance
            // regardless of the amount actually paid).
            member.accumulatedBonus = Math.max(0, (member.accumulatedBonus || 0) - amount);

            // Cash paid out; member funds held recalculated below. (F-06)
            AppState.capital = (AppState.capital || 0) - amount;
            AppStateManager.recalculateDerivedTotals(AppState);

            // Canonical transaction log (F-09)
            if (!AppState.transactions) AppState.transactions = [];
            AppState.transactions.push({
                id: receipt.id,
                type: 'stockvel_payout',
                timestamp: new Date().toISOString(),
                description: 'Bonus payout \\u2014 ' + member.name,
                details: { memberNumber: memberNumber, memberName: member.name, amount: amount }
            });

`,
'bonus payout fix + cash + log');

/* ---- F-06: registration — initial contribution is cash in --------------- */
rep(`            // If initial contribution > 0, create receipt
            if (initialContrib > 0) {`,
`            // If initial contribution > 0, create receipt
            if (initialContrib > 0) {
                // Cash received on registration; the matching liability
                // (memberFundsHeld) is recalculated below. (F-06)
                AppState.capital = (AppState.capital || 0) + initialContrib;`,
'registration cash in');

splice(
`notes: 'Initial contribution upon registration',`,
'alert(`✅ Member Registered Successfully!',
`                    notes: 'Initial contribution upon registration',
                    previousTotal: 0,
                    newTotal: initialContrib,
                    bonusAmount: 0
                });
            }

            // Member funds held is derived from the registry. (F-06)
            AppStateManager.recalculateDerivedTotals(AppState);

            // Canonical transaction log (F-09)
            if (!AppState.transactions) AppState.transactions = [];
            AppState.transactions.push({
                id: Date.now(),
                type: 'stockvel_receipt',
                timestamp: new Date().toISOString(),
                description: 'Member registered \\u2014 ' + name + ' (#' + memberNumber + ')',
                details: { memberNumber: memberNumber, memberName: name, initialContribution: initialContrib }
            });

            // Save state
            AppStateManager.save(AppState);

            // Success message
`,
'registration log + derived totals');

/* ---- dates: renewal via the shared timezone-safe rule -------------------- */
rep(`            // Extend end date by 12 months
            const currentEnd = new Date(member.membershipEndDate);
            const newEnd = new Date(
                currentEnd.getFullYear() + 1,
                currentEnd.getMonth(),
                currentEnd.getDate()
            );
            member.membershipEndDate = newEnd.toISOString().split('T')[0];`,
`            // Extend end date by 12 months (shared, timezone-safe rule —
            // toISOString() shifted SAST dates back a day)
            member.membershipEndDate = Calculations.calculateMembershipEndDate(member.membershipEndDate);
            const newEnd = new Date(member.membershipEndDate + 'T12:00:00');`,
'renewal date rule');

writeFileSync(FILE, src);
console.log(`Applied ${count} transforms to ${FILE}`);
