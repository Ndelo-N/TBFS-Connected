#!/usr/bin/env node
/**
 * One-shot transform of shared/calculations.js for the security patch series.
 * Every replacement is exact-match and the script aborts if a pattern is
 * absent, so the change set is fully auditable via git diff.
 *
 * F-07  RATES: every business rate defined exactly once
 * F-02  allocateScheduledPayment(): the shared payment waterfall
 * F-16  resolveScheduleStartYear()/getAdminFeeForContributions(): shared
 * F-17  console.log → dbg() (DEBUG-gated)
 * dates calculateMembershipEndDate(): local-date formatting (no UTC shift)
 * tests window guard so Node can require() the module
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'shared/calculations.js';
let src = readFileSync(FILE, 'utf8');
let count = 0;

function rep(from, to, label) {
    if (!src.includes(from)) {
        console.error(`MISSING PATTERN [${label}]:\n${from}`);
        process.exit(1);
    }
    src = src.split(from).join(to);
    count++;
}

/* ------------------------------------------------------------------ *
 * 1. Header: RATES + DEBUG scaffolding                                *
 * ------------------------------------------------------------------ */
rep(
`const Calculations = {`,
`/**
 * Canonical business rates (F-07).
 * Every rate used anywhere in the application is defined exactly once,
 * here. TBFS-COMPLETE-BUSINESS-RULES.md must mirror these values.
 */
const RATES = {
    // Standard loans (30% Income Table method)
    INCOME_TABLE_RATE: 0.30,      // TBFS gross income on outstanding balance
    INITIATION_FEE_RATE: 0.12,    // Once-off, spread across the term
    ADMIN_FEE_STANDARD: 60,       // Rand per month

    // Stockvel tiered lending (bounds are fractions of contributions)
    TIER_BOUNDS: { T1: 0.30, T2: 0.75, T3: 1.05, T4: 1.10 },
    TIER_RATES:  { T1: 0.03, T2: 0.08, T3: 0.15, T4: 0.25 },
    STOCKVEL_MIN_MONTHLY_RATE: 0.10,   // 10% minimum monthly charge
    ADMIN_FEE_CONTRIB_10K: 50,         // contributions ≥ R10,000
    ADMIN_FEE_CONTRIB_20K: 45,         // contributions ≥ R20,000

    // Late penalties
    LATE_PENALTY_DAILY_RATE: 0.001,    // 0.1% per day on outstanding balance
    LATE_PENALTY_MAX_DAYS: 7
};

const DEBUG = false;
function dbg(...args) { if (DEBUG) console.log(...args); }

const Calculations = {
    /** Canonical rates, exposed for pages and tests. */
    RATES,
`,
    'header/RATES');

/* ------------------------------------------------------------------ *
 * 2. Tiered stockvel interest: bounds + rates from RATES              *
 * ------------------------------------------------------------------ */
rep(
`        const boundaries = {
            tier1_max: savingsAmount * 0.30,  // Up to 30% of contributions @ 3%
            tier2_max: savingsAmount * 0.75,  // Up to 75% of contributions @ 8%
            tier3_max: savingsAmount * 1.05,  // Up to 105% of contributions @ 15%
            tier4_max: savingsAmount * 1.10,  // Up to 110% of contributions @ 25%
            // Above 110% @ 30% (Income Table)
        };`,
`        const boundaries = {
            tier1_max: savingsAmount * RATES.TIER_BOUNDS.T1,  // @ TIER_RATES.T1
            tier2_max: savingsAmount * RATES.TIER_BOUNDS.T2,  // @ TIER_RATES.T2
            tier3_max: savingsAmount * RATES.TIER_BOUNDS.T3,  // @ TIER_RATES.T3
            tier4_max: savingsAmount * RATES.TIER_BOUNDS.T4,  // @ TIER_RATES.T4
            // Above the T4 bound → Income Table method
        };`,
    'tier bounds');

