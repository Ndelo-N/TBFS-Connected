#!/usr/bin/env node
/**
 * One-shot transform of active-loans.html for the security patch series.
 * Single-line changes use exact-match rep(); the three large surgeries use
 * line-anchored splices (start-of-line to start-of-line) so incidental
 * trailing whitespace cannot break the patch. Aborts loudly on any miss.
 *
 * F-13  In-page payment form (amount + date + live allocation preview)
 *       replaces the prompt()/prompt() flow.
 * F-02  Waterfall routed through Calculations.allocateScheduledPayment
 *       (interest cap enforced); partial payments no longer consume a
 *       whole installment; first-half overpayment recalculation now
 *       propagates into the remaining schedule entries.
 * F-06  markAsDefaulted recalculates derived totals; penalty income
 *       tracked in totalPenaltiesEarned.
 * F-07  Remaining hardcoded rates → Calculations.RATES / shared helpers.
 * F-09  Payments log to canonical AppState.transactions.
 * F-04  Client-controlled strings escaped in rendered markup.
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

/* ---- T1: load sanitize.js ------------------------------------------- */
rep(
`    <script src="shared/app-state.js"></script>
    <script src="shared/calculations.js"></script>`,
`    <script src="shared/sanitize.js"></script>
    <script src="shared/app-state.js"></script>
    <script src="shared/calculations.js"></script>`,
'sanitize tag');

/* ---- T2: escape client-controlled strings (F-04) --------------------- */
rep('<h4>Loan #${loan.loan_id} - ${loan.client_name}</h4>',
    '<h4>Loan #${esc(loan.loan_id)} - ${esc(loan.client_name)}</h4>',
    'esc card heading');

/* ---- T3: schedule start-year via shared resolver ---------------------- */
rep(
`                const loanDate = loan.created_at ? new Date(loan.created_at) : new Date();
                const currentYear = loanDate.getFullYear();`,
`                const loanDate = loan.created_at ? new Date(loan.created_at) : new Date();
                // A schedule cannot start before disbursement: an earlier
                // calendar month means the NEXT occurrence of that month.
                const currentYear = Calculations.resolveScheduleStartYear(loanDate, startMonthIndex);`,
'start-year resolver');

/* ---- T4: rates → RATES / shared helpers (F-07) ------------------------ */
rep('= balance * 0.10;', '= balance * Calculations.RATES.STOCKVEL_MIN_MONTHLY_RATE;', 'stockvel 10% minimum (all sites)');
rep('= balance * 0.30;', '= balance * Calculations.RATES.INCOME_TABLE_RATE;', 'income-table 30% (all sites)');
rep('const minimumCharge = remainingBalance * 0.10;',
    'const minimumCharge = remainingBalance * Calculations.RATES.STOCKVEL_MIN_MONTHLY_RATE;',
    'bonus minimum charge');
rep('adminFee = 60)', 'adminFee = Calculations.RATES.ADMIN_FEE_STANDARD)', 'outstanding-interest admin default');
rep(`                    const totalInitiationFee = principal <= totalContributions ? 0 : (principal - totalContributions) * 0.12;`,
    `                    const totalInitiationFee = principal <= totalContributions ? 0 : (principal - totalContributions) * Calculations.RATES.INITIATION_FEE_RATE;`,
    'schedule stockvel initiation');
rep(`                    // Calculate admin fee (reduced for stockvel based on contributions)
                    let adminFee = 60; // Default
                    if (totalContributions >= 20000) adminFee = 45;
                    else if (totalContributions >= 10000) adminFee = 50;`,
`                    // Admin fee (reduced for stockvel) — shared rule (F-07/F-16)
                    const adminFee = Calculations.getAdminFeeForContributions(totalContributions);`,
'schedule stockvel admin fee');
rep(`                        const adminFee = 60;
                        const initiationFee = (principal * 0.12) / term;`,
`                        const adminFee = Calculations.RATES.ADMIN_FEE_STANDARD;
                        const initiationFee = (principal * Calculations.RATES.INITIATION_FEE_RATE) / term;`,
'fallback schedule rates');
rep(`loan.total_initiation_fee = principal <= loan.total_contributions ? 0 : (principal - loan.total_contributions) * 0.12;`,
    `loan.total_initiation_fee = principal <= loan.total_contributions ? 0 : (principal - loan.total_contributions) * Calculations.RATES.INITIATION_FEE_RATE;`,
    'makePayment stockvel initiation');
