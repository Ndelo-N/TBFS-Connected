# Advanced Payment Tracking System 💰

**Last Updated:** December 22, 2025  
**Status:** ✅ Fully Implemented

## Overview

TBFS now features an **intelligent payment tracking system** that:

1. **Calculates payments made** based on principal received (not simple counters)
2. **Rewards early large payments** by recalculating interest in the first half
3. **Applies strategic allocation** for late-term overpayments

This system handles **partial payments, overpayments, and mixed payment scenarios** with precision!

---

## 🎯 Core Feature: Principal-Based Payment Counting

### The Problem (Old System)
The old system incremented a counter by 1 for each payment, which broke down with:
- Partial payments (counted as 1 payment even if only R100 paid)
- Overpayments (counted as 1 payment even if R5,000 paid on a R1,000/month loan)
- Mixed scenarios (several small payments followed by large payment)

### The Solution (New System)
**Formula:**
```
payments_made = FLOOR(total_principal_received / principal_per_month)
```

Where:
- `total_principal_received` = Sum of all principal payments to date
- `principal_per_month` = original_principal / term_months
- `FLOOR()` = Round down to whole number

### Example

**Loan:** R10,000 for 10 months  
**Principal per month:** R10,000 / 10 = R1,000

| Payment | Principal Paid | Total Principal | Calculation | Payments Made |
|---------|---------------|-----------------|-------------|---------------|
| 1 | R500 | R500 | 500 / 1,000 | 0 |
| 2 | R700 | R1,200 | 1,200 / 1,000 | 1 |
| 3 | R3,500 | R4,700 | 4,700 / 1,000 | 4 |
| 4 | R800 | R5,500 | 5,500 / 1,000 | 5 |

**Result:** The system accurately tracks that 5 payments worth of principal have been received, even though only 4 actual transactions occurred!

---

## 🔄 First Half Overpayments: Interest Recalculation

### Business Rule
**If a client makes a significant overpayment in the FIRST HALF of the loan term, recalculate interest on the NEW REDUCED BALANCE.**

This rewards clients who pay down principal early!

### Detection Logic
```javascript
const halfwayPoint = Math.ceil(loan.term_months / 2);
const currentPaymentNumber = Math.floor((loan.original_principal - loan.remaining_principal) / principalPerMonth) + 1;

if (currentPaymentNumber <= halfwayPoint && principalPaid > principalPerMonth * 1.1) {
    // TRIGGER: Interest recalculation
}
```

**Triggers when:**
- Payment number ≤ halfway point (month 5 in a 10-month loan)
- Principal paid > 110% of normal monthly principal

### Recalculation Process

#### For Standard Loans:
```javascript
// Use 30% Income Table method on reduced balance
let balance = loan.remaining_principal;
const remainingMonths = interestPeriod - loan.payments_made;

for (let i = 0; i < remainingMonths; i++) {
    const tbfsIncome = balance * 0.30;
    const adminFee = 60;
    const initiationFee = (loan.total_initiation_fee || 0) / loan.term_months;
    const monthInterest = tbfsIncome - adminFee - initiationFee;
    newInterestCalculation += monthInterest;
    balance -= principalPerMonth;
}
```

#### For Stockvel Loans:
```javascript
// Use tiered rates on reduced balance
let balance = loan.remaining_principal;
let currentSavings = loan.total_contributions + (monthly_contribution * payments_made);

for (let i = 0; i < remainingMonths; i++) {
    const tieredResult = Calculations.calculateTieredStockvelInterest(balance, currentSavings);
    const minimumInterest = balance * 0.10;
    const monthInterest = Math.max(tieredResult.tiers1to4Interest, minimumInterest);
    newInterestCalculation += monthInterest;
    balance -= principalPerMonth;
    currentSavings += monthly_contribution;
}
```

#### Update Loan Fields:
```javascript
loan.max_interest_allowed = loan.interest_paid + newInterestCalculation;
loan.expected_monthly_interest = newMaxInterest / loan.term_months;
loan.interest_recalculated = true;
loan.last_recalculation_date = new Date().toISOString();
```

### Example: First Half Overpayment

