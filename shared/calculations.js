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

const DEBUG = false;
function dbg(...args) { if (DEBUG) dbg(...args); }

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
     * Calculate interest period for long-term loans
     * Rule: Math.ceil(term/2) with minimum 3 months, capped at actual term
     * This prevents excessive interest on long-term loans while ensuring revenue
     */
    calculateInterestPeriod(term) {
        const calculatedMonths = Math.ceil(term / 2) >= 3 ? Math.ceil(term / 2) : 3;
        const interestMonths = Math.min(calculatedMonths, term);
        
        dbg(`Interest Period Calculation: term=${term} months → interest period=${interestMonths} months`);
        
        return {
            interestMonths,
            calculatedMonths,
            description: term <= 2 ? 
                `Short-term: Full ${term} month interest` :
                term <= 6 ?
                `Medium-term: ${interestMonths} months (min 3)` :
                `Long-term: ${interestMonths} months (half term)`
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
        
        // Return fields to add to loan object
        return {
            // Interest Calculation Period
            interest_calculation_months: interestPeriod.interestMonths,
            
            // Interest Cap (100% of principal maximum)
            max_interest_allowed: Math.min(totalInterest, principal),
            
            // Expected monthly interest (equalized)
            expected_monthly_interest: totalInterest / term,
            
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
     */
    isLateFeesEligible(loan) {
        const cutoffDate = new Date(2026, 0, 31); // Jan 31 2026 (month is 0-indexed)
        const loanDate = new Date(loan.created_at || loan.loan_date || 0);
        return loanDate > cutoffDate;
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