rep(`loan.total_initiation_fee = principal * 0.12;`,
    `loan.total_initiation_fee = principal * Calculations.RATES.INITIATION_FEE_RATE;`,
    'makePayment standard initiation');
rep(`const totalFees = loan.total_initiation_fee + (60 * loan.term_months); // Admin fees`,
    `const totalFees = loan.total_initiation_fee + (Calculations.RATES.ADMIN_FEE_STANDARD * loan.term_months); // Admin fees`,
    'makePayment estimated fees');

/* ---- T5: schedule finders include partially-paid entries -------------- */
rep(`loan.schedule.find(p => p.status === 'pending');`,
    `loan.schedule.find(p => p.status === 'pending' || p.status === 'partial');`,
    'pending finder (both sites)');
rep(`schedule.find(p => p && p.status === 'pending') || null;`,
    `schedule.find(p => p && (p.status === 'pending' || p.status === 'partial')) || null;`,
    'helper finder');

/* ---- T6: prompt()/prompt() flow → payment modal (F-13) ---------------- */
splice(
'const penaltyLine = latePenalty > 0',
'// STEP 9: PAYMENT ALLOCATION (WATERFALL METHOD)',
`            // F-13: a structured in-page form replaces the prompt() flow.
            // The confirmed input arrives via processPayment().
            openPaymentModal({
                loanId, loan,
                expectedPayment, remainingPrincipal, remainingInterest,
                remainingInitiationFee, latePenalty, daysLate, isPaymentLate,
                gracePeriodDays, nextDueDate,
                paymentsMade: loan.payments_made || 0
            });
        }

        /* ==========================================================
         * F-13: Payment modal — state, preview, and confirmation
         * ========================================================== */
        let paymentModalCtx = null;

        /** Effective (still-owed) dues on a schedule entry, net of any
         *  partial payments already recorded against it. */
        function getEntryEffectiveDues(entry) {
            const paid = (entry && entry.paid_breakdown) || {};
            const eff = (due, done) => Math.max(0, (Number(due) || 0) - (Number(done) || 0));
            return {
                initiation_fee: eff(entry.initiation_fee, paid.initiation),
                admin_fee: eff(entry.admin_fee, paid.admin),
                interest_payment: eff(entry.interest_payment, paid.interest),
                principal_payment: eff(entry.principal_payment, paid.principal)
            };
        }

        function interestCapRemainingFor(loan) {
            return Number.isFinite(loan.max_interest_allowed)
                ? Math.max(0, loan.max_interest_allowed - (loan.interest_paid || 0))
                : Infinity;
        }

        function openPaymentModal(ctx) {
            paymentModalCtx = ctx;
            const loan = ctx.loan;
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('pmTitle').textContent = 'Payment — Loan #' + loan.loan_id;
            document.getElementById('pmClient').textContent = loan.client_name || '';
            document.getElementById('pmSummary').innerHTML =
                '<div class="info-row"><span>Expected monthly:</span><strong>' + esc(Calculations.formatCurrency(ctx.expectedPayment)) + '</strong></div>' +
                '<div class="info-row"><span>Remaining principal:</span><strong>' + esc(Calculations.formatCurrency(ctx.remainingPrincipal)) + '</strong></div>' +
                '<div class="info-row"><span>Remaining interest:</span><strong>' + esc(Calculations.formatCurrency(ctx.remainingInterest)) + '</strong></div>' +
                '<div class="info-row"><span>Remaining initiation fee:</span><strong>' + esc(Calculations.formatCurrency(ctx.remainingInitiationFee)) + '</strong></div>' +
                (ctx.latePenalty > 0
                    ? '<div class="info-row"><span>\\u26A0\\uFE0F Late penalty (' + esc(ctx.daysLate) + ' days late, ' + esc(ctx.gracePeriodDays) + '-day grace):</span><strong>' + esc(Calculations.formatCurrency(ctx.latePenalty)) + '</strong></div>'
                    : '') +
                '<div class="info-row"><span>Payments made:</span><strong>' + esc(ctx.paymentsMade) + '/' + esc(loan.term_months) + '</strong></div>';
            const amountInput = document.getElementById('pmAmount');
            amountInput.value = ctx.expectedPayment ? Number(ctx.expectedPayment).toFixed(2) : '';
            document.getElementById('pmDate').value = today;
            document.getElementById('pmError').textContent = '';
            updatePaymentPreview();
            document.getElementById('paymentModal').style.display = 'flex';
            amountInput.focus();
            amountInput.select();
        }

        function closePaymentModal() {
            paymentModalCtx = null;
            document.getElementById('paymentModal').style.display = 'none';
        }

        function updatePaymentPreview() {
            if (!paymentModalCtx) return;
            const loan = paymentModalCtx.loan;
            const amount = parseFloat(document.getElementById('pmAmount').value);
            const preview = document.getElementById('pmPreview');
            if (!amount || isNaN(amount) || amount <= 0) {
                preview.innerHTML = '<em>Enter an amount to preview the allocation.</em>';
                return;
            }
            const entry = loan.schedule && loan.schedule.find(p => p.status === 'pending' || p.status === 'partial');
            if (!entry) {
                preview.innerHTML = '<em>No pending installment on the schedule.</em>';
                return;
            }
            const alloc = Calculations.allocateScheduledPayment(amount, {
                entry: getEntryEffectiveDues(entry),
                latePenaltyDue: paymentModalCtx.latePenalty,
                interestCapRemaining: interestCapRemainingFor(loan),
                remainingPrincipal: loan.remaining_principal
            });
            const line = (label, v) => v > 0
                ? '<div class="info-row"><span>' + label + ':</span><strong>' + esc(Calculations.formatCurrency(v)) + '</strong></div>'
                : '';
            preview.innerHTML =
                line('Initiation fee', alloc.initiationPaid) +
                line('Admin fee', alloc.adminPaid) +
                line('Late penalty', alloc.penaltyPaid) +
                line('Interest', alloc.interestPaid) +
                line('Principal', alloc.principalPaid) +
                (alloc.unallocated > 0
                    ? '<div class="info-row"><span>Extra (overpayment):</span><strong>' + esc(Calculations.formatCurrency(alloc.unallocated)) + '</strong></div>'
                    : '') +
                '<div class="info-row" style="border-top:1px solid #dfe6ee;margin-top:6px;padding-top:6px;"><span>Total:</span><strong>' + esc(Calculations.formatCurrency(amount)) + '</strong></div>';
        }

        function confirmPaymentModal() {
            if (!paymentModalCtx) return;
            const errEl = document.getElementById('pmError');
            const amount = parseFloat(document.getElementById('pmAmount').value);
            if (!amount || isNaN(amount) || amount <= 0) {
                errEl.textContent = '\\u274C Enter a valid payment amount.';
                return;
            }
            const dateVal = document.getElementById('pmDate').value;
            if (!dateVal) {
                errEl.textContent = '\\u274C Choose a payment date.';
                return;
            }
            const ctx = paymentModalCtx;
            closePaymentModal();
            processPayment(ctx, amount, dateVal);
        }

        /**
         * Apply a confirmed payment — the original makePayment flow from the
         * point where user input has been collected. (F-13)
         */
        function processPayment(ctx, amount, paymentDateInput) {
            const loan = ctx.loan;
            const loanId = ctx.loanId;
            let nextDueDate = ctx.nextDueDate;
            const latePenalty = ctx.latePenalty;
            const daysLate = ctx.daysLate;
            const gracePeriodDays = ctx.gracePeriodDays;
            const expectedPayment = ctx.expectedPayment;

            // Parse payment date (input[type=date] supplies YYYY-MM-DD);
            // local midday avoids timezone date-shift edge cases.
            let paymentDate;
            try {
                paymentDate = new Date(paymentDateInput + 'T12:00:00');
                if (isNaN(paymentDate.getTime())) throw new Error('Invalid date');
                paymentDate = paymentDate.toISOString();
            } catch (error) {
                alert('\\u274C Invalid payment date!');
                return;
            }

`,
'prompt flow → modal + processPayment');