**Loan Details:**
- Principal: R10,000
- Term: 10 months
- Interest Period: 5 months (cap rule: ceil(10/2) = 5)
- Principal per month: R1,000
- Original interest: R2,500 (calculated on declining balance)

**Payment Scenario:**
- **Month 1:** Pay R1,000 → Balance R9,000
- **Month 2:** Pay R3,500 → Balance R5,500 (OVERPAYMENT DETECTED!)

**Interest Recalculation:**

**Before:**
```
Month 1: Interest on R10,000 = ~R500
Month 2: Interest on R9,000  = ~R450
Month 3: Interest on R8,000  = ~R400
Month 4: Interest on R7,000  = ~R350
Month 5: Interest on R6,000  = ~R300
Total: R2,000 (simplified for example)
```

**After Overpayment (recalculated from month 3 onwards on R5,500 balance):**
```
Month 1: Interest on R10,000 = ~R500 (already paid)
Month 2: Interest on R9,000  = ~R450 (already paid)
Month 3: Interest on R5,500  = ~R275
Month 4: Interest on R4,500  = ~R225
Month 5: Interest on R3,500  = ~R175
Total: R1,625
```

**Savings:** R2,000 - R1,625 = **R375 interest saved!** 🎉

**Client sees:**
```
🔄 INTEREST RECALCULATED!
Your overpayment in the first half reduced future interest.
New Max Interest: R1,625.00
```

---

## 📊 Second Half Overpayments: Strategic Allocation

### Business Rule
**If overpayment occurs AFTER the halfway point, apply excess payment to remaining fees/interest BEFORE reducing principal.**

This optimizes the payment structure for late-term overpayments.

### Allocation Order (Second Half)
1. **Remaining Initiation Fee Balance**
2. **Remaining Interest Balance**
3. **Principal**

### Logic
```javascript
const halfwayPoint = Math.ceil(loan.term_months / 2);

if (currentPaymentNumber > halfwayPoint) {
    // Apply to remaining initiation fee
    const remainingInitiationFee = loan.total_initiation_fee - loan.initiation_fee_paid;
    if (remainingAmount > 0 && remainingInitiationFee > 0) {
        const extraInitiation = Math.min(remainingAmount, remainingInitiationFee);
        initiationFeePaid += extraInitiation;
        remainingAmount -= extraInitiation;
    }
    
    // Apply to remaining interest
    const remainingInterest = loan.total_interest - loan.interest_paid;
    if (remainingAmount > 0 && remainingInterest > 0) {
        const extraInterest = Math.min(remainingAmount, remainingInterest);
        interestPaid += extraInterest;
        remainingAmount -= extraInterest;
    }
    
    // Finally apply to principal
    if (remainingAmount > 0) {
        principalPaid += Math.min(remainingAmount, loan.remaining_principal - principalPaid);
    }
}
```

### Example: Second Half Overpayment

**Loan Details:**
- Principal: R10,000
- Term: 10 months
- Halfway point: Month 5
- At Month 7:
  - Remaining Principal: R3,000
  - Remaining Interest: R600
  - Remaining Initiation Fee: R400

**Payment Scenario:**
- **Month 7:** Client pays R2,500 (normal payment = R1,200)
- **Overpayment:** R2,500 - R1,200 = R1,300 extra

**Allocation:**
```
Normal payment (R1,200):
├─ Initiation Fee: R120
├─ Admin Fee: R60
├─ Interest: R200
└─ Principal: R820

Overpayment (R1,300):
├─ Remaining Initiation Fee: R280 → Fully paid
├─ Remaining Interest: R400 → Fully paid
└─ Principal: R620 → Applied

Total Applied:
├─ Initiation Fee: R400 (completed!)
├─ Interest: R600 (completed!)
└─ Principal: R1,440
```

**Result:** Client completes initiation fee and interest early, then accelerates principal payoff!

---

## 🧮 Technical Implementation

### Key Fields Added to Loan Object

