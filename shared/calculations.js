/**
 * TBFS Calculation Engine
 * All financial calculations used across the application
 * Includes standard loans, stockvel loans, interest, fees, and allocations
 * 
 * Version: 2.0.0 (Multi-Page Architecture)
 * Business Rules Version: 1.7.5
 */

/**
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

function dbg(...args) { if (globalThis.TBFS_DEBUG) console.log(...args); }

const Calculations = {
    /** Canonical rates, exposed for pages and tests. */
    RATES,

    /**
     * Format currency in South African Rand
     */
    formatCurrency(amount) {
        return 'R ' + parseFloat(amount).toLocaleString('en-ZA', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
    },
    
    /**
     * Standardized Stockvel Member Lookup
     * Finds member by memberNumber, phone, account_number, or name
     * Used across all modules for consistent member finding
     * 
     * @param {object} searchCriteria - Search parameters
     * @param {number} searchCriteria.memberNumber - Member number to find
     * @param {string} searchCriteria.phone - Phone number to match
     * @param {string} searchCriteria.accountNumber - Account number to match
     * @param {string} searchCriteria.name - Full name to match
     * @param {array} stockvelMembers - Array of stockvel members to search
     * @returns {object|null} - Found member or null
     */
    findStockvelMember(searchCriteria, stockvelMembers) {
        if (!stockvelMembers || !Array.isArray(stockvelMembers)) {
            return null;
        }
        
        const { memberNumber, phone, accountNumber, name } = searchCriteria;
        
        // Priority 1: Find by memberNumber (most reliable)
        if (memberNumber) {
            const byNumber = stockvelMembers.find(m => m.memberNumber === parseInt(memberNumber));
            if (byNumber) return byNumber;
        }
        
        // Priority 2: Find by phone
        if (phone) {
            const byPhone = stockvelMembers.find(m => 
                m.phone === phone || 
                m.phone === accountNumber ||
                m.account_number === phone
            );
            if (byPhone) return byPhone;
        }
        
        // Priority 3: Find by account_number
        if (accountNumber) {
            const byAccount = stockvelMembers.find(m => 
                m.account_number === accountNumber ||
                m.phone === accountNumber
            );
            if (byAccount) return byAccount;
        }
        
        // Priority 4: Find by name (least reliable, may have duplicates)
        if (name) {
            const byName = stockvelMembers.find(m => 
                m.name === name ||
                m.name.toLowerCase() === name.toLowerCase()
            );
            if (byName) return byName;
        }
        
        return null;
    },
    
    /**
     * Round to 2 decimal places
     */
    round(value) {
        return Math.round(value * 100) / 100;
    },
    
    /**
     * Calculate tiered stockvel interest
     * Returns interest breakdown for tiers 1-4 and tier 5 amount
     */
    calculateTieredStockvelInterest(loanAmount, savingsAmount) {
        let tiers1to4Interest = 0;
        let tier5Amount = 0;
        let tier1to4Amount = 0;
        
        dbg(`\nTiered calculation for R${loanAmount.toFixed(2)} loan with R${savingsAmount.toFixed(2)} contributions`);
        
        // Calculate tier boundaries based on ABSOLUTE amounts from contributions
        const boundaries = {
            tier1_max: savingsAmount * RATES.TIER_BOUNDS.T1,  // @ TIER_RATES.T1
            tier2_max: savingsAmount * RATES.TIER_BOUNDS.T2,  // @ TIER_RATES.T2
            tier3_max: savingsAmount * RATES.TIER_BOUNDS.T3,  // @ TIER_RATES.T3
            tier4_max: savingsAmount * RATES.TIER_BOUNDS.T4,  // @ TIER_RATES.T4
            // Above the T4 bound → Income Table method
        };
        
        dbg(`Tier boundaries:`);
        dbg(`  Tier 1 (3%): R0 - R${boundaries.tier1_max.toFixed(2)}`);
        dbg(`  Tier 2 (8%): R${boundaries.tier1_max.toFixed(2)} - R${boundaries.tier2_max.toFixed(2)}`);
        dbg(`  Tier 3 (15%): R${boundaries.tier2_max.toFixed(2)} - R${boundaries.tier3_max.toFixed(2)}`);
        dbg(`  Tier 4 (25%): R${boundaries.tier3_max.toFixed(2)} - R${boundaries.tier4_max.toFixed(2)}`);
        dbg(`  Tier 5 (30% Income Table): Above R${boundaries.tier4_max.toFixed(2)}`);
        
        let remainingLoan = loanAmount;
        
        // Tier 1: First 30% of contributions @ 3%
        if (remainingLoan > 0) {
            const tierAmount = Math.min(remainingLoan, boundaries.tier1_max);
            const tierInterest = tierAmount * RATES.TIER_RATES.T1;
            tiers1to4Interest += tierInterest;
            tier1to4Amount += tierAmount;
            dbg(`Tier 1 (0-30%): R${tierAmount.toFixed(2)} × 3% = R${tierInterest.toFixed(2)}`);
            remainingLoan -= tierAmount;
        }
        
        // Tier 2: 30-75% of contributions @ 8%
        if (remainingLoan > 0) {
            const tierAmount = Math.min(remainingLoan, boundaries.tier2_max - boundaries.tier1_max);
            const tierInterest = tierAmount * RATES.TIER_RATES.T2;
            tiers1to4Interest += tierInterest;
            tier1to4Amount += tierAmount;
            dbg(`Tier 2 (30-75%): R${tierAmount.toFixed(2)} × 8% = R${tierInterest.toFixed(2)}`);
            remainingLoan -= tierAmount;
        }
        
        // Tier 3: 75-105% of contributions @ 15%
        if (remainingLoan > 0) {
            const tierAmount = Math.min(remainingLoan, boundaries.tier3_max - boundaries.tier2_max);
            const tierInterest = tierAmount * RATES.TIER_RATES.T3;
            tiers1to4Interest += tierInterest;
            tier1to4Amount += tierAmount;
            dbg(`Tier 3 (75-105%): R${tierAmount.toFixed(2)} × 15% = R${tierInterest.toFixed(2)}`);
            remainingLoan -= tierAmount;
        }
        
        // Tier 4: 105-110% of contributions @ 25%
        if (remainingLoan > 0) {
            const tierAmount = Math.min(remainingLoan, boundaries.tier4_max - boundaries.tier3_max);
            const tierInterest = tierAmount * RATES.TIER_RATES.T4;
            tiers1to4Interest += tierInterest;
            tier1to4Amount += tierAmount;
            dbg(`Tier 4 (105-110%): R${tierAmount.toFixed(2)} × 25% = R${tierInterest.toFixed(2)}`);
            remainingLoan -= tierAmount;
        }
        
        // Tier 5: Above 110% of contributions
        // This will be calculated using Income Table method in the main function
        if (remainingLoan > 0) {
            tier5Amount = remainingLoan;
            dbg(`Tier 5 (>110%): R${tier5Amount.toFixed(2)} [Income Table method]`);
        }
        
        dbg(`Tiers 1-4 interest: R${tiers1to4Interest.toFixed(2)}`);
        dbg(`Tiers 1-4 amount: R${tier1to4Amount.toFixed(2)}`);
        if (tier5Amount > 0) {
            dbg(`Tier 5 amount: R${tier5Amount.toFixed(2)} (to be calculated with Income Table)`);
        }
        
        return { 
            tiers1to4Interest, 
            tier1to4Amount, 
            tier5Amount,
            tier4Boundary: boundaries.tier4_max,
            boundaries
        };
    },
    
    /**
     * Calculate interest period for long-term loans.
     * Rule: max(3, ceil(term/2)), capped at the actual term.
     * Interest is computed only over this period (declining balance), then
     * equalized across all term months — that is the long-term protection,
     * not a separate "100% of principal" clamp on collectible interest.
     */
    calculateInterestPeriod(term) {
        const t = Math.max(0, Math.floor(Number(term) || 0));
        const halfCeil = Math.ceil(t / 2);
        const calculatedMonths = Math.max(3, halfCeil);
        const interestMonths = Math.min(calculatedMonths, t || 0);

        dbg(`Interest Period Calculation: term=${t} months → interest period=${interestMonths} months`);

        return {
            interestMonths,
            calculatedMonths,
            description: t <= 2
                ? `Short-term: Full ${t} month interest`
                : t <= 6
                    ? `Medium-term: ${interestMonths} months (min 3 / half term)`
                    : `Long-term: ${interestMonths} months (half term)`
        };
    },
    
    /**
     * Add interest cap fields to a loan object
     * Call this when creating ANY loan to ensure consistent interest tracking
     * 
     * @param {object} loanData - Loan data with principal, term, totalInterest
     * @returns {object} - Interest cap fields to merge into loan object
     */
    addInterestCapFields(loanData) {
        const { principal, term, totalInterest } = loanData;
        
        // Calculate interest period
        const interestPeriod = this.calculateInterestPeriod(term);
        const interestTotal = Number(totalInterest) || 0;
        
        // Return fields to add to loan object
        return {
            // Interest Calculation Period
            interest_calculation_months: interestPeriod.interestMonths,
            
            // Collectible interest = calculated period interest (matches schedule /
            // monthly payment). Long-term protection is the shortened interest
            // period, not a principal-sized ceiling that under-collects vs the bill.
            max_interest_allowed: this.round(interestTotal),
            
            // Expected monthly interest (equalized)
            expected_monthly_interest: term > 0 ? interestTotal / term : 0,
            
            // Tracking fields
            total_interest_charged: 0,
            interest_paid: 0,
            
            // Original values for reference
            original_principal: principal,
            
            // Description for logging
            _interest_cap_description: interestPeriod.description
        };
    },
    
    /**
     * Calculate early payoff amount for a loan
     * 
     * Prorates interest based on payoff month vs interest calculation period
     * Ensures full initiation fee is paid
     * 
     * @param {object} loan - Loan object with all tracking fields
     * @param {number} payoffMonth - Month number when paying off (1-based)
     * @returns {object} - Detailed payoff breakdown
     */
    calculateEarlyPayoff(loan, payoffMonth) {
        dbg(`\n=== EARLY PAYOFF CALCULATION ===`);
        dbg(`Loan ID: ${loan.loan_id}`);
        dbg(`Original Term: ${loan.term_months} months`);
        dbg(`Payoff Month: ${payoffMonth}`);
        dbg(`Payments Made: ${loan.payments_made || 0}`);
        
        // Validate inputs
        if (payoffMonth > loan.term_months) {
            throw new Error('Payoff month cannot exceed loan term');
        }
        
        if (payoffMonth <= (loan.payments_made || 0)) {
            throw new Error('Payoff month must be after last payment made');
        }
        
        // Get loan details
        const originalPrincipal = loan.original_principal || loan.principal_amount;
        const remainingPrincipal = loan.remaining_principal || loan.principal_amount;
        const interestPeriod = loan.interest_calculation_months || this.calculateInterestPeriod(loan.term_months).interestMonths;
        const totalInitiationFee = loan.total_initiation_fee || (originalPrincipal * RATES.INITIATION_FEE_RATE);
        const initiationFeePaid = loan.initiation_fee_paid || 0;
        const interestPaid = loan.interest_paid || 0;
        
        dbg(`\nLoan Details:`);
        dbg(`Original Principal: R${originalPrincipal.toFixed(2)}`);
        dbg(`Remaining Principal: R${remainingPrincipal.toFixed(2)}`);
        dbg(`Interest Calculation Period: ${interestPeriod} months`);
        dbg(`Interest Already Paid: R${interestPaid.toFixed(2)}`);
        
        // STEP 1: Calculate prorated interest owed
        // Interest should be calculated for the LESSER of:
        // - Payoff month
        // - Interest calculation period
        const monthsToCalculateInterest = Math.min(payoffMonth, interestPeriod);
        
        dbg(`\nInterest Calculation:`);
        dbg(`Months to calculate: ${monthsToCalculateInterest} (min of payoff month ${payoffMonth} and interest period ${interestPeriod})`);
        
        // Calculate interest for the prorated period using declining balance
        let proratedInterest = 0;
        let balance = originalPrincipal;
        const principalPerMonth = originalPrincipal / loan.term_months;
        
        // Check if this is a stockvel loan with tiered rates
        const isStockvel = loan.loan_type === 'stockvel' || loan.isStockvelLoan;
        
        if (isStockvel && loan.total_contributions) {
            // Stockvel loan - use tiered calculation
            dbg(`Stockvel loan detected - using tiered rates`);
            let currentSavings = loan.total_contributions || 0;
            const monthlyContribution = loan.monthly_contribution || 0;
            
            for (let month = 1; month <= monthsToCalculateInterest; month++) {
                // Update savings
                if (month > 1) {
                    currentSavings += monthlyContribution;
                }
                
                // Calculate tiered interest
                const tieredResult = this.calculateTieredStockvelInterest(balance, currentSavings);
                const tieredInterest = tieredResult.tiers1to4Interest;
                
                // Apply 10% minimum
                const minimumInterest = balance * RATES.STOCKVEL_MIN_MONTHLY_RATE;
                const monthInterest = Math.max(tieredInterest, minimumInterest);
                
                proratedInterest += monthInterest;
                dbg(`  Month ${month}: Balance R${balance.toFixed(2)}, Savings R${currentSavings.toFixed(2)}, Interest R${monthInterest.toFixed(2)}`);
                
                balance -= principalPerMonth;
            }
        } else {
            // Standard loan - use 30% income table
            for (let month = 1; month <= monthsToCalculateInterest; month++) {
                const tbfsIncome = balance * RATES.INCOME_TABLE_RATE;
                const adminFee = RATES.ADMIN_FEE_STANDARD;
                const initiationFee = totalInitiationFee / loan.term_months;
                const monthInterest = tbfsIncome - adminFee - initiationFee;
                
                proratedInterest += monthInterest;
                dbg(`  Month ${month}: Balance R${balance.toFixed(2)}, Interest R${monthInterest.toFixed(2)}`);
                
                balance -= principalPerMonth;
            }
        }
        
        dbg(`Total prorated interest for ${monthsToCalculateInterest} months: R${proratedInterest.toFixed(2)}`);
        dbg(`Interest already paid: R${interestPaid.toFixed(2)}`);
        
        // Interest owed = Prorated interest - Interest already paid
        const interestOwed = Math.max(0, proratedInterest - interestPaid);
        dbg(`Interest still owed: R${interestOwed.toFixed(2)}`);
        
        // STEP 2: Calculate remaining initiation fee (must be paid in full)
        const initiationFeeOwed = Math.max(0, totalInitiationFee - initiationFeePaid);
        dbg(`\nInitiation Fee:`);
        dbg(`Total: R${totalInitiationFee.toFixed(2)}`);
        dbg(`Paid: R${initiationFeePaid.toFixed(2)}`);
        dbg(`Owed: R${initiationFeeOwed.toFixed(2)}`);
        
        // STEP 3: Calculate remaining admin fees
        // Admin fees are for actual months only (not the full term)
        const scheduleAdminFee = loan.schedule && loan.schedule.length > 0 ? loan.schedule[0].admin_fee : undefined;
        const adminFeePerMonth = isStockvel ?
            (typeof scheduleAdminFee === 'number' ? scheduleAdminFee : RATES.ADMIN_FEE_STANDARD) :
            RATES.ADMIN_FEE_STANDARD;
        const adminFeesPaid = (loan.payments_made || 0) * adminFeePerMonth;
        const adminFeesForPayoffMonth = payoffMonth * adminFeePerMonth;
        const adminFeesOwed = Math.max(0, adminFeesForPayoffMonth - adminFeesPaid);
        
        dbg(`\nAdmin Fees:`);
        dbg(`Per month: R${adminFeePerMonth.toFixed(2)}`);
        dbg(`For ${payoffMonth} months: R${adminFeesForPayoffMonth.toFixed(2)}`);
        dbg(`Already paid: R${adminFeesPaid.toFixed(2)}`);
        dbg(`Still owed: R${adminFeesOwed.toFixed(2)}`);
        
        // STEP 4: Total payoff amount
        const totalPayoff = remainingPrincipal + interestOwed + initiationFeeOwed + adminFeesOwed;
        
        // STEP 5: Calculate savings
        const originalTotalCost = loan.total_cost || (originalPrincipal + loan.total_interest + totalInitiationFee + (RATES.ADMIN_FEE_STANDARD * loan.term_months));
        const totalPaid = (loan.payments_made || 0) * (loan.monthly_payment || 0);
        const totalWithPayoff = totalPaid + totalPayoff;
        const savings = originalTotalCost - totalWithPayoff;
        const savingsPercentage = (savings / originalTotalCost) * 100;
        
        dbg(`\n=== PAYOFF SUMMARY ===`);
        dbg(`Remaining Principal: R${remainingPrincipal.toFixed(2)}`);
        dbg(`Interest Owed: R${interestOwed.toFixed(2)}`);
        dbg(`Initiation Fee Owed: R${initiationFeeOwed.toFixed(2)}`);
        dbg(`Admin Fees Owed: R${adminFeesOwed.toFixed(2)}`);
        dbg(`───────────────────────────────`);
        dbg(`TOTAL PAYOFF: R${totalPayoff.toFixed(2)}`);
        dbg(`\nSavings: R${savings.toFixed(2)} (${savingsPercentage.toFixed(2)}%)`);
        
        return {
            // Payoff amount breakdown
            remainingPrincipal: this.round(remainingPrincipal),
            interestOwed: this.round(interestOwed),
            initiationFeeOwed: this.round(initiationFeeOwed),
            adminFeesOwed: this.round(adminFeesOwed),
            totalPayoff: this.round(totalPayoff),
            
            // Interest calculation details
            monthsInterestCalculated: monthsToCalculateInterest,
            proratedInterest: this.round(proratedInterest),
            interestAlreadyPaid: this.round(interestPaid),
            
            // Savings calculation
            originalTotalCost: this.round(originalTotalCost),
            totalPaidSoFar: this.round(totalPaid),
            totalWithPayoff: this.round(totalWithPayoff),
            savings: this.round(savings),
            savingsPercentage: this.round(savingsPercentage),
            
            // Metadata
            payoffMonth: payoffMonth,
            paymentsAlreadyMade: loan.payments_made || 0,
            originalTerm: loan.term_months,
            monthsSaved: loan.term_months - payoffMonth,
            
            // Formatted strings for display
            formatted: {
                totalPayoff: this.formatCurrency(totalPayoff),
                savings: this.formatCurrency(savings),
                breakdown: [
                    { label: 'Remaining Principal', amount: this.formatCurrency(remainingPrincipal) },
                    { label: 'Interest Owed', amount: this.formatCurrency(interestOwed) },
                    { label: 'Initiation Fee Balance', amount: this.formatCurrency(initiationFeeOwed) },
                    { label: 'Admin Fees Balance', amount: this.formatCurrency(adminFeesOwed) }
                ]
            }
        };
    },
    
    /**
     * Calculate standard loan using 30% Income Table method
     * Returns equal monthly installments with interest cap
     */
    calculateStandardLoan(principal, term) {
        dbg(`\n=== STANDARD LOAN CALCULATION (30% Income Table) ===`);
        dbg(`Principal: R${principal.toFixed(2)}`);
        dbg(`Term: ${term} months`);
        
        // Calculate interest period (long-term loan protection)
        const interestPeriod = this.calculateInterestPeriod(term);
        const interestMonths = interestPeriod.interestMonths;
        dbg(`Interest Calculation Period: ${interestMonths} months (${interestPeriod.description})`);
        
        const basePrincipalPayment = principal / term;
        let outstandingBalance = principal;
        let totalInterestForPeriod = 0;
        const monthlyDetails = [];
        
        // First pass: Calculate interest for the interest period ONLY (declining balance)
        let balance = principal;
        for (let month = 1; month <= interestMonths; month++) {
            const tbfsIncome = balance * RATES.INCOME_TABLE_RATE;
            const adminFee = RATES.ADMIN_FEE_STANDARD;
            const initiationFee = (principal * RATES.INITIATION_FEE_RATE) / term; // Still spread across full term
            const monthlyInterest = tbfsIncome - adminFee - initiationFee;
            
            totalInterestForPeriod += monthlyInterest;
            balance -= basePrincipalPayment;
        }
        
        // Interest is capped at the calculated period, then spread equally across ALL months
        const totalInterest = totalInterestForPeriod;
        const equalizedMonthlyInterest = totalInterest / term;
        
        dbg(`Interest calculated for ${interestMonths} months: R${totalInterestForPeriod.toFixed(2)}`);
        dbg(`Equalized monthly interest (spread over ${term} months): R${equalizedMonthlyInterest.toFixed(2)}`);
        
        // Build monthly breakdown with equalized interest
        outstandingBalance = principal;
        for (let month = 1; month <= term; month++) {
            const adminFee = RATES.ADMIN_FEE_STANDARD;
            const initiationFee = (principal * RATES.INITIATION_FEE_RATE) / term;
            
            monthlyDetails.push({
                month,
                outstandingBalance,
                tbfsIncome: equalizedMonthlyInterest + adminFee + initiationFee, // Reconstructed for display
                adminFee,
                initiationFee,
                monthlyInterest: equalizedMonthlyInterest
            });
            
            outstandingBalance -= basePrincipalPayment;
        }
        
        // Calculate totals
        const totalInitiationFee = principal * RATES.INITIATION_FEE_RATE;
        const totalAdminFees = RATES.ADMIN_FEE_STANDARD * term;
        const totalCostStandard = principal + totalInterest + totalInitiationFee + totalAdminFees;
        const equalMonthlyPayment = totalCostStandard / term;
        
        dbg(`Total Interest: R${totalInterest.toFixed(2)}`);
        dbg(`Total Initiation Fee: R${totalInitiationFee.toFixed(2)}`);
        dbg(`Total Admin Fees: R${totalAdminFees.toFixed(2)}`);
        dbg(`Total Cost: R${totalCostStandard.toFixed(2)}`);
        dbg(`Equal Monthly Payment: R${equalMonthlyPayment.toFixed(2)}`);
        
        // Second pass: Build breakdown with equal payments
        const breakdown = [];
        for (let i = 0; i < monthlyDetails.length; i++) {
            const detail = monthlyDetails[i];
            breakdown.push({
                month: detail.month,
                principal: basePrincipalPayment,
                interest: detail.monthlyInterest,
                adminFee: detail.adminFee,
                initiationFee: detail.initiationFee,
                totalPayment: equalMonthlyPayment,
                outstandingBalance: principal - (basePrincipalPayment * detail.month)
            });
        }
        
        return {
            totalInterest: this.round(totalInterest),
            totalInitiationFee: this.round(totalInitiationFee),
            totalAdminFees: this.round(totalAdminFees),
            totalCost: this.round(totalCostStandard),
            monthlyPayment: this.round(equalMonthlyPayment),
            interestMonths: interestMonths, // NEW: Interest calculation period
            maxInterestAllowed: this.round(totalInterest), // NEW: Interest cap
            expectedMonthlyInterest: this.round(equalizedMonthlyInterest), // NEW: Equalized interest
            breakdown
        };
    },
    
    /**
     * Quote-only stockvel loan estimate (no disbursement / no AppState writes).
     * Mirrors the calculator's tiered declining-balance schedule, then equalizes
     * the monthly installment across the term.
     */
    estimateStockvelLoanQuote(principal, term, totalContributions, monthlyContribution) {
        const p = Number(principal) || 0;
        const t = Math.max(1, Math.floor(Number(term) || 0));
        const startSavings = Math.max(0, Number(totalContributions) || 0);
        const monthlySav = Math.max(0, Number(monthlyContribution) || 0);
        if (p <= 0) {
            return {
                monthlyPayment: 0, totalInterest: 0, totalAdminFees: 0,
                totalInitiationFee: 0, totalCost: 0, months: t
            };
        }

        let outstandingBalance = p;
        let currentSavings = startSavings;
        const initiationFee = p <= currentSavings
            ? 0
            : (p - currentSavings) * RATES.INITIATION_FEE_RATE;
        const monthlyInitiationFee = initiationFee / t;
        const monthlyDetails = [];

        for (let month = 1; month <= t; month++) {
            if (month > 1) currentSavings += monthlySav;
            const tieredResult = this.calculateTieredStockvelInterest(
                outstandingBalance, currentSavings);
            const principalPayment = p / t;
            let interestPayment = 0;
            if (tieredResult && tieredResult.tiers1to4Interest !== undefined &&
                outstandingBalance > 0) {
                const tieredInterest = tieredResult.tiers1to4Interest *
                    (p / outstandingBalance);
                const minimumInterest = (p / t) * RATES.STOCKVEL_MIN_MONTHLY_RATE;
                interestPayment = Math.max(tieredInterest, minimumInterest);
            } else {
                interestPayment = (p / t) * RATES.STOCKVEL_MIN_MONTHLY_RATE;
            }
            let adminFee = RATES.ADMIN_FEE_STANDARD;
            if (tieredResult && tieredResult.tier1to4Amount > 0) {
                const effectiveRate = tieredResult.tiers1to4Interest /
                    tieredResult.tier1to4Amount;
                adminFee = Math.max(0, RATES.ADMIN_FEE_STANDARD * (1 - effectiveRate));
            }
            monthlyDetails.push({
                principal_payment: principalPayment,
                interest_payment: interestPayment,
                admin_fee: adminFee,
                initiation_fee: monthlyInitiationFee
            });
            outstandingBalance -= principalPayment;
        }

        const totalInterest = monthlyDetails.reduce(
            (s, m) => s + (m.interest_payment || 0), 0);
        const totalAdminFees = monthlyDetails.reduce(
            (s, m) => s + (m.admin_fee || 0), 0);
        const totalInitiationFee = initiationFee;
        const totalCost = p + totalInterest + totalAdminFees + totalInitiationFee;
        const monthlyPayment = totalCost / t;

        return {
            monthlyPayment: this.round(monthlyPayment),
            totalInterest: this.round(totalInterest),
            totalAdminFees: this.round(totalAdminFees),
            totalInitiationFee: this.round(totalInitiationFee),
            totalCost: this.round(totalCost),
            months: t
        };
    },

    /**
     * Side-by-side standard vs stockvel quote for client portal education.
     * Stockvel estimate uses hypothetical contributions (client-entered).
     */
    estimateLoanComparison(principal, term, options) {
        const opts = options || {};
        const standardRaw = this.calculateStandardLoan(principal, term);
        const standard = {
            monthlyPayment: standardRaw.monthlyPayment,
            totalInterest: standardRaw.totalInterest,
            totalAdminFees: standardRaw.totalAdminFees,
            totalInitiationFee: standardRaw.totalInitiationFee,
            totalCost: standardRaw.totalCost,
            months: term,
            interestMonths: standardRaw.interestMonths,
            maxInterestAllowed: standardRaw.maxInterestAllowed
        };
        const stockvel = this.estimateStockvelLoanQuote(
            principal,
            term,
            opts.totalContributions || 0,
            opts.monthlyContribution || 0
        );
        const savings = {
            monthly: this.round(standard.monthlyPayment - stockvel.monthlyPayment),
            total: this.round(standard.totalCost - stockvel.totalCost),
            interest: this.round(standard.totalInterest - stockvel.totalInterest),
            fees: this.round(
                (standard.totalAdminFees + standard.totalInitiationFee) -
                (stockvel.totalAdminFees + stockvel.totalInitiationFee)
            )
        };
        return { standard, stockvel, savings };
    },

    /**
     * Calculate bonus for stockvel member payment
     * Returns bonus amount earned (if any)
     */
    calculateBonus(loan, member, paymentAmount) {
        if (!loan.isStockvelLoan || !loan.tieredRate) {
            return 0; // No bonus for standard loans
        }
        
        const outstandingBalance = loan.remaining_principal;
        const tieredRate = loan.tieredRate;
        
        // Calculate minimum charge (10% of balance)
        const minimumInterest = outstandingBalance * RATES.STOCKVEL_MIN_MONTHLY_RATE;
        const minimumAdmin = RATES.ADMIN_FEE_STANDARD;
        const minimumInitiation = (loan.initiation_fee - loan.initiation_fee_paid) / 
                                   (loan.term_months - loan.payments_made);
        const minimumCharge = minimumInterest + minimumAdmin + minimumInitiation;
        
        // Calculate amount due to TBFS (tiered rate)
        const tieredInterest = outstandingBalance * tieredRate;
        const variableAdmin = RATES.ADMIN_FEE_STANDARD * (1 - tieredRate);
        const amountDueToTBFS = tieredInterest + variableAdmin + minimumInitiation;
        
        // Calculate bonus
        let bonus = 0;
        if (amountDueToTBFS < minimumCharge) {
            bonus = minimumCharge - amountDueToTBFS;
            dbg(`💰 Bonus earned: R${bonus.toFixed(2)}`);
            dbg(`  Minimum charge: R${minimumCharge.toFixed(2)}`);
            dbg(`  Amount due to TBFS: R${amountDueToTBFS.toFixed(2)}`);
            dbg(`  Member saves: ${((bonus / minimumCharge) * 100).toFixed(1)}%`);
        }
        
        return this.round(bonus);
    },
    
    /**
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
    },
    
    /**
     * Calculate due date (last day of month)
     */
    calculateDueDate(startYear, startMonthIndex, paymentNumber) {
        // Calculate target month (0-based)
        const targetMonthOffset = startMonthIndex + (paymentNumber - 1);
        
        // Calculate year and month considering rollover
        const targetYear = startYear + Math.floor(targetMonthOffset / 12);
        const targetMonth = targetMonthOffset % 12;
        
        // Get last day of that month
        // Date(year, month+1, 0) gives last day of month
        const lastDay = new Date(targetYear, targetMonth + 1, 0);
        
        return lastDay;
    },
    
    /**
     * Get month name from index
     */
    getMonthName(monthIndex) {
        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        return months[monthIndex % 12];
    },
    
    /**
     * Calculate days between two dates
     */
    daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        return Math.round((date2 - date1) / oneDay);
    },
    
    /**
     * Calculate membership end date (12 months from start)
     */
    calculateMembershipEndDate(startDate) {
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
    },
    
    /**
     * Calculate months between two dates
     */
    monthsBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return (d2.getFullYear() - d1.getFullYear()) * 12 + 
               (d2.getMonth() - d1.getMonth());
    },

    /**
     * Whole months remaining until membership end (pro-rata early-exit).
     * Clamped to [0, 12]. Exit on/after end date → 0.
     */
    monthsRemainingInMembership(exitDate, membershipEndDate) {
        const exit = new Date(exitDate);
        const end = new Date(membershipEndDate);
        if (isNaN(exit.getTime()) || isNaN(end.getTime())) return 0;
        if (exit >= end) return 0;
        const months = this.monthsBetween(exit, end);
        return Math.max(0, Math.min(12, months));
    },

    /**
     * Loans linked to a stockvel member (by memberNumber or account/phone).
     */
    loansForStockvelMember(member, loans) {
        if (!member || !Array.isArray(loans)) return [];
        const acc = member.account_number || member.phone || '';
        return loans.filter((loan) => {
            if (member.memberNumber != null && loan.memberNumber === member.memberNumber) {
                return true;
            }
            if (acc && loan.account_number === acc) return true;
            if (member.phone && loan.account_number === member.phone) return true;
            return false;
        });
    },

    /**
     * Hybrid early-exit settlement (Model C).
     * Benefit = interest saved + initiation waived + admin saved
     *          + bonuses paid + unpaid accumulated bonus.
     * ExitCost = Benefit × (monthsRemaining / 12)
     * NetPayout = max(0, contributions − ExitCost)
     * Unpaid bonus is clawed back (not paid out).
     *
     * @param {object} member
     * @param {array}  loans
     * @param {array}  receipts  stockvelReceipts
     * @param {string|Date} [exitDate] defaults to today
     * @param {object} [opts]
     * @param {number} [opts.availableCapital]
     * @returns settlement object with blockers[]
     */
    calculateEarlyExitSettlement(member, loans, receipts, exitDate, opts) {
        const blockers = [];
        if (!member) {
            return {
                canExit: false,
                blockers: ['Member not found'],
                contributions: 0,
                benefit: {
                    interestSaved: 0,
                    initiationWaived: 0,
                    adminSaved: 0,
                    bonusPaid: 0,
                    bonusUnpaid: 0,
                    total: 0
                },
                monthsRemaining: 0,
                membershipTermMonths: 12,
                exitCost: 0,
                netPayout: 0,
                exitDate: null,
                loanBreakdown: []
            };
        }

        const exit = exitDate
            ? new Date(exitDate)
            : new Date();
        const exitIso = isNaN(exit.getTime())
            ? new Date().toISOString().slice(0, 10)
            : [
                exit.getFullYear(),
                String(exit.getMonth() + 1).padStart(2, '0'),
                String(exit.getDate()).padStart(2, '0')
            ].join('-');

        const startStr = member.membershipStartDate || '';
        const endStr = member.membershipEndDate || '';
        const startMs = startStr ? new Date(startStr + 'T00:00:00').getTime() : NaN;
        const endMs = endStr ? new Date(endStr + 'T23:59:59').getTime() : NaN;

        const contributions = this.round(Math.max(0, Number(member.totalContributions) || 0));
        const bonusUnpaid = this.round(Math.max(0, Number(member.accumulatedBonus) || 0));

        const memberLoans = this.loansForStockvelMember(member, loans || []);
        const activeLoans = memberLoans.filter((l) => (l.status || '') === 'active');
        if (activeLoans.length > 0) {
            blockers.push(
                'Member has ' + activeLoans.length +
                ' active loan(s). Settle or pay off before early exit.'
            );
        }

        const monthsRemaining = this.monthsRemainingInMembership(exitIso, endStr);
        if (monthsRemaining <= 0) {
            blockers.push(
                'Membership period has ended (or ends today). ' +
                'Use Contribution Payout and Bonus Payout instead of Early Exit.'
            );
        }

        if (member.status === 'exited_early') {
            blockers.push('Member has already exited early.');
        }

        // Bonuses paid in this membership window
        let bonusPaid = 0;
        for (const r of receipts || []) {
            if (r.memberNumber !== member.memberNumber) continue;
            if (r.type !== 'bonus_payout') continue;
            const rMs = new Date(r.date).getTime();
            if (!isNaN(startMs) && rMs < startMs) continue;
            if (!isNaN(endMs) && rMs > endMs) continue;
            bonusPaid += Math.max(0, Number(r.amount) || 0);
        }
        bonusPaid = this.round(bonusPaid);

        let interestSaved = 0;
        let initiationWaived = 0;
        let adminSaved = 0;
        const loanBreakdown = [];

        for (const loan of memberLoans) {
            const isStockvel = loan.loan_type === 'stockvel' || loan.isStockvelLoan;
            if (!isStockvel) continue;

            const loanDateRaw = loan.disbursement_date || loan.created_at || loan.loan_date;
            const loanMs = new Date(loanDateRaw).getTime();
            if (!isNaN(startMs) && !isNaN(loanMs) && loanMs < startMs) continue;
            if (!isNaN(endMs) && !isNaN(loanMs) && loanMs > endMs) continue;

            const principal = Number(loan.original_principal || loan.principal_amount || loan.principal) || 0;
            const term = Number(loan.term_months) || 0;
            if (principal <= 0 || term <= 0) continue;

            const standard = this.calculateStandardLoan(principal, term);
            const actualInterest = Number(loan.total_interest);
            const interestActual = Number.isFinite(actualInterest)
                ? actualInterest
                : ((loan.schedule || []).reduce(
                    (s, e) => s + (Number(e.interest_payment) || 0), 0));
            const iSaved = Math.max(0, standard.totalInterest - interestActual);

            const actualInit = Number(
                loan.total_initiation_fee != null
                    ? loan.total_initiation_fee
                    : loan.initiation_fee
            );
            const initActual = Number.isFinite(actualInit) ? actualInit : standard.totalInitiationFee;
            const fInit = Math.max(0, standard.totalInitiationFee - initActual);

            let adminActual = 0;
            if (loan.schedule && loan.schedule.length) {
                adminActual = loan.schedule.reduce(
                    (s, e) => s + (Number(e.admin_fee) || 0), 0);
            } else if (Number.isFinite(Number(loan.total_admin_fees))) {
                adminActual = Number(loan.total_admin_fees);
            } else {
                adminActual = this.getAdminFeeForContributions(
                    loan.total_contributions || member.totalContributions || 0
                ) * term;
            }
            const fAdmin = Math.max(0, standard.totalAdminFees - adminActual);

            interestSaved += iSaved;
            initiationWaived += fInit;
            adminSaved += fAdmin;

            loanBreakdown.push({
                loanId: loan.loan_id,
                principal: this.round(principal),
                term,
                interestSaved: this.round(iSaved),
                initiationWaived: this.round(fInit),
                adminSaved: this.round(fAdmin)
            });
        }

        interestSaved = this.round(interestSaved);
        initiationWaived = this.round(initiationWaived);
        adminSaved = this.round(adminSaved);

        const benefitTotal = this.round(
            interestSaved + initiationWaived + adminSaved + bonusPaid + bonusUnpaid
        );
        const exitCost = this.round(benefitTotal * (monthsRemaining / 12));
        const netPayout = this.round(Math.max(0, contributions - exitCost));

        const availableCapital = opts && Number.isFinite(opts.availableCapital)
            ? opts.availableCapital
            : null;
        if (availableCapital != null && netPayout > availableCapital) {
            blockers.push(
                'Insufficient capital on hand for net payout of ' +
                this.formatCurrency(netPayout) + '.'
            );
        }

        return {
            canExit: blockers.length === 0,
            blockers,
            contributions,
            benefit: {
                interestSaved,
                initiationWaived,
                adminSaved,
                bonusPaid,
                bonusUnpaid,
                total: benefitTotal
            },
            monthsRemaining,
            membershipTermMonths: 12,
            exitCost,
            netPayout,
            exitDate: exitIso,
            membershipStartDate: startStr,
            membershipEndDate: endStr,
            loanBreakdown,
            activeLoanCount: activeLoans.length
        };
    },
    
    /**
     * Validate loan parameters
     */
    validateLoan(principal, term, availableCapital) {
        const errors = [];
        
        if (principal <= 0) {
            errors.push('Principal must be greater than zero');
        }
        
        if (term <= 0) {
            errors.push('Term must be greater than zero');
        }
        
        if (principal > availableCapital) {
            errors.push(`Insufficient capital. Available: ${this.formatCurrency(availableCapital)}`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },
    
    /**
     * Calculate late penalty
     * 0.1% per day on outstanding balance, capped at 7 days
     */
    calculateLatePenalty(daysLate, outstandingBalance) {
        const maxDays = RATES.LATE_PENALTY_MAX_DAYS;
        const dailyRate = RATES.LATE_PENALTY_DAILY_RATE;
        const effectiveDays = Math.min(Math.max(0, daysLate), maxDays);
        const penalty = outstandingBalance * dailyRate * effectiveDays;
        return this.round(penalty);
    },

    /**
     * Check if a loan is subject to late penalties.
     * Only loans distributed after 31 January 2026 incur penalties.
     * Extra post-grace admin accrual uses the same eligibility cutoff.
     */
    isLateFeesEligible(loan) {
        const cutoffDate = new Date(2026, 0, 31); // Jan 31 2026 (month is 0-indexed)
        const loanDate = new Date(loan.created_at || loan.loan_date || 0);
        return loanDate > cutoffDate;
    },

    /**
     * Extra admin months on an open installment after grace.
     * 0 while due..graceEnd (inclusive); 1 when grace lapses; +1 per full
     * calendar month after grace-end still unpaid.
     */
    countExtraAdminMonths(dueDate, asOfDate, gracePeriodDays) {
        if (typeof gracePeriodDays !== 'number') gracePeriodDays = 3;
        const due = new Date(dueDate);
        const asOf = new Date(asOfDate);
        if (isNaN(due.getTime()) || isNaN(asOf.getTime())) return 0;

        const graceEnd = new Date(due.getTime());
        graceEnd.setDate(graceEnd.getDate() + gracePeriodDays);
        if (asOf <= graceEnd) return 0;

        let count = 1;
        const cursor = new Date(graceEnd.getTime());
        cursor.setMonth(cursor.getMonth() + 1);
        while (cursor <= asOf) {
            count += 1;
            cursor.setMonth(cursor.getMonth() + 1);
        }
        return count;
    },

    /**
     * Monthly admin rate for accrual (standard or stockvel contribution tier).
     */
    getMonthlyAdminFeeForLoan(loan) {
        if (!loan) return RATES.ADMIN_FEE_STANDARD;
        const isStockvel = loan.loan_type === 'stockvel' || loan.isStockvelLoan;
        if (isStockvel) {
            return this.getAdminFeeForContributions(
                loan.total_contributions || loan.totalContributions || 0);
        }
        const fromSchedule = loan.schedule && loan.schedule[0] && Number(loan.schedule[0].admin_fee);
        if (Number.isFinite(fromSchedule) && fromSchedule > 0) return fromSchedule;
        return RATES.ADMIN_FEE_STANDARD;
    },

    /**
     * Extra admin due for an open installment (assessment candidate).
     * Amount = months × monthly admin. Does not mutate state.
     * Requires an active loan and a pending/partial schedule row with due_date —
     * never falls back to payments_made-derived dates (avoids accruing on
     * completed loans).
     */
    calculateExtraAdminDue(loan, entry, asOfDate, gracePeriodDays) {
        const empty = { months: 0, amount: 0, monthlyAdmin: 0 };
        if (!loan || !this.isLateFeesEligible(loan)) return empty;
        const loanStatus = String(loan.status || 'active').toLowerCase();
        if (loanStatus && loanStatus !== 'active') return empty;
        const open = entry &&
            (entry.status === 'pending' || entry.status === 'partial') &&
            entry.due_date
            ? entry
            : null;
        if (!open) return empty;
        const monthlyAdmin = this.getMonthlyAdminFeeForLoan(loan);
        const months = this.countExtraAdminMonths(
            open.due_date, asOfDate || new Date(), gracePeriodDays);
        return {
            months,
            monthlyAdmin,
            amount: this.round(months * monthlyAdmin)
        };
    },

    /**
     * Live late penalty + post-grace extra admin for an open installment.
     * Does not mutate the loan — used by payment UI and portal statement packs
     * so unpaid accrued fees appear before they are persisted on payment.
     */
    assessOpenInstallmentFees(loan, openEntry, asOfDate, gracePeriodDays) {
        const result = {
            latePenalty: 0,
            latePenaltyAssessedCandidate: 0,
            daysLate: 0,
            isPaymentLate: false,
            extraAdminDue: 0,
            extraAdminMonths: 0,
            extraAdminAssessedCandidate: 0
        };
        if (!loan || !this.isLateFeesEligible(loan)) return result;
        const loanStatus = String(loan.status || 'active').toLowerCase();
        if (loanStatus && loanStatus !== 'active') return result;

        const grace = typeof gracePeriodDays === 'number' ? gracePeriodDays : 3;
        const asOf = asOfDate instanceof Date ? asOfDate : new Date(asOfDate || Date.now());
        if (isNaN(asOf.getTime())) return result;

        let due = null;
        if (openEntry && openEntry.due_date) {
            due = new Date(openEntry.due_date);
            if (isNaN(due.getTime())) due = null;
        }
        if (!due) {
            due = this.getOpenInstallmentDueDate(loan);
        }
        if (!due || isNaN(due.getTime())) return result;

        const graceCutoff = new Date(due.getTime());
        graceCutoff.setDate(graceCutoff.getDate() + grace);
        if (asOf > graceCutoff) {
            result.daysLate = Math.floor((asOf - due) / (1000 * 60 * 60 * 24));
            const assessed = this.calculateLatePenalty(
                result.daysLate - grace, loan.remaining_principal || 0);
            const priorAssessed = Number(openEntry && openEntry.late_penalty_assessed) || 0;
            result.latePenaltyAssessedCandidate = Math.max(priorAssessed, assessed);
            const alreadyPaid = Number(
                (openEntry && openEntry.paid_breakdown || {}).late_penalty
            ) || 0;
            result.latePenalty = Math.max(
                0, this.round(result.latePenaltyAssessedCandidate - alreadyPaid));
            result.isPaymentLate = result.latePenalty > 0.01 || assessed > 0;
        }

        const extra = this.calculateExtraAdminDue(loan, openEntry, asOf, grace);
        const priorExtra = Number(openEntry && openEntry.extra_admin_assessed) || 0;
        result.extraAdminAssessedCandidate = Math.max(priorExtra, extra.amount);
        result.extraAdminMonths = extra.months;
        const baseAdmin = Number(openEntry && openEntry.admin_fee) || 0;
        const paidAdmin = Number(
            (openEntry && openEntry.paid_breakdown || {}).admin
        ) || 0;
        const totalAdminOwed = baseAdmin + result.extraAdminAssessedCandidate;
        const unpaidAdmin = Math.max(0, totalAdminOwed - paidAdmin);
        const unpaidBase = Math.max(0, baseAdmin - Math.min(paidAdmin, baseAdmin));
        result.extraAdminDue = Math.max(0, this.round(unpaidAdmin - unpaidBase));
        return result;
    },

    /**
     * Admin still owed on a schedule entry including extra_admin_assessed.
     */
    getEntryEffectiveAdminDue(entry) {
        if (!entry) return 0;
        const paid = (entry.paid_breakdown && Number(entry.paid_breakdown.admin)) || 0;
        const base = Number(entry.admin_fee) || 0;
        const extra = Number(entry.extra_admin_assessed) || 0;
        return Math.max(0, this.round(base + extra - paid));
    },

    /**
     * Refresh loan-level payment behavior signals (for metrics / UI).
     */
    updateLoanPaymentSignals(loan, gracePeriodDays, asOfDate) {
        if (!loan) return loan;
        if (typeof gracePeriodDays !== 'number') gracePeriodDays = 3;
        const asOf = asOfDate ? new Date(asOfDate) : new Date();
        const open = Array.isArray(loan.schedule)
            ? loan.schedule.find(p => p && (p.status === 'pending' || p.status === 'partial'))
            : null;
        // Only measure past-grace against a real open installment — never a
        // payments_made fallback (completed loans must not keep accruing).
        const due = open && open.due_date ? new Date(open.due_date) : null;
        let daysPastGrace = 0;
        if (due && !isNaN(due.getTime())) {
            const graceEnd = new Date(due.getTime());
            graceEnd.setDate(graceEnd.getDate() + gracePeriodDays);
            if (asOf > graceEnd) {
                daysPastGrace = Math.floor((asOf - graceEnd) / 86400000);
            }
        }
        const extra = this.calculateExtraAdminDue(loan, open, asOf, gracePeriodDays);
        const history = Array.isArray(loan.payment_history) ? loan.payment_history : [];
        const partialPaymentCount = history.filter(h => h && h.payment_status === 'partial').length
            + (Array.isArray(loan.schedule)
                ? loan.schedule.filter(p => p && p.status === 'partial').length
                : 0);
        const consecutiveMissed = this.countConsecutiveMissedPayments(loan);
        const last = history.length ? history[history.length - 1] : null;

        loan.payment_signals = {
            extra_admin_months: Math.max(
                Number(open && open.extra_admin_assessed
                    ? Math.round((Number(open.extra_admin_assessed) || 0) /
                        Math.max(1, extra.monthlyAdmin || this.getMonthlyAdminFeeForLoan(loan)))
                    : 0),
                extra.months
            ),
            extra_admin_assessed: Number(open && open.extra_admin_assessed) || extra.amount,
            days_past_grace: daysPastGrace,
            partial_payment_count: partialPaymentCount,
            consecutive_missed: consecutiveMissed,
            last_payment_status: last ? (last.payment_status || null) : null,
            escalation_level: this.getEscalationLevel(consecutiveMissed)
        };
        return loan;
    },

    /** Reliability band labels for UI. */
    getReliabilityBand(score) {
        if (score == null || !Number.isFinite(score)) {
            return { id: 'building', label: 'Building', min: null, max: null };
        }
        if (score >= 90) return { id: 'excellent', label: 'Excellent', min: 90, max: 100 };
        if (score >= 75) return { id: 'good', label: 'Good', min: 75, max: 89 };
        if (score >= 50) return { id: 'watch', label: 'Watch', min: 50, max: 74 };
        if (score >= 25) return { id: 'poor', label: 'Poor', min: 25, max: 49 };
        return { id: 'critical', label: 'Critical', min: 0, max: 24 };
    },

    _parseEventDate(value) {
        if (!value) return null;
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    },

    _inRollingWindow(date, asOf, windowMonths) {
        const d = this._parseEventDate(date);
        if (!d) return false;
        const end = asOf ? new Date(asOf) : new Date();
        const start = new Date(end.getTime());
        start.setMonth(start.getMonth() - (windowMonths || 12));
        return d >= start && d <= end;
    },

    /**
     * Loans linked to a client by account number, memberNumber, or name.
     */
    getClientLoans(client, loans) {
        const list = Array.isArray(loans) ? loans : [];
        const acctRaw = client && (client.account_number || client.accountNumber);
        const acctNorm = acctRaw ? String(acctRaw).trim().toUpperCase() : '';
        const memberNumber = client && client.memberNumber;
        const name = client && (client.name || [
            client.first_name || client.firstName || '',
            client.last_name || client.lastName || ''
        ].join(' ').trim());
        return list.filter(l => {
            if (!l) return false;
            if (acctNorm) {
                const loanAcct = String(
                    l.account_number || l.accountNumber || l.client_account || ''
                ).trim().toUpperCase();
                if (loanAcct && loanAcct === acctNorm) return true;
            }
            if (memberNumber != null && l.memberNumber === memberNumber) return true;
            if (name && l.client_name &&
                String(l.client_name).toLowerCase() === String(name).toLowerCase()) {
                return true;
            }
            return false;
        });
    },

    /**
     * Count missed contribution months in the rolling window for a stockvel member.
     * Expected months = membership months overlapping the window; a month is
     * covered if any contribution/loan_payment receipt falls in that month.
     */
    countMissedContributionMonths(member, receipts, asOf, windowMonths, gracePeriodDays) {
        if (!member || !member.membershipStartDate) return 0;
        if (typeof gracePeriodDays !== 'number') gracePeriodDays = 3;
        const end = asOf ? new Date(asOf) : new Date();
        const windowStart = new Date(end.getTime());
        windowStart.setMonth(windowStart.getMonth() - (windowMonths || 12));
        const memStart = new Date(member.membershipStartDate);
        const memEnd = member.membershipEndDate
            ? new Date(member.membershipEndDate)
            : end;
        if (isNaN(memStart.getTime())) return 0;

        const rangeStart = memStart > windowStart ? memStart : windowStart;
        const rangeEnd = memEnd < end ? memEnd : end;
        if (rangeStart > rangeEnd) return 0;

        const covered = new Set();
        (Array.isArray(receipts) ? receipts : []).forEach(r => {
            if (!r || r.memberNumber !== member.memberNumber) return;
            if (r.type && r.type !== 'contribution' && r.type !== 'loan_payment') return;
            const d = this._parseEventDate(r.date);
            if (!d || d < rangeStart || d > rangeEnd) return;
            covered.add(`${d.getFullYear()}-${d.getMonth()}`);
        });

        let missed = 0;
        const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
        const last = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
        while (cursor <= last) {
            // Current unfinished month is not counted as missed yet.
            const isCurrentMonth = cursor.getFullYear() === end.getFullYear() &&
                cursor.getMonth() === end.getMonth();
            if (!isCurrentMonth) {
                const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
                if (!covered.has(key)) missed += 1;
            }
            cursor.setMonth(cursor.getMonth() + 1);
        }
        return missed;
    },

    /**
     * Loan-track score components for the rolling window (no standing ceilings).
     */
    _scoreLoanTrack(clientLoans, asOf, windowMonths, gracePeriodDays) {
        const events = [];
        let lateCount = 0;
        let partialCount = 0;
        let onTimeCount = 0;
        let missedMonths = 0;
        let extraAdminMonths = 0;
        let maxConsecutiveMissed = 0;
        let defaultedLoans = 0;

        clientLoans.forEach(loan => {
            this.updateLoanPaymentSignals(loan, gracePeriodDays, asOf);
            const signals = loan.payment_signals || {};
            maxConsecutiveMissed = Math.max(maxConsecutiveMissed, signals.consecutive_missed || 0);
            if (loan.status === 'defaulted') defaultedLoans += 1;

            (loan.payment_history || []).forEach(h => {
                if (!h) return;
                const when = h.date || h.payment_date;
                if (!this._inRollingWindow(when, asOf, windowMonths)) return;
                const st = h.payment_status;
                const clean = st === 'on-time' && !(Number(h.late_penalty) > 0);
                if (st === 'late') lateCount += 1;
                else if (st === 'partial') partialCount += 1;
                else if (st === 'on-time') onTimeCount += 1;
                events.push({
                    date: this._parseEventDate(when),
                    kind: 'loan',
                    status: st,
                    clean: clean && st === 'on-time'
                });
            });

            // Missed installment months: overdue open schedule rows in window.
            const today = asOf ? new Date(asOf) : new Date();
            (loan.schedule || []).forEach(entry => {
                if (!entry || (entry.status !== 'pending' && entry.status !== 'partial')) return;
                if (!entry.due_date) return;
                const due = new Date(entry.due_date);
                if (isNaN(due.getTime()) || due > today) return;
                if (!this._inRollingWindow(entry.due_date, asOf, windowMonths)) return;
                const graceEnd = new Date(due.getTime());
                graceEnd.setDate(graceEnd.getDate() + gracePeriodDays);
                if (today > graceEnd) missedMonths += 1;
            });

            // Extra admin months: active open installments only (signals already
            // zero out completed / no-open loans).
            if (String(loan.status || '').toLowerCase() === 'active') {
                extraAdminMonths += Number(signals.extra_admin_months) || 0;
            }
        });

        events.sort((a, b) => (a.date || 0) - (b.date || 0));
        let cleanStreak = 0;
        for (let i = events.length - 1; i >= 0; i--) {
            if (events[i].clean) cleanStreak += 1;
            else break;
        }

        const penLate = Math.min(5, lateCount) * 6;
        const penPartial = Math.min(6, partialCount) * 4;
        const penMissed = Math.min(3, missedMonths) * 10;
        const penExtra = Math.min(6, extraAdminMonths) * 5;
        const credits = cleanStreak * 5;
        let raw = 100 - penLate - penPartial - penMissed - penExtra + credits;
        raw = Math.max(0, Math.min(100, Math.round(raw)));

        const totalEvents = lateCount + partialCount + onTimeCount;
        return {
            score: raw,
            late_count: lateCount,
            partial_count: partialCount,
            on_time_count: onTimeCount,
            on_time_rate: totalEvents ? Math.round((onTimeCount / totalEvents) * 100) : null,
            missed_installment_months: missedMonths,
            extra_admin_months: extraAdminMonths,
            max_consecutive_missed: maxConsecutiveMissed,
            defaulted_loans: defaultedLoans,
            clean_streak: cleanStreak,
            scored_events: totalEvents,
            penalties: {
                late: penLate,
                partial: penPartial,
                missed: penMissed,
                extra_admin: penExtra,
                total: penLate + penPartial + penMissed + penExtra
            },
            credits: { clean_streak: credits }
        };
    },

    /**
     * Membership-track score for stockvel (rolling window).
     */
    _scoreMembershipTrack(member, receipts, asOf, windowMonths, gracePeriodDays) {
        if (!member) {
            return {
                score: null,
                missed_contribution_months: 0,
                contribution_events: 0,
                on_time_contributions: 0,
                early_exit: false,
                clean_streak: 0,
                scored_events: 0,
                penalties: { missed: 0, early_exit: 0, total: 0 },
                credits: { clean_streak: 0 }
            };
        }
        const missed = this.countMissedContributionMonths(
            member, receipts, asOf, windowMonths, gracePeriodDays);
        const windowReceipts = (Array.isArray(receipts) ? receipts : []).filter(r =>
            r && r.memberNumber === member.memberNumber &&
            (r.type === 'contribution' || r.type === 'loan_payment') &&
            this._inRollingWindow(r.date, asOf, windowMonths)
        );
        windowReceipts.sort((a, b) =>
            (this._parseEventDate(a.date) || 0) - (this._parseEventDate(b.date) || 0));

        // Consecutive contribution receipts from most recent, with ≤45-day gaps.
        // An open missed-month gap at the tip zeros the streak.
        let cleanStreak = 0;
        const end = asOf ? new Date(asOf) : new Date();
        let cursor = end;
        for (let i = windowReceipts.length - 1; i >= 0; i--) {
            const d = this._parseEventDate(windowReceipts[i].date);
            if (!d) break;
            const gapDays = (cursor.getTime() - d.getTime()) / 86400000;
            if (gapDays > 45) break;
            cleanStreak += 1;
            cursor = d;
        }
        if (missed > 0) {
            const last = windowReceipts.length
                ? this._parseEventDate(windowReceipts[windowReceipts.length - 1].date)
                : null;
            if (!last || (end - last) / 86400000 > 40) cleanStreak = 0;
        }

        const earlyExit = member.status === 'exited_early';
        const penMissed = Math.min(6, missed) * 5;
        const penExit = earlyExit ? 8 : 0;
        const credits = cleanStreak * 5;
        let raw = 100 - penMissed - penExit + credits;
        raw = Math.max(0, Math.min(100, Math.round(raw)));

        return {
            score: raw,
            missed_contribution_months: missed,
            contribution_events: windowReceipts.length,
            on_time_contributions: windowReceipts.length,
            early_exit: earlyExit,
            clean_streak: cleanStreak,
            scored_events: windowReceipts.length + missed,
            penalties: { missed: penMissed, early_exit: penExit, total: penMissed + penExit },
            credits: { clean_streak: credits }
        };
    },

    /**
     * Derive client payment metrics + redeemable reliability score (0–100).
     *
     * Rolling 12-month window + rehab credits (+5 per consecutive clean event).
     * Standing flags apply ceilings until cleared + 6 clean events.
     * Stockvel: 60% loan track + 40% membership track.
     *
     * @param {object} client
     * @param {array} loans
     * @param {object} [opts]
     * @param {array} [opts.stockvelMembers]
     * @param {array} [opts.stockvelReceipts]
     * @param {Date|string} [opts.asOf]
     * @param {number} [opts.windowMonths=12]
     * @param {number} [opts.gracePeriodDays=3]
     */
    computeClientPaymentMetrics(client, loans, opts) {
        const options = opts || {};
        const windowMonths = options.windowMonths || 12;
        const gracePeriodDays = typeof options.gracePeriodDays === 'number'
            ? options.gracePeriodDays : 3;
        const asOf = options.asOf ? new Date(options.asOf) : new Date();
        const clientLoans = this.getClientLoans(client, loans);
        const loanTrack = this._scoreLoanTrack(
            clientLoans, asOf, windowMonths, gracePeriodDays);

        const isStockvel = client &&
            ((client.client_type || client.clientType) === 'stockvel' || client.memberNumber != null);
        let member = null;
        if (isStockvel && options.stockvelMembers) {
            member = this.findStockvelMember(
                { memberNumber: client.memberNumber, accountNumber: client.account_number },
                options.stockvelMembers
            );
        }
        const memberTrack = this._scoreMembershipTrack(
            member, options.stockvelReceipts || [], asOf, windowMonths, gracePeriodDays);

        const blendWeights = isStockvel && memberTrack.score != null
            ? { loan: 0.6, membership: 0.4 }
            : { loan: 1, membership: 0 };

        let blended = loanTrack.score;
        if (blendWeights.membership > 0 && memberTrack.score != null) {
            blended = Math.round(
                loanTrack.score * blendWeights.loan +
                memberTrack.score * blendWeights.membership
            );
        }

        const status = (client && client.status) || 'active';
        const blacklisted = status === 'blacklisted';
        const defaulted = status === 'defaulted' || loanTrack.defaulted_loans > 0;
        const cleanStreak = Math.max(loanTrack.clean_streak, memberTrack.clean_streak || 0);
        const cleanNeeded = 6;
        let ceiling = null;
        let ceilingReason = null;
        if (blacklisted) {
            ceiling = 40;
            ceilingReason = 'blacklisted';
        } else if (defaulted) {
            ceiling = 60;
            ceilingReason = 'defaulted';
        }
        // Ceiling lifts only after flags clear AND rehab streak.
        let score = blended;
        if (ceiling != null) {
            if (cleanStreak < cleanNeeded || blacklisted || defaulted) {
                score = Math.min(score, ceiling);
            }
        }
        score = Math.max(0, Math.min(100, Math.round(score)));

        const scoredEvents = loanTrack.scored_events + (memberTrack.scored_events || 0);
        const provisional = scoredEvents < 2;
        const band = this.getReliabilityBand(provisional ? null : score);

        const prev = client && Number.isFinite(Number(client.payment_score))
            ? Number(client.payment_score) : null;
        let direction = 'stable';
        if (!provisional && prev != null) {
            if (score > prev) direction = 'improving';
            else if (score < prev) direction = 'worsening';
        }

        return {
            score: provisional ? null : score,
            band,
            provisional,
            direction,
            previous_score: prev,
            loan_score: loanTrack.score,
            membership_score: memberTrack.score,
            blend_weights: blendWeights,
            penalties: {
                loan: loanTrack.penalties,
                membership: memberTrack.penalties,
                total: (loanTrack.penalties.total || 0) + (memberTrack.penalties.total || 0)
            },
            credits: {
                loan: loanTrack.credits,
                membership: memberTrack.credits,
                total: (loanTrack.credits.clean_streak || 0) +
                    (memberTrack.credits.clean_streak || 0)
            },
            ceiling,
            ceiling_reason: ceilingReason,
            redemption: {
                clean_streak: cleanStreak,
                clean_needed: cleanNeeded,
                window_months: windowMonths,
                ceiling_cleared: ceiling == null || (!blacklisted && !defaulted && cleanStreak >= cleanNeeded)
            },
            loans_considered: clientLoans.length,
            on_time_count: loanTrack.on_time_count,
            late_count: loanTrack.late_count,
            partial_count: loanTrack.partial_count,
            on_time_rate: loanTrack.on_time_rate,
            max_consecutive_missed: loanTrack.max_consecutive_missed,
            extra_admin_months: loanTrack.extra_admin_months,
            missed_installment_months: loanTrack.missed_installment_months,
            missed_contribution_months: memberTrack.missed_contribution_months || 0,
            defaulted_loans: loanTrack.defaulted_loans,
            blacklisted,
            defaulted,
            is_stockvel: !!isStockvel
        };
    },

    /**
     * One-line posture for relationship header.
     */
    getClientPosture(client, loans, metrics, gracePeriodDays) {
        if (client && client.status === 'blacklisted') return 'Blacklisted';
        if (client && client.status === 'defaulted') return 'Defaulted — rehab required';
        const clientLoans = this.getClientLoans(client, loans)
            .filter(l => l.status === 'active');
        if (!clientLoans.length) {
            if (metrics && metrics.is_stockvel) return 'No active loan — membership only';
            return 'No active loans';
        }
        let worstMissed = 0;
        let postGrace = false;
        let inGrace = false;
        const today = new Date();
        const grace = typeof gracePeriodDays === 'number' ? gracePeriodDays : 3;
        clientLoans.forEach(loan => {
            this.updateLoanPaymentSignals(loan, grace, today);
            const s = loan.payment_signals || {};
            worstMissed = Math.max(worstMissed, s.consecutive_missed || 0);
            if ((s.extra_admin_months || 0) > 0 || (s.days_past_grace || 0) > 0) postGrace = true;
            const due = this.getOpenInstallmentDueDate(loan);
            if (due) {
                const graceEnd = new Date(due.getTime());
                graceEnd.setDate(graceEnd.getDate() + grace);
                if (today > due && today <= graceEnd) inGrace = true;
            }
        });
        if (worstMissed >= 2) return `At risk (${worstMissed} missed)`;
        if (postGrace) return 'Post-grace admin accruing';
        if (inGrace) return 'In grace';
        if (worstMissed === 1) return 'Warning — 1 missed installment';
        return 'On track';
    },

    /**
     * Build chronological behavior timeline (newest first) for the relationship page.
     */
    buildClientRelationshipTimeline(client, state, opts) {
        const options = opts || {};
        const months = options.months || 24;
        const asOf = options.asOf ? new Date(options.asOf) : new Date();
        const items = [];
        const loans = this.getClientLoans(client, state && state.loans);
        loans.forEach(loan => {
            (loan.payment_history || []).forEach(h => {
                if (!h || !this._inRollingWindow(h.date || h.payment_date, asOf, months)) return;
                items.push({
                    date: h.date || h.payment_date,
                    type: 'loan_payment',
                    title: `Loan #${loan.loan_id} payment`,
                    detail: `${this.formatCurrency(h.amount || 0)} · ${h.payment_status || 'recorded'}`,
                    meta: h
                });
            });
            if (loan.status === 'completed' && loan.completion_date &&
                this._inRollingWindow(loan.completion_date, asOf, months)) {
                items.push({
                    date: loan.completion_date,
                    type: 'loan_completed',
                    title: `Loan #${loan.loan_id} completed`,
                    detail: 'Fully paid',
                    meta: { loan_id: loan.loan_id }
                });
            }
            if (loan.status === 'defaulted' &&
                this._inRollingWindow(loan.updated_at || loan.created_at, asOf, months)) {
                items.push({
                    date: loan.updated_at || loan.created_at,
                    type: 'loan_defaulted',
                    title: `Loan #${loan.loan_id} defaulted`,
                    detail: 'Marked defaulted',
                    meta: { loan_id: loan.loan_id }
                });
            }
            (loan.schedule || []).forEach(entry => {
                if (!entry) return;
                if (Number(entry.extra_admin_assessed) > 0 && entry.due_date &&
                    this._inRollingWindow(entry.due_date, asOf, months)) {
                    items.push({
                        date: entry.due_date,
                        type: 'extra_admin',
                        title: `Loan #${loan.loan_id} extra admin`,
                        detail: this.formatCurrency(entry.extra_admin_assessed),
                        meta: entry
                    });
                }
                if (Number(entry.late_penalty_assessed) > 0 && entry.due_date &&
                    this._inRollingWindow(entry.due_date, asOf, months)) {
                    items.push({
                        date: entry.due_date,
                        type: 'late_penalty',
                        title: `Loan #${loan.loan_id} late penalty`,
                        detail: this.formatCurrency(entry.late_penalty_assessed),
                        meta: entry
                    });
                }
            });
        });

        const memberNumber = client && client.memberNumber;
        if (memberNumber != null && state && Array.isArray(state.stockvelReceipts)) {
            state.stockvelReceipts.forEach(r => {
                if (!r || r.memberNumber !== memberNumber) return;
                if (!this._inRollingWindow(r.date, asOf, months)) return;
                items.push({
                    date: r.date,
                    type: 'stockvel_receipt',
                    title: `Stockvel ${r.type || 'receipt'}`,
                    detail: `${this.formatCurrency(r.amount || 0)}${r.notes ? ' · ' + r.notes : ''}`,
                    meta: r
                });
            });
        }

        items.sort((a, b) =>
            (this._parseEventDate(b.date) || 0) - (this._parseEventDate(a.date) || 0));
        return items;
    },

    /**
     * Lifetime economics snapshot for the relationship page.
     */
    buildClientRelationshipEconomics(client, state) {
        const loans = this.getClientLoans(client, state && state.loans);
        let disbursed = 0;
        let repaidPrincipal = 0;
        let interestEarned = 0;
        let feesEarned = 0;
        let penaltiesEarned = 0;
        let exposure = 0;
        loans.forEach(loan => {
            const principal = Number(loan.principal_amount || loan.principal || 0);
            disbursed += principal;
            repaidPrincipal += Number(loan.total_principal_received) ||
                Math.max(0, principal - (Number(loan.remaining_principal) || 0));
            interestEarned += Number(loan.interest_paid) || 0;
            feesEarned += (Number(loan.initiation_fee_paid) || 0);
            (loan.payment_history || []).forEach(h => {
                feesEarned += Number(h.admin_fee) || 0;
                penaltiesEarned += Number(h.late_penalty) || 0;
            });
            if (loan.status === 'active') {
                exposure += Number(loan.remaining_principal) || 0;
            }
        });

        let memberFunds = 0;
        let contributions = 0;
        let bonusUnpaid = 0;
        let contributionConsistency = null;
        const memberNumber = client && client.memberNumber;
        let member = null;
        if (memberNumber != null && state && state.stockvelMembers) {
            member = this.findStockvelMember(
                { memberNumber, accountNumber: client.account_number },
                state.stockvelMembers
            );
            if (member) {
                contributions = Number(member.totalContributions) || 0;
                bonusUnpaid = Number(member.accumulatedBonus) || 0;
                memberFunds = contributions + bonusUnpaid;
                exposure += memberFunds;
                const missed = this.countMissedContributionMonths(
                    member, state.stockvelReceipts || [], new Date(), 12, 3);
                const expected = missed + (Array.isArray(state.stockvelReceipts)
                    ? state.stockvelReceipts.filter(r =>
                        r && r.memberNumber === memberNumber &&
                        (r.type === 'contribution' || r.type === 'loan_payment') &&
                        this._inRollingWindow(r.date, new Date(), 12)).length
                    : 0);
                contributionConsistency = expected > 0
                    ? Math.round(((expected - missed) / expected) * 100)
                    : null;
            }
        }

        const revenue = interestEarned + feesEarned + penaltiesEarned;
        return {
            disbursed: this.round(disbursed),
            repaid_principal: this.round(repaidPrincipal),
            interest_earned: this.round(interestEarned),
            fees_earned: this.round(feesEarned),
            penalties_earned: this.round(penaltiesEarned),
            revenue: this.round(revenue),
            exposure: this.round(exposure),
            member_funds_held: this.round(memberFunds),
            contributions: this.round(contributions),
            bonus_unpaid: this.round(bonusUnpaid),
            contribution_consistency: contributionConsistency,
            capital_at_risk: this.round(
                loans.filter(l => l.status === 'active')
                    .reduce((s, l) => s + (Number(l.remaining_principal) || 0), 0)
            )
        };
    },

    /** Fixed ZAR principal bands for lending-pattern views. */
    LENDING_AMOUNT_BANDS: [
        { id: 'lt5k', label: 'Under R5,000', min: 0, max: 4999.995 },
        { id: '5_10k', label: 'R5,000 – R10,000', min: 5000, max: 9999.995 },
        { id: '10_20k', label: 'R10,000 – R20,000', min: 10000, max: 19999.995 },
        { id: '20_50k', label: 'R20,000 – R50,000', min: 20000, max: 49999.995 },
        { id: '50k_plus', label: 'R50,000+', min: 50000, max: Number.POSITIVE_INFINITY }
    ],

    loanPrincipalAmount(loan) {
        if (!loan) return 0;
        return Number(loan.original_principal || loan.principal_amount || loan.principal) || 0;
    },

    loanTermMonths(loan) {
        if (!loan) return 0;
        return Number(loan.term_months || loan.term) || 0;
    },

    amountBandForPrincipal(principal) {
        const p = Number(principal) || 0;
        const bands = this.LENDING_AMOUNT_BANDS || [];
        for (let i = 0; i < bands.length; i++) {
            const b = bands[i];
            if (p >= b.min && p <= b.max) return b;
        }
        return bands[bands.length - 1] || { id: 'unknown', label: 'Unknown', min: 0, max: 0 };
    },

    _medianSorted(sorted) {
        if (!sorted || !sorted.length) return null;
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2) return sorted[mid];
        return (sorted[mid - 1] + sorted[mid]) / 2;
    },

    /**
     * Historical lending patterns for a client by amount band and loan term.
     * Decision support only — does not set hard limits.
     */
    buildClientLendingPatterns(client, state) {
        const all = this.getClientLoans(client, state && state.loans);
        const loans = all.filter(l => {
            if (!l) return false;
            const st = String(l.status || '').toLowerCase();
            if (st === 'cancelled' || st === 'canceled' || st === 'draft' || st === 'void') {
                return false;
            }
            return this.loanPrincipalAmount(l) > 0 && this.loanTermMonths(l) > 0;
        });

        const principals = loans.map(l => this.loanPrincipalAmount(l)).sort((a, b) => a - b);
        const terms = loans.map(l => this.loanTermMonths(l)).sort((a, b) => a - b);

        const byTermMap = new Map();
        const byBandMap = new Map();
        const comboMap = new Map();

        (this.LENDING_AMOUNT_BANDS || []).forEach(b => {
            byBandMap.set(b.id, {
                id: b.id,
                label: b.label,
                min: b.min,
                max: b.max,
                count: 0,
                total_principal: 0,
                terms: [],
                active_count: 0,
                completed_count: 0
            });
        });

        loans.forEach(loan => {
            const principal = this.loanPrincipalAmount(loan);
            const term = this.loanTermMonths(loan);
            const st = String(loan.status || '').toLowerCase();
            const isActive = st === 'active';
            const isCompleted = st === 'completed' || st === 'paid' || st === 'closed';

            if (!byTermMap.has(term)) {
                byTermMap.set(term, {
                    term_months: term,
                    count: 0,
                    total_principal: 0,
                    principals: [],
                    active_count: 0,
                    completed_count: 0
                });
            }
            const tRow = byTermMap.get(term);
            tRow.count += 1;
            tRow.total_principal += principal;
            tRow.principals.push(principal);
            if (isActive) tRow.active_count += 1;
            if (isCompleted) tRow.completed_count += 1;

            const band = this.amountBandForPrincipal(principal);
            const bRow = byBandMap.get(band.id);
            if (bRow) {
                bRow.count += 1;
                bRow.total_principal += principal;
                bRow.terms.push(term);
                if (isActive) bRow.active_count += 1;
                if (isCompleted) bRow.completed_count += 1;
            }

            const comboKey = band.id + '|' + term;
            if (!comboMap.has(comboKey)) {
                comboMap.set(comboKey, {
                    band_id: band.id,
                    band_label: band.label,
                    term_months: term,
                    count: 0,
                    total_principal: 0
                });
            }
            const cRow = comboMap.get(comboKey);
            cRow.count += 1;
            cRow.total_principal += principal;
        });

        const by_term = Array.from(byTermMap.values())
            .map(row => ({
                term_months: row.term_months,
                count: row.count,
                total_principal: this.round(row.total_principal),
                avg_principal: this.round(row.total_principal / row.count),
                min_principal: this.round(Math.min.apply(null, row.principals)),
                max_principal: this.round(Math.max.apply(null, row.principals)),
                active_count: row.active_count,
                completed_count: row.completed_count
            }))
            .sort((a, b) => b.count - a.count || a.term_months - b.term_months);

        const by_amount_band = Array.from(byBandMap.values())
            .filter(row => row.count > 0)
            .map(row => {
                const termSum = row.terms.reduce((s, t) => s + t, 0);
                return {
                    id: row.id,
                    label: row.label,
                    min: row.min,
                    max: row.max,
                    count: row.count,
                    total_principal: this.round(row.total_principal),
                    avg_principal: this.round(row.total_principal / row.count),
                    avg_term: this.round(termSum / row.terms.length),
                    active_count: row.active_count,
                    completed_count: row.completed_count
                };
            })
            .sort((a, b) => b.count - a.count || a.min - b.min);

        const combinations = Array.from(comboMap.values())
            .map(row => ({
                band_id: row.band_id,
                band_label: row.band_label,
                term_months: row.term_months,
                count: row.count,
                avg_principal: this.round(row.total_principal / row.count)
            }))
            .sort((a, b) => b.count - a.count || a.term_months - b.term_months);

        const mostCommonTerm = by_term.length ? by_term[0].term_months : null;
        const mostCommonBand = by_amount_band.length ? by_amount_band[0] : null;
        const topCombo = combinations.length ? combinations[0] : null;

        const activeLoans = loans.filter(l => String(l.status || '').toLowerCase() === 'active');
        const current_active = activeLoans.map(l => ({
            loan_id: l.loan_id || l.id || null,
            principal: this.round(this.loanPrincipalAmount(l)),
            remaining_principal: this.round(Number(l.remaining_principal) || 0),
            term_months: this.loanTermMonths(l),
            loan_type: l.loan_type || (l.isStockvelLoan ? 'stockvel' : 'standard')
        }));

        return {
            loans_considered: loans.length,
            by_term,
            by_amount_band,
            combinations,
            typical: {
                most_common_term: mostCommonTerm,
                most_common_band: mostCommonBand,
                top_combination: topCombo,
                median_principal: principals.length
                    ? this.round(this._medianSorted(principals)) : null,
                avg_principal: principals.length
                    ? this.round(principals.reduce((s, p) => s + p, 0) / principals.length)
                    : null,
                min_principal: principals.length ? this.round(principals[0]) : null,
                max_principal: principals.length
                    ? this.round(principals[principals.length - 1]) : null,
                median_term: terms.length ? this.round(this._medianSorted(terms)) : null,
                min_term: terms.length ? terms[0] : null,
                max_term: terms.length ? terms[terms.length - 1] : null
            },
            current_active
        };
    },

    /**
     * Plain-text summary of lending patterns for prompts / confirmations.
     */
    formatLendingPatternBrief(patterns) {
        if (!patterns || !patterns.loans_considered) {
            return 'No prior loan history for amount/term patterns.';
        }
        const t = patterns.typical || {};
        const lines = [];
        lines.push('Loans in pattern: ' + patterns.loans_considered);
        if (t.median_principal != null) {
            lines.push(
                'Typical amount: median ' + this.formatCurrency(t.median_principal) +
                ' (avg ' + this.formatCurrency(t.avg_principal) +
                '; range ' + this.formatCurrency(t.min_principal) +
                ' – ' + this.formatCurrency(t.max_principal) + ')'
            );
        }
        if (t.most_common_term != null) {
            lines.push(
                'Most common term: ' + t.most_common_term + ' months' +
                (t.median_term != null ? ' (median ' + t.median_term + ')' : '') +
                (t.max_term != null ? '; longest ' + t.max_term : '')
            );
        }
        if (t.most_common_band) {
            lines.push(
                'Most common amount band: ' + t.most_common_band.label +
                ' (' + t.most_common_band.count + ' loan' +
                (t.most_common_band.count === 1 ? '' : 's') + ')'
            );
        }
        if (t.top_combination) {
            lines.push(
                'Most common pattern: ' + t.top_combination.band_label +
                ' over ' + t.top_combination.term_months + ' months' +
                ' (' + t.top_combination.count + '×)'
            );
        }
        const topTerms = (patterns.by_term || []).slice(0, 3);
        if (topTerms.length) {
            lines.push(
                'By term: ' + topTerms.map(r =>
                    r.term_months + 'm×' + r.count +
                    ' (avg ' + this.formatCurrency(r.avg_principal) + ')'
                ).join('; ')
            );
        }
        const actives = patterns.current_active || [];
        if (actives.length) {
            lines.push(
                'Active now: ' + actives.map(a =>
                    this.formatCurrency(a.principal) + ' / ' + a.term_months + 'm' +
                    ' (owed ' + this.formatCurrency(a.remaining_principal) + ')'
                ).join('; ')
            );
        }
        return lines.join('\n');
    },

    /**
     * Decision-support notes when adding capital (top-up).
     * Does not block — operators decide.
     */
    assessTopUpAgainstPatterns(patterns, currentLoan, addAmount) {
        const add = Number(addAmount) || 0;
        const currentPrincipal = this.loanPrincipalAmount(currentLoan);
        const newPrincipal = currentPrincipal + add;
        const term = this.loanTermMonths(currentLoan);
        const notes = [];
        let severity = 'info'; // info | watch | caution

        if (!patterns || !patterns.loans_considered) {
            notes.push('No historical amount/term pattern — treat as a new-file decision.');
            return {
                severity,
                new_principal: this.round(newPrincipal),
                new_band: this.amountBandForPrincipal(newPrincipal),
                notes,
                summary: notes[0]
            };
        }

        const t = patterns.typical || {};
        const newBand = this.amountBandForPrincipal(newPrincipal);
        notes.push(
            'After top-up: principal ' + this.formatCurrency(newPrincipal) +
            ' (' + newBand.label + ') on ' + term + '-month term.'
        );

        if (t.max_principal != null && newPrincipal > t.max_principal + 0.005) {
            severity = 'caution';
            notes.push(
                'Above this client\'s largest historical loan (' +
                this.formatCurrency(t.max_principal) + ').'
            );
        } else if (t.median_principal != null && newPrincipal > t.median_principal * 1.5) {
            severity = severity === 'caution' ? severity : 'watch';
            notes.push(
                'Materially above median historical amount (' +
                this.formatCurrency(t.median_principal) + ').'
            );
        } else if (t.most_common_band && newBand.id === t.most_common_band.id) {
            notes.push('Stays inside their most common amount band.');
        }

        if (t.median_principal != null && add > t.median_principal) {
            severity = severity === 'caution' ? severity : 'watch';
            notes.push(
                'Top-up alone (' + this.formatCurrency(add) +
                ') exceeds their median loan size.'
            );
        }

        const termHistory = (patterns.by_term || []).find(r => r.term_months === term);
        if (termHistory) {
            notes.push(
                'On ' + term + '-month loans they usually take about ' +
                this.formatCurrency(termHistory.avg_principal) +
                ' (n=' + termHistory.count + ').'
            );
            if (newPrincipal > termHistory.max_principal + 0.005) {
                severity = 'caution';
                notes.push(
                    'Would set a new high for their ' + term + '-month loans.'
                );
            }
        } else if (patterns.loans_considered > 0) {
            severity = severity === 'caution' ? severity : 'watch';
            notes.push('They have not previously used a ' + term + '-month term.');
        }

        const combo = (patterns.combinations || []).find(c =>
            c.band_id === newBand.id && c.term_months === term);
        if (combo) {
            notes.push(
                'Matches known pattern ' + combo.band_label + ' / ' +
                combo.term_months + 'm (' + combo.count + '×).'
            );
        }

        return {
            severity,
            new_principal: this.round(newPrincipal),
            new_band: newBand,
            notes,
            summary: notes.slice(0, 2).join(' ')
        };
    },

    /**
     * Decision-support notes when extending / shortening term.
     */
    assessTermChangeAgainstPatterns(patterns, currentLoan, newTerm) {
        const nextTerm = Number(newTerm) || 0;
        const oldTerm = this.loanTermMonths(currentLoan);
        const principal = this.loanPrincipalAmount(currentLoan);
        const band = this.amountBandForPrincipal(principal);
        const notes = [];
        let severity = 'info';
        const extensionMonths = nextTerm - oldTerm;

        if (!patterns || !patterns.loans_considered) {
            notes.push('No historical term pattern — treat as a new-file decision.');
            return {
                severity,
                old_term: oldTerm,
                new_term: nextTerm,
                extension_months: extensionMonths,
                notes,
                summary: notes[0]
            };
        }

        const t = patterns.typical || {};
        notes.push(
            'Requested term: ' + nextTerm + ' months' +
            (extensionMonths > 0
                ? ' (extend +' + extensionMonths + ' from ' + oldTerm + ')'
                : extensionMonths < 0
                    ? ' (shorten ' + extensionMonths + ' from ' + oldTerm + ')'
                    : ' (unchanged from ' + oldTerm + ')') + '.'
        );

        if (t.most_common_term != null && nextTerm === t.most_common_term) {
            notes.push('Matches their most common term.');
        } else if (t.max_term != null && nextTerm > t.max_term) {
            severity = 'caution';
            notes.push(
                'Longer than any term this client has used before (max ' +
                t.max_term + ' months).'
            );
        } else if (t.median_term != null && nextTerm > t.median_term * 1.5) {
            severity = 'watch';
            notes.push(
                'Well above their median term (' + t.median_term + ' months).'
            );
        }

        const termHistory = (patterns.by_term || []).find(r => r.term_months === nextTerm);
        if (termHistory) {
            notes.push(
                'They have taken ' + termHistory.count + ' loan(s) at ' +
                nextTerm + ' months (avg ' +
                this.formatCurrency(termHistory.avg_principal) + ').'
            );
            if (principal > termHistory.max_principal + 0.005) {
                severity = severity === 'caution' ? severity : 'watch';
                notes.push(
                    'Current principal is above what they usually borrow at this term.'
                );
            }
        } else {
            severity = severity === 'caution' ? severity : 'watch';
            notes.push('No prior loans at ' + nextTerm + ' months.');
        }

        const combo = (patterns.combinations || []).find(c =>
            c.band_id === band.id && c.term_months === nextTerm);
        if (combo) {
            notes.push(
                'Amount band ' + band.label + ' at ' + nextTerm +
                'm has appeared ' + combo.count + '× before.'
            );
        } else if (patterns.loans_considered > 0) {
            notes.push(
                'No prior ' + band.label + ' / ' + nextTerm + 'm combination.'
            );
        }

        if (extensionMonths >= 3) {
            severity = severity === 'info' ? 'watch' : severity;
            notes.push('Extension of ' + extensionMonths + ' months is material — check payment reliability.');
        }

        return {
            severity,
            old_term: oldTerm,
            new_term: nextTerm,
            extension_months: extensionMonths,
            notes,
            summary: notes.slice(0, 2).join(' ')
        };
    },

    /**
     * Determine payment status relative to due date.
     * @param {Date|string} paymentDate - When the payment was made
     * @param {Date|string} dueDate - When the payment was due
     * @param {number} amountPaid - Amount actually paid
     * @param {number} amountDue - Amount that was expected
     * @param {number} gracePeriodDays - Grace period in days (default 3)
     * @returns {string} 'on-time' | 'late' | 'partial' | 'missed'
     */
    getPaymentStatus(paymentDate, dueDate, amountPaid, amountDue, gracePeriodDays) {
        if (typeof gracePeriodDays !== 'number') gracePeriodDays = 3;
        const pDate = new Date(paymentDate);
        const dDate = new Date(dueDate);
        
        // Missed: no payment at all (amountPaid is 0 or undefined)
        if (!amountPaid || amountPaid <= 0) return 'missed';
        
        // Partial: paid something but less than 90% of expected amount
        if (amountPaid < amountDue * 0.9) return 'partial';
        
        // Add grace period to due date
        const graceCutoff = new Date(dDate);
        graceCutoff.setDate(graceCutoff.getDate() + gracePeriodDays);
        
        // Late: paid after grace period
        if (pDate > graceCutoff) return 'late';
        
        // On-time: paid within grace period
        return 'on-time';
    },

    /**
     * Calculate the number of consecutive missed/late payments for a loan.
     * Counts backwards from the most recent due payment.
     * @param {object} loan - The loan object
     * @returns {number} Count of consecutive missed payments
     */
    countConsecutiveMissedPayments(loan) {
        if (!loan.schedule || !Array.isArray(loan.schedule)) return 0;
        
        const today = new Date();
        let consecutiveMissed = 0;
        
        // Walk backwards through the schedule from the latest due payment
        for (let i = loan.schedule.length - 1; i >= 0; i--) {
            const entry = loan.schedule[i];
            
            // Skip future payments that aren't due yet
            if (entry.due_date) {
                const dueDate = new Date(entry.due_date);
                if (dueDate > today) continue;
            }
            
            // If paid, stop counting
            if (entry.status === 'paid') break;
            
            // Pending or partial past due counts as missed (partials can still
            // owe fees/penalty after principal progress advances).
            if (entry.status === 'pending' || entry.status === 'partial') {
                consecutiveMissed++;
            }
        }
        
        return consecutiveMissed;
    },

    /**
     * Get escalation level based on consecutive missed payments.
     * @param {number} missedCount - Number of consecutive missed payments
     * @returns {string} 'none' | 'warning' | 'at-risk' | 'default-suggested'
     */
    getEscalationLevel(missedCount) {
        if (missedCount >= 3) return 'default-suggested';
        if (missedCount >= 2) return 'at-risk';
        if (missedCount >= 1) return 'warning';
        return 'none';
    },

    /**
     * Due date for the open installment (pending or partial), falling back to
     * payments_made-derived date when the schedule has no open row.
     */
    getOpenInstallmentDueDate(loan) {
        if (!loan) return null;
        const schedule = Array.isArray(loan.schedule) ? loan.schedule : [];
        const open = schedule.find(p =>
            p && (p.status === 'pending' || p.status === 'partial') && p.due_date);
        if (open) {
            const due = new Date(open.due_date);
            if (!isNaN(due.getTime())) return due;
        }
        return this.getLoanPaymentDueDate(loan, loan.payments_made || 0);
    },

    /**
     * Calculate the due date for a specific payment number in a loan.
     * paymentNumber is 0-based (payments already made); due is for the next
     * installment (paymentNumber + 1 in schedule terms).
     */
    getLoanPaymentDueDate(loan, paymentNumber) {
        if (!loan.created_at || loan.start_month_index === undefined) return null;
        const loanDate = new Date(loan.created_at);
        const startMonthIndex = Number(loan.start_month_index);
        if (!Number.isFinite(startMonthIndex)) return null;
        const startYear = this.resolveScheduleStartYear(loanDate, startMonthIndex);
        return this.calculateDueDate(startYear, startMonthIndex, (Number(paymentNumber) || 0) + 1);
    },

    humanizeAdjustmentType(adjustmentType) {
        switch (adjustmentType) {
            case 'change_repayment_period':
                return 'Change repayment period';
            case 'add_amount':
                return 'Add amount to loan';
            default:
                return adjustmentType
                    ? String(adjustmentType).replace(/_/g, ' ')
                    : 'Loan adjustment';
        }
    },

    formatAdjustmentChangeLine(change) {
        if (!change) return '';
        const fmt = (format, value) => {
            if (value === null || value === undefined || value === '') return 'N/A';
            if (format === 'currency') return this.formatCurrency(Number(value) || 0);
            return String(value);
        };
        return '- ' + (change.label || 'Change') + ': ' +
            fmt(change.format, change.before) + ' -> ' + fmt(change.format, change.after);
    },

    buildChangesFromLegacyAdjustmentDetails(details) {
        const changes = [];
        if (!details || typeof details !== 'object') return changes;
        if (details.adjustmentType === 'change_repayment_period') {
            if (details.oldTerm !== undefined && details.newTerm !== undefined) {
                changes.push({
                    label: 'Term (months)', format: 'number',
                    before: details.oldTerm, after: details.newTerm
                });
            }
            if (details.oldMonthlyPayment !== undefined && details.newMonthlyPayment !== undefined) {
                changes.push({
                    label: 'Monthly Payment', format: 'currency',
                    before: details.oldMonthlyPayment, after: details.newMonthlyPayment
                });
            }
            if (details.oldTotalInterest !== undefined && details.newTotalInterest !== undefined) {
                changes.push({
                    label: 'Total Interest', format: 'currency',
                    before: details.oldTotalInterest, after: details.newTotalInterest
                });
            } else if (details.newTotalInterest !== undefined) {
                changes.push({
                    label: 'Total Interest', format: 'currency',
                    before: null, after: details.newTotalInterest
                });
            }
            if (details.oldTotalInitiationFee !== undefined &&
                details.newTotalInitiationFee !== undefined) {
                changes.push({
                    label: 'Total Initiation Fee', format: 'currency',
                    before: details.oldTotalInitiationFee, after: details.newTotalInitiationFee
                });
            }
        } else if (details.adjustmentType === 'add_amount') {
            if (details.amountAdded !== undefined) {
                changes.push({
                    label: 'Amount added', format: 'currency',
                    before: null, after: details.amountAdded
                });
            }
            if (details.oldPrincipal !== undefined && details.newPrincipal !== undefined) {
                changes.push({
                    label: 'Principal', format: 'currency',
                    before: details.oldPrincipal, after: details.newPrincipal
                });
            }
        }
        return changes;
    },

    /**
     * Collect loan adjustment events from loan-local history + global txs.
     */
    getLoanAdjustmentEvents(loan, state) {
        if (!loan) return [];
        const loanId = loan.loan_id;
        const events = [];
        const pushUnique = (ev) => {
            if (!ev) return;
            const key = ev.id
                ? 'id:' + ev.id
                : 'k:' + (ev.timestamp || '') + '|' + (ev.adjustmentType || '') + '|' + (ev.reason || '');
            if (events.some(e => {
                const k = e.id
                    ? 'id:' + e.id
                    : 'k:' + (e.timestamp || '') + '|' + (e.adjustmentType || '') + '|' + (e.reason || '');
                return k === key;
            })) return;
            events.push(ev);
        };

        (Array.isArray(loan.adjustment_history) ? loan.adjustment_history : []).forEach(e => {
            if (!e) return;
            pushUnique({
                id: e.id,
                timestamp: e.timestamp,
                adjustmentType: e.adjustmentType,
                reason: e.reason || '',
                changes: Array.isArray(e.changes) ? e.changes : [],
                meta: e.meta || {}
            });
        });

        const txs = (state && Array.isArray(state.transactions)) ? state.transactions : [];
        // One pass per transaction — prefer details, else data — so legacy rows
        // that carry both shapes cannot emit duplicate adjustment activities.
        txs.forEach(tx => {
            if (!tx || tx.type !== 'loan_adjustment') return;
            const details = tx.details || null;
            const data = tx.data || null;
            let payload = null;
            if (details && details.loanId === loanId) payload = details;
            else if (data && data.loanId === loanId) payload = data;
            if (!payload) return;
            pushUnique({
                id: tx.id || payload.id,
                timestamp: tx.timestamp || tx.date || payload.timestamp,
                adjustmentType: payload.adjustmentType,
                reason: payload.reason || '',
                changes: Array.isArray(payload.changes)
                    ? payload.changes
                    : this.buildChangesFromLegacyAdjustmentDetails(payload),
                meta: payload
            });
        });

        events.sort((a, b) =>
            (this._parseEventDate(a.timestamp) || 0) - (this._parseEventDate(b.timestamp) || 0));
        return events;
    },

    /**
     * Unified loan statement DTO for PDF, text view, and client portal.
     */
    buildLoanStatementModel(loan, state, options) {
        const opts = options || {};
        const asOf = opts.asOf ? new Date(opts.asOf) : new Date();
        if (!loan) {
            return {
                loan_id: null, client_name: '', summary: {}, financials: {},
                position: {}, activity: [], schedule: [], generated_at: asOf.toISOString()
            };
        }

        const principal = this.loanPrincipalAmount(loan);
        const term = this.loanTermMonths(loan) || Number(loan.term_months) || 0;
        const monthlyAdmin = this.getMonthlyAdminFeeForLoan(loan) || RATES.ADMIN_FEE_STANDARD;
        const totalInterest = Number(loan.total_interest) || 0;
        const totalInitiationFee = Number(loan.total_initiation_fee) || 0;
        const schedule = Array.isArray(loan.schedule) ? loan.schedule : [];
        const history = Array.isArray(loan.payment_history) ? loan.payment_history : [];

        let adminScheduled = 0;
        let adminExtraAssessed = 0;
        let adminPaid = 0;
        let latePenaltyAssessed = 0;
        let latePenaltyPaid = 0;
        schedule.forEach(entry => {
            if (!entry) return;
            adminScheduled += Number(entry.admin_fee) || 0;
            adminExtraAssessed += Number(entry.extra_admin_assessed) || 0;
            const pb = entry.paid_breakdown || {};
            adminPaid += Number(pb.admin) || 0;
            latePenaltyAssessed += Number(entry.late_penalty_assessed) || 0;
            latePenaltyPaid += Number(pb.late_penalty) || 0;
        });
        if (!schedule.length) {
            adminScheduled = term * monthlyAdmin;
            history.forEach(h => {
                adminPaid += Number(h.admin_fee) || 0;
                latePenaltyPaid += Number(h.late_penalty) || 0;
            });
        } else {
            // Prefer history late_penalty if schedule paid_breakdown empty on older loans
            const histPenalty = history.reduce((s, h) => s + (Number(h.late_penalty) || 0), 0);
            if (latePenaltyPaid < histPenalty) latePenaltyPaid = histPenalty;
        }

        // Live late/extra-admin on the open row (same rules as payment UI) so
        // portal packs are not understated when fees are not yet persisted.
        const graceDays = opts.gracePeriodDays || 3;
        const openEntry = schedule.find(e =>
            e && (e.status === 'pending' || e.status === 'partial'));
        let openLiveExtra = null;
        let openLiveLate = null;
        if (openEntry) {
            const fees = this.assessOpenInstallmentFees(loan, openEntry, asOf, graceDays);
            openLiveExtra = fees.extraAdminAssessedCandidate;
            openLiveLate = fees.latePenaltyAssessedCandidate;
            const priorExtra = Number(openEntry.extra_admin_assessed) || 0;
            const priorLate = Number(openEntry.late_penalty_assessed) || 0;
            if (openLiveExtra > priorExtra) {
                adminExtraAssessed += (openLiveExtra - priorExtra);
            }
            if (openLiveLate > priorLate) {
                latePenaltyAssessed += (openLiveLate - priorLate);
            }
        }

        const adminTotalAssessed = this.round(adminScheduled + adminExtraAssessed);
        const adminRemaining = Math.max(0, this.round(adminTotalAssessed - adminPaid));
        const latePenaltyRemaining = Math.max(0, this.round(latePenaltyAssessed - latePenaltyPaid));

        const remainingPrincipal = Number(loan.remaining_principal) || 0;
        const interestPaid = Number(loan.interest_paid) || 0;
        // Match payment allocation: never show more interest still owed than
        // max_interest_allowed − interest_paid (recalc / legacy capped loans).
        let interestRemaining = Math.max(0, this.round(totalInterest - interestPaid));
        const maxInterestAllowed = Number(loan.max_interest_allowed);
        const interestCapRemaining = Number.isFinite(maxInterestAllowed)
            ? Math.max(0, this.round(maxInterestAllowed - interestPaid))
            : null;
        if (interestCapRemaining != null) {
            interestRemaining = Math.min(interestRemaining, interestCapRemaining);
        }
        const initiationFeePaid = Number(loan.initiation_fee_paid) || 0;
        const initiationFeeRemaining = Math.max(0, this.round(totalInitiationFee - initiationFeePaid));
        const paymentsMade = Number(loan.payments_made) || 0;
        const paymentsRemaining = Math.max(0, term - paymentsMade);
        const totalPrincipalReceived = Number(loan.total_principal_received) ||
            Math.max(0, this.round(principal - remainingPrincipal));

        const totalPaid = this.round(
            totalPrincipalReceived + interestPaid + initiationFeePaid +
            adminPaid + latePenaltyPaid
        );
        const totalRemaining = this.round(
            remainingPrincipal + interestRemaining + initiationFeeRemaining +
            adminRemaining + latePenaltyRemaining
        );
        const claimableInterestTotal = interestCapRemaining != null
            ? Math.min(totalInterest, this.round(maxInterestAllowed))
            : totalInterest;
        const totalLoanCost = this.round(
            principal + claimableInterestTotal + totalInitiationFee +
            adminTotalAssessed + latePenaltyAssessed
        );

        this.updateLoanPaymentSignals(loan, graceDays, asOf);
        const signals = loan.payment_signals || {};
        const openDue = this.getOpenInstallmentDueDate(loan);
        const interestPeriodMonths = Number(loan.interest_calculation_months) ||
            this.calculateInterestPeriod(term).interestMonths;

        const summary = {
            loan_id: loan.loan_id,
            client_name: loan.client_name || '',
            account_number: loan.account_number || loan.client_account || '',
            loan_type: (loan.loan_type === 'stockvel' || loan.isStockvelLoan)
                ? 'stockvel' : 'standard',
            loan_type_label: (loan.loan_type === 'stockvel' || loan.isStockvelLoan)
                ? 'Stockvel Member' : 'Standard',
            original_principal: this.round(principal),
            term_months: term,
            monthly_payment: this.round(Number(loan.monthly_payment) || 0),
            status: String(loan.status || 'active').toLowerCase(),
            created_at: loan.created_at || null,
            completion_date: loan.completion_date || null,
            early_payoff: !!loan.early_payoff,
            payoff_month: loan.payoff_month || null,
            savings_from_early_payoff: this.round(Number(loan.savings_from_early_payoff) || 0),
            interest_calculation_months: interestPeriodMonths,
            interest_recalculated: !!loan.interest_recalculated,
            max_interest_allowed: this.round(
                Number(loan.max_interest_allowed) || totalInterest || 0)
        };

        const financials = {
            original_principal: this.round(principal),
            total_interest: this.round(totalInterest),
            initiation_fee: this.round(totalInitiationFee),
            admin_scheduled: this.round(adminScheduled),
            admin_extra_assessed: this.round(adminExtraAssessed),
            admin_total: adminTotalAssessed,
            late_penalties_assessed: this.round(latePenaltyAssessed),
            total_loan_cost: totalLoanCost
        };

        const fallbackInterest = term > 0 ? this.round(totalInterest / term) : 0;
        const fallbackInitiation = term > 0 ? this.round(totalInitiationFee / term) : 0;
        const fallbackPrincipal = term > 0 ? this.round(principal / term) : 0;

        // Waterfall claimable interest across pending/partial rows so later
        // schedule lines cannot imply more interest than interest_remaining.
        let interestCapLeft = interestCapRemaining;

        const scheduleRows = schedule.map((entry, index) => {
            const pb = entry.paid_breakdown || {};
            const unpaid = (due, done) => Math.max(0, this.round((Number(due) || 0) - (Number(done) || 0)));
            // Missing fields (null/undefined) fall back to equalized loan totals.
            // Explicit 0 is kept (e.g. stockvel initiation waived).
            let rowPrincipal = Number(entry.principal_payment);
            let rowInterest = Number(entry.interest_payment);
            let rowInitiation = Number(entry.initiation_fee);
            let rowAdmin = Number(entry.admin_fee);
            if (!Number.isFinite(rowPrincipal) || rowPrincipal < 0) {
                rowPrincipal = fallbackPrincipal;
            }
            if (!Number.isFinite(rowInterest) || rowInterest < 0) {
                rowInterest = fallbackInterest;
            }
            if (!Number.isFinite(rowInitiation) || rowInitiation < 0) {
                rowInitiation = fallbackInitiation;
            }
            if (!Number.isFinite(rowAdmin) || rowAdmin < 0) {
                rowAdmin = monthlyAdmin;
            }

            const rowStatus = entry.status || 'pending';
            const isCollectibleRow = rowStatus === 'pending' || rowStatus === 'partial';

            let extraAdmin = this.round(Number(entry.extra_admin_assessed) || 0);
            let latePenalty = this.round(Number(entry.late_penalty_assessed) || 0);
            if (entry === openEntry) {
                if (openLiveExtra != null) {
                    extraAdmin = this.round(Math.max(extraAdmin, openLiveExtra));
                }
                if (openLiveLate != null) {
                    latePenalty = this.round(Math.max(latePenalty, openLiveLate));
                }
            }
            const paidPrincipal = this.round(Number(pb.principal) || 0);
            const paidInterest = this.round(Number(pb.interest) || 0);
            const paidInitiation = this.round(Number(pb.initiation) || 0);
            const paidAdmin = this.round(Number(pb.admin) || 0);
            const paidLate = this.round(Number(pb.late_penalty) || 0);

            const duePrincipal = unpaid(rowPrincipal, paidPrincipal);
            let dueInterest = unpaid(rowInterest, paidInterest);
            if (interestCapLeft != null && isCollectibleRow) {
                const claimable = Math.min(dueInterest, interestCapLeft);
                interestCapLeft = Math.max(0, this.round(interestCapLeft - claimable));
                dueInterest = claimable;
            }
            const dueInitiation = unpaid(rowInitiation, paidInitiation);
            const dueAdmin = unpaid(rowAdmin + extraAdmin, paidAdmin);
            const dueLatePenalty = unpaid(latePenalty, paidLate);
            // Keep installment_total / monthly_payment aligned with claimable
            // interest on every unpaid row (portal/PDF schedule lines).
            let interestForTotals = this.round(rowInterest);
            if (interestCapRemaining != null && isCollectibleRow) {
                interestForTotals = this.round(paidInterest + dueInterest);
            }
            const installmentTotal = this.round(
                rowPrincipal + interestForTotals + rowInitiation + rowAdmin +
                extraAdmin + latePenalty
            );
            const amountDue = this.round(
                duePrincipal + dueInterest + dueInitiation + dueAdmin + dueLatePenalty
            );
            let contractedMonthly = this.round(
                Number(entry.monthly_payment) ||
                (rowPrincipal + rowInterest + rowInitiation + rowAdmin)
            );
            if (interestCapRemaining != null && isCollectibleRow) {
                contractedMonthly = this.round(
                    rowPrincipal + interestForTotals + rowInitiation + rowAdmin
                );
            }

            return {
                index: index + 1,
                due_date: entry.due_date || null,
                status: rowStatus,
                principal: this.round(rowPrincipal),
                interest: this.round(rowInterest),
                initiation_fee: this.round(rowInitiation),
                admin_fee: this.round(rowAdmin),
                extra_admin_assessed: extraAdmin,
                late_penalty_assessed: latePenalty,
                monthly_payment: contractedMonthly,
                installment_total: installmentTotal,
                amount_due: amountDue,
                due_principal: duePrincipal,
                due_interest: dueInterest,
                due_initiation: dueInitiation,
                due_admin: dueAdmin,
                due_late_penalty: dueLatePenalty,
                paid_principal: paidPrincipal,
                paid_interest: paidInterest,
                paid_initiation: paidInitiation,
                paid_admin: paidAdmin,
                paid_late_penalty: paidLate,
                amount_paid: this.round(Number(entry.amount_paid) || 0),
                payment_date: entry.payment_date || null,
                partial_payment: !!entry.partial_payment
            };
        });

        const openRow = scheduleRows.find(r =>
            r && (r.status === 'pending' || r.status === 'partial'));
        const installmentAmountDue = openRow
            ? openRow.amount_due
            : 0;
        const contractedMonthly = this.round(
            Number(loan.monthly_payment) ||
            (openRow && openRow.monthly_payment) ||
            (scheduleRows[0] && scheduleRows[0].monthly_payment) ||
            0
        );

        const position = {
            payments_made: paymentsMade,
            payments_remaining: paymentsRemaining,
            term_months: term,
            progress_pct: term
                ? this.round((paymentsMade / term) * 100) : 0,
            principal_paid: this.round(totalPrincipalReceived),
            principal_remaining: this.round(remainingPrincipal),
            interest_paid: this.round(interestPaid),
            interest_remaining: interestRemaining,
            initiation_fee_paid: this.round(initiationFeePaid),
            initiation_fee_remaining: initiationFeeRemaining,
            admin_paid: this.round(adminPaid),
            admin_remaining: adminRemaining,
            late_penalty_paid: this.round(latePenaltyPaid),
            late_penalty_remaining: latePenaltyRemaining,
            total_paid: totalPaid,
            total_remaining: totalRemaining,
            monthly_installment: contractedMonthly,
            installment_amount_due: this.round(installmentAmountDue),
            installment_due_breakdown: openRow ? {
                principal: openRow.due_principal,
                interest: openRow.due_interest,
                initiation_fee: openRow.due_initiation,
                admin: openRow.due_admin,
                late_penalty: openRow.due_late_penalty
            } : null,
            next_due_date: openDue ? openDue.toISOString() : null,
            days_past_grace: Number(signals.days_past_grace) || 0,
            extra_admin_months: Number(signals.extra_admin_months) || 0
        };

        const activity = [];
        activity.push({
            date: loan.created_at || asOf.toISOString(),
            type: 'creation',
            title: 'Loan created and disbursed',
            detail: '',
            amount: this.round(principal)
        });

        history.forEach((payment, index) => {
            const parts = [];
            if (Number(payment.principal) > 0) {
                parts.push('Principal: ' + this.formatCurrency(payment.principal));
            }
            if (Number(payment.interest) > 0) {
                parts.push('Interest: ' + this.formatCurrency(payment.interest));
            }
            if (Number(payment.initiation_fee) > 0) {
                parts.push('Init Fee: ' + this.formatCurrency(payment.initiation_fee));
            }
            if (Number(payment.admin_fee) > 0) {
                parts.push('Admin: ' + this.formatCurrency(payment.admin_fee));
            }
            if (Number(payment.late_penalty) > 0) {
                parts.push('Late penalty: ' + this.formatCurrency(payment.late_penalty));
            }
            let detail = parts.join(', ');
            if (payment.remaining_principal_after != null) {
                detail += (detail ? '\n' : '') +
                    'Balance after: ' + this.formatCurrency(payment.remaining_principal_after) +
                    ' | Payments: ' + (payment.payments_made_after != null
                        ? payment.payments_made_after : (index + 1)) + '/' + term;
            }
            if (payment.payment_status) {
                detail += (detail ? '\n' : '') + 'Status: ' + payment.payment_status +
                    (payment.days_late != null ? ' (' + payment.days_late + ' days late)' : '');
            }
            if (payment.interest_recalculated) {
                detail += (detail ? '\n' : '') +
                    'Interest recalculated. New max: ' +
                    this.formatCurrency(payment.new_max_interest || 0);
            }
            activity.push({
                date: payment.date || payment.payment_date || asOf.toISOString(),
                type: 'payment',
                title: 'Payment #' + (index + 1),
                detail: detail,
                amount: this.round(Number(payment.amount) || 0),
                payment_status: payment.payment_status || null,
                days_late: payment.days_late != null ? payment.days_late : null,
                recalculated: !!payment.interest_recalculated,
                new_max_interest: this.round(Number(payment.new_max_interest) || 0)
            });
        });

        this.getLoanAdjustmentEvents(loan, state).forEach(ev => {
            const lines = [];
            if (ev.reason) lines.push('Reason: ' + ev.reason);
            if (ev.meta && ev.meta.scheduleRegenerated) {
                lines.push('Payment schedule regenerated');
            }
            (Array.isArray(ev.changes) ? ev.changes : []).forEach(ch => {
                lines.push(this.formatAdjustmentChangeLine(ch));
            });
            activity.push({
                date: ev.timestamp || asOf.toISOString(),
                type: 'adjustment',
                title: 'Loan adjusted (' + this.humanizeAdjustmentType(ev.adjustmentType) + ')',
                detail: lines.join('\n'),
                amount: this.round(Number(
                    (ev.meta && (ev.meta.amountAdded || ev.meta.amount)) || 0
                ))
            });
        });

        schedule.forEach((entry, index) => {
            if (!entry || !entry.due_date) return;
            if (Number(entry.extra_admin_assessed) > 0) {
                activity.push({
                    date: entry.due_date,
                    type: 'extra_admin',
                    title: 'Extra admin assessed (installment #' + (index + 1) + ')',
                    detail: this.formatCurrency(entry.extra_admin_assessed),
                    amount: this.round(Number(entry.extra_admin_assessed) || 0)
                });
            }
            if (Number(entry.late_penalty_assessed) > 0) {
                activity.push({
                    date: entry.due_date,
                    type: 'late_penalty',
                    title: 'Late penalty assessed (installment #' + (index + 1) + ')',
                    detail: this.formatCurrency(entry.late_penalty_assessed),
                    amount: this.round(Number(entry.late_penalty_assessed) || 0)
                });
            }
        });

        if (loan.interest_recalculated && loan.last_recalculation_date) {
            const already = activity.some(a =>
                a.recalculated && a.date === loan.last_recalculation_date);
            if (!already) {
                activity.push({
                    date: loan.last_recalculation_date,
                    type: 'recalculation',
                    title: 'Interest recalculated due to overpayment',
                    detail: 'New max interest: ' +
                        this.formatCurrency(loan.max_interest_allowed || 0),
                    amount: 0
                });
            }
        }

        if (loan.early_payoff && loan.payoff_date) {
            const earlyTx = ((state && state.transactions) || []).find(tx =>
                tx && tx.type === 'early_payoff' &&
                tx.details && tx.details.loanId === loan.loan_id);
            const detailParts = [
                'Saved: ' + this.formatCurrency(loan.savings_from_early_payoff || 0)
            ];
            if (earlyTx && earlyTx.details) {
                if (Number(earlyTx.details.latePenaltyPaid) > 0) {
                    detailParts.push('Late penalty collected: ' +
                        this.formatCurrency(earlyTx.details.latePenaltyPaid));
                }
                if (Number(earlyTx.details.extraAdminPaid) > 0) {
                    detailParts.push('Extra admin collected: ' +
                        this.formatCurrency(earlyTx.details.extraAdminPaid));
                }
            }
            activity.push({
                date: loan.payoff_date,
                type: 'early_payoff',
                title: 'Early payoff in month ' + (loan.payoff_month || '?'),
                detail: detailParts.join('\n'),
                amount: this.round(Number(loan.payoff_amount) || 0)
            });
        }

        if (loan.status === 'completed' && loan.completion_date) {
            activity.push({
                date: loan.completion_date,
                type: 'completion',
                title: 'Loan fully paid and completed',
                detail: '',
                amount: 0
            });
        }
        if (loan.status === 'defaulted') {
            activity.push({
                date: loan.default_date || loan.updated_at || loan.created_at || asOf.toISOString(),
                type: 'default',
                title: 'Loan marked as DEFAULTED',
                detail: '',
                amount: 0
            });
        }

        activity.sort((a, b) =>
            (this._parseEventDate(a.date) || 0) - (this._parseEventDate(b.date) || 0));

        return {
            loan_id: loan.loan_id,
            client_name: loan.client_name || '',
            summary,
            financials,
            position,
            activity,
            schedule: scheduleRows,
            generated_at: asOf.toISOString()
        };
    },

    /**
     * Client-safe pack of statement models for portal publishing.
     * Uses state.gracePeriodDays when options omit gracePeriodDays so portal
     * packs match the operator Settings grace period.
     */
    buildClientStatusPack(client, state, options) {
        const opts = Object.assign({}, options || {});
        if (typeof opts.gracePeriodDays !== 'number') {
            const fromState = state && Number(state.gracePeriodDays);
            if (Number.isFinite(fromState)) opts.gracePeriodDays = fromState;
        }
        const loans = this.getClientLoans(client, state && state.loans);
        const includeCompleted = !opts.activeOnly;
        const selected = loans.filter(l => {
            if (!l) return false;
            const st = String(l.status || '').toLowerCase();
            if (st === 'active') return true;
            if (includeCompleted && (st === 'completed' || st === 'defaulted')) return true;
            return false;
        });
        return {
            v: 1,
            account_number: client && (client.account_number || client.accountNumber) || '',
            client_name: client
                ? (client.name || [
                    client.first_name || client.firstName || '',
                    client.last_name || client.lastName || ''
                ].join(' ').trim())
                : '',
            memberNumber: client && client.memberNumber != null ? client.memberNumber : null,
            published_at: (opts.asOf
                ? new Date(opts.asOf)
                : new Date()).toISOString(),
            loans: selected.map(l => this.buildLoanStatementModel(l, state, opts))
        };
    }
};

// Make globally available (browser only)
if (typeof window !== 'undefined') {
    window.Calculations = Calculations;
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculations;
}