/* ---- T7: waterfall via the shared engine (F-02/F-16) ------------------ */
splice(
'// STEP 11: ALLOCATE PAYMENT USING WATERFALL METHOD',
'// STEP 12: HANDLE OVERPAYMENT',
`            // STEP 11: ALLOCATE VIA THE SHARED WATERFALL (F-02/F-16)
            // initiation → admin → late penalty → interest → principal,
            // interest clamped to max_interest_allowed, all against the
            // entry's EFFECTIVE dues (net of prior partial payments).
            const alloc = Calculations.allocateScheduledPayment(remainingAmount, {
                entry: getEntryEffectiveDues(nextPayment),
                latePenaltyDue: latePenalty,
                interestCapRemaining: interestCapRemainingFor(loan),
                remainingPrincipal: loan.remaining_principal
            });
            initiationFeePaid = alloc.initiationPaid;
            adminFeePaid = alloc.adminPaid;
            latePenaltyPaid = alloc.penaltyPaid;
            interestPaid = alloc.interestPaid;
            principalPaid = alloc.principalPaid;
            remainingAmount = alloc.unallocated;

`,
'waterfall → shared allocation');

/* ---- T8: second-half extra interest respects the cap ------------------ */
rep(
`                    // Apply to remaining interest balance
                    const remainingInterest = Math.max(0, (loan.total_interest || 0) - (loan.interest_paid || 0));`,
`                    // Apply to remaining interest balance (never beyond the
                    // loan's interest cap — F-02)
                    const capLeft = Math.max(0, interestCapRemainingFor(loan) - interestPaid);
                    const remainingInterest = Math.min(
                        Math.max(0, (loan.total_interest || 0) - (loan.interest_paid || 0)), capLeft);`,
'second-half interest cap');

