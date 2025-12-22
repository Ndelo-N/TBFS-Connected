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
     * Calculate standard loan using 30% Income Table method
     * Returns equal monthly installments
     */
    calculateStandardLoan(principal, term) {
        console.log(`\n=== STANDARD LOAN CALCULATION (30% Income Table) ===`);
        console.log(`Principal: R${principal.toFixed(2)}`);
        console.log(`Term: ${term} months`);
        
        const basePrincipalPayment = principal / term;
        let outstandingBalance = principal;
        let totalInterest = 0;
        const monthlyDetails = [];
        
        // First pass: Calculate total TBFS income on declining balance
        for (let month = 1; month <= term; month++) {
            const tbfsIncome = outstandingBalance * 0.30;
            const adminFee = 60;
            const initiationFee = (principal * 0.12) / term;
            const monthlyInterest = tbfsIncome - adminFee - initiationFee;
            
            totalInterest += monthlyInterest;
            
            monthlyDetails.push({
                month,
                outstandingBalance,
                tbfsIncome,
                adminFee,
                initiationFee,
                monthlyInterest
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