rep(`const tierInterest = tierAmount * 0.03;`, `const tierInterest = tierAmount * RATES.TIER_RATES.T1;`, 'tier1 rate');
rep(`const tierInterest = tierAmount * 0.08;`, `const tierInterest = tierAmount * RATES.TIER_RATES.T2;`, 'tier2 rate');
rep(`const tierInterest = tierAmount * 0.15;`, `const tierInterest = tierAmount * RATES.TIER_RATES.T3;`, 'tier3 rate');
rep(`const tierInterest = tierAmount * 0.25;`, `const tierInterest = tierAmount * RATES.TIER_RATES.T4;`, 'tier4 rate');

/* ------------------------------------------------------------------ *
 * 3. Early payoff: rates from RATES                                   *
 * ------------------------------------------------------------------ */
rep(`const totalInitiationFee = loan.total_initiation_fee || (originalPrincipal * 0.12);`,
    `const totalInitiationFee = loan.total_initiation_fee || (originalPrincipal * RATES.INITIATION_FEE_RATE);`,
    'payoff initiation fallback');
rep(`                const minimumInterest = balance * 0.10;
                const monthInterest = Math.max(tieredInterest, minimumInterest);`,
`                const minimumInterest = balance * RATES.STOCKVEL_MIN_MONTHLY_RATE;
                const monthInterest = Math.max(tieredInterest, minimumInterest);`,
    'payoff stockvel minimum');
rep(`            for (let month = 1; month <= monthsToCalculateInterest; month++) {
                const tbfsIncome = balance * 0.30;
                const adminFee = 60;`,
`            for (let month = 1; month <= monthsToCalculateInterest; month++) {
                const tbfsIncome = balance * RATES.INCOME_TABLE_RATE;
                const adminFee = RATES.ADMIN_FEE_STANDARD;`,
    'payoff standard month loop');
rep(`        const adminFeePerMonth = isStockvel ? 
            (typeof scheduleAdminFee === 'number' ? scheduleAdminFee : 60) : 
            60;`,
`        const adminFeePerMonth = isStockvel ?
            (typeof scheduleAdminFee === 'number' ? scheduleAdminFee : RATES.ADMIN_FEE_STANDARD) :
            RATES.ADMIN_FEE_STANDARD;`,
    'payoff admin per month');
rep(`        const originalTotalCost = loan.total_cost || (originalPrincipal + loan.total_interest + totalInitiationFee + (60 * loan.term_months));`,
    `        const originalTotalCost = loan.total_cost || (originalPrincipal + loan.total_interest + totalInitiationFee + (RATES.ADMIN_FEE_STANDARD * loan.term_months));`,
    'payoff original total cost');

/* ------------------------------------------------------------------ *
 * 4. Standard loan: rates from RATES                                  *
 * ------------------------------------------------------------------ */
rep(`        let balance = principal;
        for (let month = 1; month <= interestMonths; month++) {
            const tbfsIncome = balance * 0.30;
            const adminFee = 60;
            const initiationFee = (principal * 0.12) / term; // Still spread across full term`,
`        let balance = principal;
        for (let month = 1; month <= interestMonths; month++) {
            const tbfsIncome = balance * RATES.INCOME_TABLE_RATE;
            const adminFee = RATES.ADMIN_FEE_STANDARD;
            const initiationFee = (principal * RATES.INITIATION_FEE_RATE) / term; // Still spread across full term`,
    'standard first pass');
rep(`        for (let month = 1; month <= term; month++) {
            const adminFee = 60;
            const initiationFee = (principal * 0.12) / term;`,
`        for (let month = 1; month <= term; month++) {
            const adminFee = RATES.ADMIN_FEE_STANDARD;
            const initiationFee = (principal * RATES.INITIATION_FEE_RATE) / term;`,
    'standard breakdown pass');
rep(`        const totalInitiationFee = principal * 0.12;
        const totalAdminFees = 60 * term;`,
`        const totalInitiationFee = principal * RATES.INITIATION_FEE_RATE;
        const totalAdminFees = RATES.ADMIN_FEE_STANDARD * term;`,
    'standard totals');

/* ------------------------------------------------------------------ *
 * 5. Bonus calculation: rates from RATES                              *
 * ------------------------------------------------------------------ */