/* ---- T9: partial payments recorded honestly (STEP 13) ----------------- */
splice(
'// STEP 13: UPDATE PAYMENT SCHEDULE ENTRY',
'// Track total principal received',
`            // STEP 13: UPDATE PAYMENT SCHEDULE ENTRY
            // Record what this payment covered on the entry; mark it 'paid'
            // only once its dues are fully met — a partial payment no longer
            // silently consumes a whole installment. (F-02 fold-in)
            const pb = nextPayment.paid_breakdown = nextPayment.paid_breakdown || {};
            pb.initiation = Calculations.round((pb.initiation || 0) + initiationFeePaid);
            pb.admin = Calculations.round((pb.admin || 0) + adminFeePaid);
            pb.interest = Calculations.round((pb.interest || 0) + interestPaid);
            pb.principal = Calculations.round((pb.principal || 0) + principalPaid);
            nextPayment.payment_date = paymentDate;
            nextPayment.amount_paid = Calculations.round((nextPayment.amount_paid || 0) + amount);
            const duesLeft = getEntryEffectiveDues(nextPayment);
            // Interest owed on the entry is only claimable up to the cap.
            const claimableInterestLeft = Math.min(duesLeft.interest_payment, interestCapRemainingFor(loan));
            const entryCovered = (duesLeft.initiation_fee + duesLeft.admin_fee +
                claimableInterestLeft + duesLeft.principal_payment) <= 0.01;
            nextPayment.status = entryCovered ? 'paid' : 'partial';
            nextPayment.partial_payment = !entryCovered;

`,
'partial-payment schedule entry');

/* ---- T10: completion sweep includes partial entries -------------------- */
rep(
`                loan.schedule.forEach(payment => {
                    if (payment.status === 'pending') {
                        payment.status = 'paid';
                    }
                });`,
`                loan.schedule.forEach(payment => {
                    if (payment.status === 'pending' || payment.status === 'partial') {
                        payment.status = 'paid';
                    }
                });`,
'completion sweep');

/* ---- T11: propagate recalculated interest into the schedule ------------ */
rep(
`                    loan.max_interest_allowed = newMaxInterest;
                    loan.expected_monthly_interest = newMaxInterest / loan.term_months;`,
`                    loan.max_interest_allowed = newMaxInterest;
                    loan.expected_monthly_interest = newMaxInterest / loan.term_months;

                    // Propagate the recalculated interest into the remaining
                    // schedule entries so future allocations and displays use
                    // the reduced figures. (F-02 fold-in)
                    const openEntries = loan.schedule.filter(p => p.status !== 'paid');
                    if (openEntries.length > 0) {
                        const perEntry = Calculations.round(newInterestCalculation / openEntries.length);
                        openEntries.forEach(p => {
                            p.interest_payment = perEntry;
                            p.monthly_payment = Calculations.round(
                                (p.principal_payment || 0) + (p.admin_fee || 0) +
                                (p.initiation_fee || 0) + perEntry);
                        });
                        loan.monthly_payment = openEntries[0].monthly_payment;
                    }`,
'recalc propagation');