```javascript
{
    // Existing fields...
    
    // New tracking fields
    total_principal_received: 0,        // Running total of all principal payments
    interest_recalculated: false,       // Flag if interest was recalculated
    last_recalculation_date: null,      // ISO timestamp of last recalculation
    max_interest_allowed: 0,            // Updated after recalculation
    expected_monthly_interest: 0        // Updated after recalculation
}
```

### Payment Processing Flow

```javascript
function makePayment(loanId) {
    // 1. Initialize tracking fields
    if (!loan.total_principal_received) {
        loan.total_principal_received = 0;
    }
    
    // 2. Allocate payment (fees → interest → principal)
    // ... allocation logic ...
    
    // 3. Update total principal received
    loan.total_principal_received += principalPaid;
    
    // 4. Calculate payments made
    const principalPerMonth = loan.original_principal / loan.term_months;
    loan.payments_made = Math.floor(loan.total_principal_received / principalPerMonth);
    
    // 5. Check for interest recalculation
    const halfwayPoint = Math.ceil(loan.term_months / 2);
    if (loan.payments_made <= halfwayPoint && principalPaid > principalPerMonth * 1.1) {
        // Recalculate interest on new reduced balance
        // ... recalculation logic ...
        
        loan.interest_recalculated = true;
        loan.last_recalculation_date = new Date().toISOString();
    }
    
    // 6. Save and display
    AppStateManager.save(AppState);
    displaySuccessMessage();
}
```

---

## 📱 User Experience

### Payment Success Message (New)

```
✅ Payment Processed Successfully!

💰 Total Paid: R3,500.00

📊 Payment Breakdown:
• Principal: R3,500.00
• Interest: R0.00
• Admin Fee: R0.00
• Initiation Fee: R0.00

📈 Progress:
• Payments Made: 3/10
• Total Principal Received: R3,500.00

💵 Remaining Balances:
• Principal: R6,500.00
• Interest: R1,250.00
• Initiation Fee: R1,000.00

🔄 INTEREST RECALCULATED!
Your overpayment in the first half reduced future interest.
New Max Interest: R1,000.00
```

### Transaction Logging

```javascript
{
    type: 'payment',
    timestamp: '2025-12-22T10:30:00Z',
    details: {
        loanId: 123,
        clientName: 'John Doe',
        paymentAmount: 3500.00,
        principalPaid: 3500.00,
        // ... other breakdown ...
        paymentNumber: 3,
        totalPrincipalReceived: 3500.00,
        interestRecalculated: true,
        newMaxInterest: 1000.00
    }
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Multiple Partial Payments
```
Loan: R10,000 / 10 months
Principal per month: R1,000

Payment 1: R300  → Payments made: 0 (300/1000)
Payment 2: R400  → Payments made: 0 (700/1000)
Payment 3: R500  → Payments made: 1 (1200/1000)
Payment 4: R2,000 → Payments made: 3 (3200/1000)
```

### Scenario 2: First Half Overpayment
```
Loan: R10,000 / 10 months (interest period: 5 months)

Month 1: Pay R1,000 → Balance R9,000
Month 2: Pay R4,000 → Balance R5,000
         ↓
    INTEREST RECALCULATED on R5,000
    for remaining 3 months of interest period
```

### Scenario 3: Second Half Overpayment
```
Loan: R10,000 / 10 months

Month 7: Pay R3,000 (normal = R1,200)
         ↓
    Extra R1,800 applied to:
    1. Remaining initiation fee
    2. Remaining interest
    3. Principal
```

---

## ✅ Benefits

1. **Accurate Tracking:** No more confusion with partial/overpayments
2. **Fair to Clients:** Rewards early principal reduction
3. **Transparent:** Clear messaging about recalculations
4. **Flexible:** Handles any payment pattern
5. **Incentivizes:** Encourages early large payments

---

## 🔗 Related Documentation

- [Early Payoff Calculation Guide](./EARLY-PAYOFF-CALCULATION-GUIDE.md)
- [Interest Cap System Guide](./INTEREST-CAP-SYSTEM-GUIDE.md)
- [Phase 5 Complete Summary](./PHASE5-COMPLETE-SUMMARY.md)

---

**Implementation Date:** December 22, 2025  
**Module:** `active-loans.html`  
**Dependencies:** `shared/calculations.js`