rep(`        const minimumInterest = outstandingBalance * 0.10;
        const minimumAdmin = 60;`,
`        const minimumInterest = outstandingBalance * RATES.STOCKVEL_MIN_MONTHLY_RATE;
        const minimumAdmin = RATES.ADMIN_FEE_STANDARD;`,
    'bonus minimum');
rep(`        const tieredInterest = outstandingBalance * tieredRate;
        const variableAdmin = 60 * (1 - tieredRate);`,
`        const tieredInterest = outstandingBalance * tieredRate;
        const variableAdmin = RATES.ADMIN_FEE_STANDARD * (1 - tieredRate);`,
    'bonus variable admin');

/* ------------------------------------------------------------------ *
 * 6. Replace the dead, buggy allocatePayment with the shared          *
 *    schedule-driven waterfall used by every payment path (F-02).     *
 * ------------------------------------------------------------------ */
rep(
`    /**
     * Allocate payment across fees, interest, and principal
     * Returns breakdown of allocation
     */
    allocatePayment(paymentAmount, loan) {
        let remaining = paymentAmount;
        
        // Calculate what's due
        const monthlyAdminFee = loan.isStockvelLoan ? 
            (60 * (1 - (loan.tieredRate || 0))) : 60;
        const monthlyInitiationFee = (loan.initiation_fee - loan.initiation_fee_paid) / 
                                     (loan.term_months - loan.payments_made);
        const maxInterestAllowed = loan.principal * 1.00; // 100% cap
        const maxInterestCanPay = maxInterestAllowed - loan.total_interest_charged;
        
        // 1. Admin Fee
        const adminPaid = Math.min(remaining, monthlyAdminFee);
        remaining -= adminPaid;
        
        // 2. Initiation Fee
        const initiationPaid = Math.min(remaining, monthlyInitiationFee);
        remaining -= initiationPaid;
        
        // 3. Interest (with cap)
        const interestPaid = Math.min(remaining, maxInterestCanPay);
        remaining -= interestPaid;
        
        // 4. Principal
        const principalPaid = remaining;
        
        return {
            adminPaid: this.round(adminPaid),
            initiationPaid: this.round(initiationPaid),
            interestPaid: this.round(interestPaid),
            principalPaid: this.round(principalPaid),
            totalAllocated: this.round(adminPaid + initiationPaid + interestPaid + principalPaid)
        };
    },`,
`    /**
     * Shared payment waterfall (F-02): allocate a payment against the next
     * pending schedule entry in the production order
     *   initiation → admin → late penalty → interest → principal
     * enforcing the loan's interest cap (max_interest_allowed) at the
     * allocation step. Pure function: no state is mutated.
     *
     * @param {number} amount            Payment received
     * @param {object} opts
     * @param {object} opts.entry        Next pending schedule entry
     * @param {number} [opts.latePenaltyDue=0]
     * @param {number} [opts.interestCapRemaining=Infinity]
     *        max_interest_allowed − interest_paid (pass Infinity to disable)
     * @param {number} [opts.remainingPrincipal=Infinity]
     * @returns breakdown {initiationPaid, adminPaid, penaltyPaid,
     *                     interestPaid, principalPaid, unallocated}
     */
    allocateScheduledPayment(amount, opts) {
        const entry = (opts && opts.entry) || {};
        const latePenaltyDue = Math.max(0, (opts && opts.latePenaltyDue) || 0);
        const capRemaining = (opts && Number.isFinite(opts.interestCapRemaining))
            ? Math.max(0, opts.interestCapRemaining) : Infinity;
        const remainingPrincipal = (opts && Number.isFinite(opts.remainingPrincipal))
            ? Math.max(0, opts.remainingPrincipal) : Infinity;

        let remaining = Math.max(0, Number(amount) || 0);

        const take = (due) => {
            const paid = Math.min(remaining, Math.max(0, Number(due) || 0));
            remaining -= paid;
            return paid;
        };

        const initiationPaid = take(entry.initiation_fee);
        const adminPaid = take(entry.admin_fee);
        const penaltyPaid = take(latePenaltyDue);
        const interestPaid = take(Math.min(
            Math.max(0, Number(entry.interest_payment) || 0), capRemaining));
        const principalPaid = take(Math.min(
            Math.max(0, Number(entry.principal_payment) || 0), remainingPrincipal));

        return {
            initiationPaid: this.round(initiationPaid),
            adminPaid: this.round(adminPaid),
            penaltyPaid: this.round(penaltyPaid),
            interestPaid: this.round(interestPaid),
            principalPaid: this.round(principalPaid),
            unallocated: this.round(remaining)
        };
    },

    /**
     * Admin fee for stockvel loans by contribution level (shared rule).
     */
    getAdminFeeForContributions(totalContributions) {
        const c = Number(totalContributions) || 0;
        if (c >= 20000) return RATES.ADMIN_FEE_CONTRIB_20K;
        if (c >= 10000) return RATES.ADMIN_FEE_CONTRIB_10K;
        return RATES.ADMIN_FEE_STANDARD;
    },

    /**
     * Resolve the schedule start YEAR for a loan (F-16 / date fix).
     * A repayment schedule cannot begin before disbursement: if the chosen
     * start month is calendar-earlier than the loan month, it means the
     * NEXT occurrence of that month.
     *   e.g. loan Dec 2026, start month Jan → schedule starts Jan 2027.
     */
    resolveScheduleStartYear(loanDate, startMonthIndex) {
        const d = (loanDate instanceof Date) ? loanDate : new Date(loanDate);
        const base = isNaN(d.getTime()) ? new Date() : d;
        const year = base.getFullYear();
        const m = Number(startMonthIndex);
        if (!Number.isFinite(m)) return year;
        return (m < base.getMonth()) ? year + 1 : year;
    },`,
    'allocatePayment → allocateScheduledPayment');