/* ---- T12: penalty income tracked (F-06) -------------------------------- */
rep(
`            AppState.totalFeesEarned = (AppState.totalFeesEarned || 0) + adminFeePaid + initiationFeePaid;`,
`            AppState.totalFeesEarned = (AppState.totalFeesEarned || 0) + adminFeePaid + initiationFeePaid;

            // Penalty income is neither interest nor fees — track it. (F-06)
            AppState.totalPenaltiesEarned = (AppState.totalPenaltiesEarned || 0) + latePenaltyPaid;`,
'penalties earned');

/* ---- T13: canonical transactions field (F-09) --------------------------- */
rep(
`            if (!AppState.transactionHistory) AppState.transactionHistory = [];
            AppState.transactionHistory.push({
                type: 'payment',`,
`            if (!AppState.transactions) AppState.transactions = [];
            AppState.transactions.push({
                id: Date.now(),
                type: 'payment',
                description: 'Payment \\u2014 ' + loan.client_name + ' (Loan #' + loanId + ')',`,
'transactions push');

/* ---- T14: defaulting recomputes derived totals (F-06) -------------------- */
rep(
`                data: { loanId: loanId, newStatus: 'defaulted' }
            });`,
`                data: { loanId: loanId, newStatus: 'defaulted' }
            });

            // Deployed capital is derived — a defaulted loan leaves the
            // active book immediately. (F-06)
            AppStateManager.recalculateDerivedTotals(AppState);`,
'default → derived totals');

/* ---- T15: modal markup ---------------------------------------------------- */
rep(
`    </script>
    <!-- Service Worker Registration -->`,
`    </script>

    <!-- F-13: Payment entry modal -->
    <div id="paymentModal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:2000; align-items:center; justify-content:center; padding:16px;">
        <div style="background:#fff; border-radius:14px; max-width:520px; width:100%; max-height:90vh; overflow-y:auto; padding:24px; box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <h3 id="pmTitle" style="margin:0 0 4px 0; color:#2c3e50;">Payment</h3>
            <p id="pmClient" style="margin:0 0 14px 0; color:#636e72; font-weight:600;"></p>
            <div id="pmSummary" style="background:#f8f9fa; border-radius:10px; padding:12px 14px; margin-bottom:14px; font-size:14px;"></div>
            <label for="pmAmount" style="display:block; font-weight:600; color:#2c3e50; margin-bottom:6px;">Payment amount (R)</label>
            <input type="number" id="pmAmount" min="0" step="0.01" inputmode="decimal" oninput="updatePaymentPreview()" style="width:100%; padding:12px; border:2px solid #e0e6ed; border-radius:10px; font-size:16px; margin-bottom:12px;">
            <label for="pmDate" style="display:block; font-weight:600; color:#2c3e50; margin-bottom:6px;">Payment date</label>
            <input type="date" id="pmDate" style="width:100%; padding:12px; border:2px solid #e0e6ed; border-radius:10px; font-size:16px; margin-bottom:12px;">
            <div style="font-weight:600; color:#2c3e50; margin-bottom:6px;">Allocation preview</div>
            <div id="pmPreview" style="background:#f0f4ff; border-radius:10px; padding:12px 14px; font-size:14px; margin-bottom:10px;"></div>
            <p id="pmError" style="color:#e74c3c; font-size:14px; min-height:18px; margin:0 0 10px 0;"></p>
            <div style="display:flex; gap:10px; justify-content:flex-end;">
                <button class="btn btn-secondary" type="button" onclick="closePaymentModal()">Cancel</button>
                <button class="btn btn-success" type="button" onclick="confirmPaymentModal()">&#9989; Confirm Payment</button>
            </div>
        </div>
    </div>

    <!-- Service Worker Registration -->`,
'modal markup');

writeFileSync(FILE, src);
console.log(`Applied ${count} transforms to ${FILE}`);
