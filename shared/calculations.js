/**
 * TBFS Calculation Engine
 * All financial calculations used across the application
 * Includes standard loans, stockvel loans, interest, fees, and allocations
 * 
 * Version: 2.0.0 (Multi-Page Architecture)
 * Business Rules Version: 1.7.5
 */

const Calculations = {
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
        
        console.log(`\nTiered calculation for R${loanAmount.toFixed(2)} loan with R${savingsAmount.toFixed(2)} contributions`);
        
        // Calculate tier boundaries based on ABSOLUTE amounts from contributions
        const boundaries = {
            tier1_max: savingsAmount * 0.30,  // Up to 30% of contributions @ 3%
            tier2_max: savingsAmount * 0.75,  // Up to 75% of contributions @ 8%
            tier3_max: savingsAmount * 1.05,  // Up to 105% of contributions @ 15%
            tier4_max: savingsAmount * 1.10,  // Up to 110% of contributions @ 25%
            // Above 110% @ 30% (Income Table)
        };
        
        console.log(`Tier boundaries:`);
        console.log(`  Tier 1 (3%): R0 - R${boundaries.tier1_max.toFixed(2)}`);
        console.log(`  Tier 2 (8%): R${boundaries.tier1_max.toFixed(2)} - R${boundaries.tier2_max.toFixed(2)}`);
        console.log(`  Tier 3 (15%): R${boundaries.tier2_max.toFixed(2)} - R${boundaries.tier3_max.toFixed(2)}`);
        console.log(`  Tier 4 (25%): R${boundaries.tier3_max.toFixed(2)} - R${boundaries.tier4_max.toFixed(2)}`);
        console.log(`  Tier 5 (30% Income Table): Above R${boundaries.tier4_max.toFixed(2)}`);
        
        let remainingLoan = loanAmount;
        
        // Tier 1: First 30% of contributions @ 3%
        if (remainingLoan > 0) {
            const tierAmount = Math.min(remainingLoan, boundaries.tier1_max);
            const tierInterest = tierAmount * 0.03;
            tiers1to4Interest += tierInterest;
            tier1to4Amount += tierAmount;
            console.log(`Tier 1 (0-30%): R${tierAmount.toFixed(2)} × 3% = R${tierInterest.toFixed(2)}`);
            remainingLoan -= tierAmount;
        }
        
        // Tier 2: 30-75% of contributions @ 8%
        if (remainingLoan > 0) {
            const tierAmount = Math.min(remainingLoan, boundaries.tier2_max - boundaries.tier1_max);
            const tierInterest = tierAmount * 0.08;
            tiers1to4Interest += tierInterest;
            tier1to4Amount += tierAmount;
            console.log(`Tier 2 (30-75%): R${tierAmount.toFixed(2)} × 8% = R${tierInterest.toFixed(2)}`);
            remainingLoan -= tierAmount;
        }
        
        // Tier 3: 75-105% of contributions @ 15%
        if (remainingLoan > 0) {
            const tierAmount = Math.min(remainingLoan, boundaries.tier3_max - boundaries.tier2_max);
            const tierInterest = tierAmount * 0.15;
            tiers1to4Interest += tierInterest;
            tier1to4Amount += tierAmount;
            console.log(`Tier 3 (75-105%): R${tierAmount.toFixed(2)} × 15% = R${tierInterest.toFixed(2)}`);
            remainingLoan -= tierAmount;
        }
        
        // Tier 4: 105-110% of contributions @ 25%
        if (remainingLoan > 0) {
            const tierAmount = Math.min(remainingLoan, boundaries.tier4_max - boundaries.tier3_max);
            const tierInterest = tierAmount * 0.25;
            tiers1to4Interest += tierInterest;
            tier1to4Amount += tierAmount;
            console.log(`Tier 4 (105-110%): R${tierAmount.toFixed(2)} × 25% = R${tierInterest.toFixed(2)}`);
            remainingLoan -= tierAmount;
        }
        
        // Tier 5: Above 110% of contributions
        // This will be calculated using Income Table method in the main function
        if (remainingLoan > 0) {
            tier5Amount = remainingLoan;
            console.log(`Tier 5 (>110%): R${tier5Amount.toFixed(2)} [Income Table method]`);
        }
        
        console.log(`Tiers 1-4 interest: R${tiers1to4Interest.toFixed(2)}`);
        console.log(`Tiers 1-4 amount: R${tier1to4Amount.toFixed(2)}`);
        if (tier5Amount > 0) {
            console.log(`Tier 5 amount: R${tier5Amount.toFixed(2)} (to be calculated with Income Table)`);
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
        
        console.log(`Interest Period Calculation: term=${term} months → interest period=${interestMonths} months`);
        
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
        console.log(`\n=== EARLY PAYOFF CALCULATION ===`);
        console.log(`Loan ID: ${loan.loan_id}`);
        console.log(`Original Term: ${loan.term_months} months`);
        console.log(`Payoff Month: ${payoffMonth}`);
        console.log(`Payments Made: ${loan.payments_made || 0}`);
        
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
        const totalInitiationFee = loan.total_initiation_fee || (originalPrincipal * 0.12);
        const initiationFeePaid = loan.initiation_fee_paid || 0;
        const interestPaid = loan.interest_paid || 0;
        
        console.log(`\nLoan Details:`);
        console.log(`Original Principal: R${originalPrincipal.toFixed(2)}`);
        console.log(`Remaining Principal: R${remainingPrincipal.toFixed(2)}`);
        console.log(`Interest Calculation Period: ${interestPeriod} months`);
        console.log(`Interest Already Paid: R${interestPaid.toFixed(2)}`);
        
        // STEP 1: Calculate prorated interest owed
        // Interest should be calculated for the LESSER of:
        // - Payoff month
        // - Interest calculation period
        const monthsToCalculateInterest = Math.min(payoffMonth, interestPeriod);
        
        console.log(`\nInterest Calculation:`);
        console.log(`Months to calculate: ${monthsToCalculateInterest} (min of payoff month ${payoffMonth} and interest period ${interestPeriod})`);
        
        // Calculate interest for the prorated period using declining balance
        let proratedInterest = 0;
        let balance = originalPrincipal;
        const principalPerMonth = originalPrincipal / loan.term_months;
        
        // Check if this is a stockvel loan with tiered rates
        const isStockvel = loan.loan_type === 'stockvel' || loan.isStockvelLoan;
        
        if (isStockvel && loan.total_contributions) {
            // Stockvel loan - use tiered calculation
            console.log(`Stockvel loan detected - using tiered rates`);
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
                const minimumInterest = balance * 0.10;
                const monthInterest = Math.max(tieredInterest, minimumInterest);
                
                proratedInterest += monthInterest;
                console.log(`  Month ${month}: Balance R${balance.toFixed(2)}, Savings R${currentSavings.toFixed(2)}, Interest R${monthInterest.toFixed(2)}`);
                
                balance -= principalPerMonth;
            }
        } else {
            // Standard loan - use 30% income table
            for (let month = 1; month <= monthsToCalculateInterest; month++) {
                const tbfsIncome = balance * 0.30;
                const adminFee = 60;
                const initiationFee = totalInitiationFee / loan.term_months;
                const monthInterest = tbfsIncome - adminFee - initiationFee;
                
                proratedInterest += monthInterest;
                console.log(`  Month ${month}: Balance R${balance.toFixed(2)}, Interest R${monthInterest.toFixed(2)}`);
                
                balance -= principalPerMonth;
            }
        }
        
        console.log(`Total prorated interest for ${monthsToCalculateInterest} months: R${proratedInterest.toFixed(2)}`);
        console.log(`Interest already paid: R${interestPaid.toFixed(2)}`);
        
        // Interest owed = Prorated interest - Interest already paid
        const interestOwed = Math.max(0, proratedInterest - interestPaid);
        console.log(`Interest still owed: R${interestOwed.toFixed(2)}`);
        
        // STEP 2: Calculate remaining initiation fee (must be paid in full)
        const initiationFeeOwed = Math.max(0, totalInitiationFee - initiationFeePaid);
        console.log(`\nInitiation Fee:`);
        console.log(`Total: R${totalInitiationFee.toFixed(2)}`);
        console.log(`Paid: R${initiationFeePaid.toFixed(2)}`);
        console.log(`Owed: R${initiationFeeOwed.toFixed(2)}`);
        
        // STEP 3: Calculate remaining admin fees
        // Admin fees are for actual months only (not the full term)
        const adminFeePerMonth = isStockvel ? 
            (loan.schedule ? loan.schedule[0].admin_fee : 60) : 
            60;
        const adminFeesPaid = (loan.payments_made || 0) * adminFeePerMonth;
        const adminFeesForPayoffMonth = payoffMonth * adminFeePerMonth;
        const adminFeesOwed = Math.max(0, adminFeesForPayoffMonth - adminFeesPaid);
        
        console.log(`\nAdmin Fees:`);
        console.log(`Per month: R${adminFeePerMonth.toFixed(2)}`);
        console.log(`For ${payoffMonth} months: R${adminFeesForPayoffMonth.toFixed(2)}`);
        console.log(`Already paid: R${adminFeesPaid.toFixed(2)}`);
        console.log(`Still owed: R${adminFeesOwed.toFixed(2)}`);
        
        // STEP 4: Total payoff amount
        const totalPayoff = remainingPrincipal + interestOwed + initiationFeeOwed + adminFeesOwed;
        
        // STEP 5: Calculate savings
        const originalTotalCost = loan.total_cost || (originalPrincipal + loan.total_interest + totalInitiationFee + (60 * loan.term_months));
        const totalPaid = (loan.payments_made || 0) * (loan.monthly_payment || 0);
        const totalWithPayoff = totalPaid + totalPayoff;
        const savings = originalTotalCost - totalWithPayoff;
        const savingsPercentage = (savings / originalTotalCost) * 100;
        
        console.log(`\n=== PAYOFF SUMMARY ===`);
        console.log(`Remaining Principal: R${remainingPrincipal.toFixed(2)}`);
        console.log(`Interest Owed: R${interestOwed.toFixed(2)}`);
        console.log(`Initiation Fee Owed: R${initiationFeeOwed.toFixed(2)}`);
        console.log(`Admin Fees Owed: R${adminFeesOwed.toFixed(2)}`);
        console.log(`───────────────────────────────`);
        console.log(`TOTAL PAYOFF: R${totalPayoff.toFixed(2)}`);
        console.log(`\nSavings: R${savings.toFixed(2)} (${savingsPercentage.toFixed(2)}%)`);
        
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
        console.log(`\n=== STANDARD LOAN CALCULATION (30% Income Table) ===`);
        console.log(`Principal: R${principal.toFixed(2)}`);
        console.log(`Term: ${term} months`);
        
        // Calculate interest period (long-term loan protection)
        const interestPeriod = this.calculateInterestPeriod(term);
        const interestMonths = interestPeriod.interestMonths;
        console.log(`Interest Calculation Period: ${interestMonths} months (${interestPeriod.description})`);
        
        const basePrincipalPayment = principal / term;
        let outstandingBalance = principal;
        let totalInterestForPeriod = 0;
        const monthlyDetails = [];
        
        // First pass: Calculate interest for the interest period ONLY (declining balance)
        let balance = principal;
        for (let month = 1; month <= interestMonths; month++) {
            const tbfsIncome = balance * 0.30;
            const adminFee = 60;
            const initiationFee = (principal * 0.12) / term; // Still spread across full term
            const monthlyInterest = tbfsIncome - adminFee - initiationFee;
            
            totalInterestForPeriod += monthlyInterest;
            balance -= basePrincipalPayment;
        }
        
        // Interest is capped at the calculated period, then spread equally across ALL months
        const totalInterest = totalInterestForPeriod;
        const equalizedMonthlyInterest = totalInterest / term;
        
        console.log(`Interest calculated for ${interestMonths} months: R${totalInterestForPeriod.toFixed(2)}`);
        console.log(`Equalized monthly interest (spread over ${term} months): R${equalizedMonthlyInterest.toFixed(2)}`);
        
        // Build monthly breakdown with equalized interest
        outstandingBalance = principal;
        for (let month = 1; month <= term; month++) {
            const adminFee = 60;
            const initiationFee = (principal * 0.12) / term;
            
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
        const totalInitiationFee = principal * 0.12;
        const totalAdminFees = 60 * term;
        const totalCostStandard = principal + totalInterest + totalInitiationFee + totalAdminFees;
        const equalMonthlyPayment = totalCostStandard / term;
        
        console.log(`Total Interest: R${totalInterest.toFixed(2)}`);
        console.log(`Total Initiation Fee: R${totalInitiationFee.toFixed(2)}`);
        console.log(`Total Admin Fees: R${totalAdminFees.toFixed(2)}`);
        console.log(`Total Cost: R${totalCostStandard.toFixed(2)}`);
        console.log(`Equal Monthly Payment: R${equalMonthlyPayment.toFixed(2)}`);
        
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
        const minimumInterest = outstandingBalance * 0.10;
        const minimumAdmin = 60;
        const minimumInitiation = (loan.initiation_fee - loan.initiation_fee_paid) / 
                                   (loan.term_months - loan.payments_made);
        const minimumCharge = minimumInterest + minimumAdmin + minimumInitiation;
        
        // Calculate amount due to TBFS (tiered rate)
        const tieredInterest = outstandingBalance * tieredRate;
        const variableAdmin = 60 * (1 - tieredRate);
        const amountDueToTBFS = tieredInterest + variableAdmin + minimumInitiation;
        
        // Calculate bonus
        let bonus = 0;
        if (amountDueToTBFS < minimumCharge) {
            bonus = minimumCharge - amountDueToTBFS;
            console.log(`💰 Bonus earned: R${bonus.toFixed(2)}`);
            console.log(`  Minimum charge: R${minimumCharge.toFixed(2)}`);
            console.log(`  Amount due to TBFS: R${amountDueToTBFS.toFixed(2)}`);
            console.log(`  Member saves: ${((bonus / minimumCharge) * 100).toFixed(1)}%`);
        }
        
        return this.round(bonus);
    },
    
    /**
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
        return end.toISOString().split('T')[0];
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
     */
    calculateLatePenalty(daysLate, outstandingBalance) {
        const maxDays = 7; // Maximum 7 days of penalties
        const dailyRate = 0.001; // 0.1% per day
        
        const effectiveDays = Math.min(daysLate, maxDays);
        const penalty = outstandingBalance * dailyRate * effectiveDays;
        
        return this.round(penalty);
    },
    
    /**
     * Calculate early payoff amount (20% discount on remaining interest)
     */
    calculateEarlyPayoff(loan) {
        const remainingPrincipal = loan.remaining_principal;
        const maxInterest = loan.principal * 1.00; // 100% cap
        const remainingInterest = maxInterest - loan.total_interest_charged;
        const discountedInterest = remainingInterest * 0.80; // 20% discount
        
        const remainingFees = (loan.initiation_fee - loan.initiation_fee_paid) +
                             (60 * (loan.term_months - loan.payments_made));
        
        const totalPayoff = remainingPrincipal + discountedInterest + remainingFees;
        
        return {
            principal: this.round(remainingPrincipal),
            interest: this.round(discountedInterest),
            fees: this.round(remainingFees),
            total: this.round(totalPayoff),
            discount: this.round(remainingInterest * 0.20)
        };
    }
};

// Make globally available
window.Calculations = Calculations;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Calculations;
}