/* ------------------------------------------------------------------ *
 * 7. Late penalty from RATES                                          *
 * ------------------------------------------------------------------ */
rep(`        const maxDays = 7;
        const dailyRate = 0.001; // 0.1% per day`,
`        const maxDays = RATES.LATE_PENALTY_MAX_DAYS;
        const dailyRate = RATES.LATE_PENALTY_DAILY_RATE;`,
    'late penalty rates');

/* ------------------------------------------------------------------ *
 * 8. Membership end date: local-date formatting (UTC shift fix)       *
 * ------------------------------------------------------------------ */
rep(
`    calculateMembershipEndDate(startDate) {
        const start = new Date(startDate);
        const end = new Date(
            start.getFullYear() + 1,
            start.getMonth(),
            start.getDate()
        );
        return end.toISOString().split('T')[0];
    },`,
`    calculateMembershipEndDate(startDate) {
        const start = new Date(startDate);
        const end = new Date(
            start.getFullYear() + 1,
            start.getMonth(),
            start.getDate()
        );
        // Format from LOCAL date parts. toISOString() converts to UTC,
        // which in SAST (UTC+2) shifted the date back by one day.
        const yyyy = end.getFullYear();
        const mm = String(end.getMonth() + 1).padStart(2, '0');
        const dd = String(end.getDate()).padStart(2, '0');
        return yyyy + '-' + mm + '-' + dd;
    },`,
    'membership end date');

/* ------------------------------------------------------------------ *
 * 9. Node-safe global attachment                                      *
 * ------------------------------------------------------------------ */
rep(
`// Make globally available
window.Calculations = Calculations;

// Export for modules`,
`// Make globally available (browser only)
if (typeof window !== 'undefined') {
    window.Calculations = Calculations;
}

// Export for modules`,
    'window guard');

/* ------------------------------------------------------------------ *
 * 10. DEBUG-gate the engine's verbose logging (F-17)                  *
 * ------------------------------------------------------------------ */
const before = (src.match(/console\.log\(/g) || []).length;
src = src.replace(/console\.log\(/g, 'dbg(');
console.log(`console.log → dbg: ${before} call sites`);

writeFileSync(FILE, src);
console.log(`Applied ${count} exact-match replacements to ${FILE}`);
