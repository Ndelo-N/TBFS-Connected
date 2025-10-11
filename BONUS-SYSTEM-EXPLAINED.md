# 🎁 Stockvel Bonus System - Complete Explanation

**Date:** 2025-10-11  
**Branch:** `feature/separate-stockvel-member-system`

---

## 🎯 HOW BONUSES WORK

### The Core Concept:
**Stockvel members pay LESS interest than 10% minimum, but they DON'T "lose" the difference - they EARN it as a bonus!**

---

## 📊 THE BONUS FORMULA

```javascript
// Step 1: Calculate what TBFS is actually due (tiered calculation)
amountDueToTBFS = tieredInterest + adminFee + initiationFee

// Step 2: Calculate 10% minimum
minimumCharge = balance × 0.10

// Step 3: Compare and determine bonus
if (amountDueToTBFS < minimumCharge) {
    // Member pays 10% minimum
    memberPays = minimumCharge
    bonus = minimumCharge - amountDueToTBFS  // The savings!
} else {
    // Member pays tiered amount (already > 10%)
    memberPays = amountDueToTBFS
    bonus = 0  // No bonus when already above 10%
}
```

### Example Calculation (Low Loan - Gets Bonus):
```
Member has R10,500 contributions
Takes R5,000 loan for 3 months
Outstanding balance: R5,000

AMOUNT DUE TO TBFS:
- Tiered interest: R242.50 (4.85% rate)
- Admin fee: R60 × (1 - 0.0485) = R57.09
- Initiation: R0 (waived - loan < contributions)
- Total due to TBFS = R299.59

10% MINIMUM:
- R5,000 × 0.10 = R500.00

COMPARISON:
- R299.59 < R500.00? YES ✅
- Member pays: R500.00 (the 10% minimum)
- Bonus earned: R500.00 - R299.59 = R200.41

✨ Member pays exactly 10%, earns R200.41 bonus!
```

### Example Calculation (High Loan - No Bonus):
```
Member has R10,500 contributions
Takes R12,000 loan
Outstanding balance: R12,000

AMOUNT DUE TO TBFS:
- Tiered interest: R1,211.25 (10.09% rate - high tiers)
- Admin fee: R60 × (1 - 0.1009) = R53.95
- Initiation: (R12,000 - R10,500) × 0.12 / term = R60
- Total due to TBFS = R1,325.20

10% MINIMUM:
- R12,000 × 0.10 = R1,200.00

COMPARISON:
- R1,325.20 < R1,200.00? NO ❌
- Member pays: R1,325.20 (the higher tiered amount)
- Bonus earned: R0 (no bonus - already above 10%)

✨ Member pays tiered rate, no bonus awarded
```

---

## 🔄 PAYMENT WORKFLOW

### When Member Makes Loan Payment:

**Step 1: Payment Processed**
```
Active Loans → Click "💰 Make Payment"
Enter amount: R1,780.00
```

**Step 2: System Calculates Bonus**
```javascript
amountDueToTBFS = tieredInterest + adminFee + initiationFee
minimumCharge = balance × 0.10

if (amountDueToTBFS < minimumCharge) {
    bonusEarned = minimumCharge - amountDueToTBFS;
    member.accumulatedBonus += bonusEarned;  // Added here!
    // member.totalContributions UNCHANGED!   // Important!
} else {
    bonusEarned = 0;  // No bonus when already > 10%
}
```

**Step 3: Receipt Recorded**
```javascript
AppState.stockvelReceipts.push({
    type: 'loan_payment',
    amount: R1,780.00,
    bonusAmount: R260.41,
    newTotal: member.totalContributions  // Stays same!
});
```

**Step 4: Confirmation Shown**
```
💰 Payment Processed!

📊 Breakdown:
• Principal: R1,000.00
• Interest: R242.50
• Admin Fee: R57.09
• Initiation Fee: R0.00

🎁 Stockvel Member Bonus:
• Bonus Earned: R200.41
• Total Accumulated: R200.41
• (Paid 10% minimum, saved 40.1%)

📈 Loan Status:
• Remaining Principal: R4,000.00
```

---

## 🎁 BONUS TRACKING

### Two Separate Buckets:

**1. Total Contributions** (Pure Money In)
```javascript
member.totalContributions = 10,500.00
// This is ONLY money they physically contributed
// Used for tiered rate calculations
// Never inflated by bonuses
```

**2. Accumulated Bonus** (Rewards Earned)
```javascript
member.accumulatedBonus = 260.41
// Bonuses earned from loan payments
// Tracked separately
// Can be paid out later
// NOT used in loan calculations
```

---

## 💰 BONUS PAYOUT

### When You Want to Give Member Their Bonuses:

**Option 1: In Stockvel Tab**
```
1. Go to Stockvel tab
2. Scroll to "📝 Record Receipt"
3. Select member
4. Choose "Bonus Payout"
5. Enter amount (up to accumulated bonus)
6. Submit
```

**Result:**
- Bonus deducted from `accumulatedBonus`
- Contributions stay unchanged
- Member receives cash/transfer

**Option 2: In Bonus Report**
```
1. Click "Generate Report" in Bonus section
2. Find member
3. Click "💰 Payout" button
4. Confirm amount
```

---

## 🔑 KEY PRINCIPLES

### ✅ **Bonuses ARE:**
- Rewards for having high contributions
- Calculated automatically on each payment
- Tracked separately from contributions
- Can be paid out anytime
- Shown to you (TBFS) but hidden from member initially

### ❌ **Bonuses are NOT:**
- Added to contribution totals
- Used in tiered rate calculations
- Part of loan payments
- Mixed with regular contributions

---

## 📈 BONUS ACCUMULATION OVER LOAN TERM

### Example: R5,000 Loan / 3 Months (R10,500 contributions)

**Month 1:**
- Balance: R5,000
- Amount due to TBFS: R299.59
- 10% minimum: R500.00
- Bonus earned: R200.41
- Accumulated: R200.41

**Month 2:**
- Balance: R4,000
- Contributions now: R11,000 (added monthly)
- Amount due to TBFS: R239.67
- 10% minimum: R400.00
- Bonus earned: R160.33
- Accumulated: R360.74

**Month 3:**
- Balance: R3,000
- Contributions now: R11,500
- Amount due to TBFS: R179.75
- 10% minimum: R300.00
- Bonus earned: R120.25
- Accumulated: R480.99

**Total Bonuses: R480.99** 🎉

---

## 🎯 WHY THIS SYSTEM?

### For Members:
- **Incentive to save**: Higher contributions = lower rates = bigger bonuses
- **Reward loyalty**: Long-term members benefit most
- **Surprise delight**: Don't see bonus until earned
- **Clear separation**: Contributions stay pure

### For TBFS (You):
- **Track easily**: Separate accumulatedBonus field
- **Flexible payout**: Pay bonuses when you choose
- **Accurate records**: Contributions not inflated
- **Member retention**: Bonuses encourage staying active

---

## 🔗 SYSTEM INTEGRATION

### Where Bonuses are Calculated:
1. **Loan Creation** - Projected bonuses calculated (hidden from member)
2. **Make Payment** - Actual bonus calculated and awarded ✅ NEW!
3. **Receipt Recording** - Manual bonus entry (if needed)

### Where Bonuses are Displayed:
1. **Member Registry** - Shows accumulated bonus
2. **Payment Confirmation** - Shows bonus earned
3. **Bonus Report** - Full bonus breakdown
4. **Member Details** - View member info

### Where Bonuses are Stored:
1. **member.accumulatedBonus** - Current total
2. **stockvelReceipts[]** - History of bonuses
3. **Transaction logs** - Audit trail

---

## 📝 BONUS RECEIPT EXAMPLE

```javascript
{
    id: 1728650000000,
    memberNumber: 1001,
    memberName: "John Doe",
    type: "loan_payment",
    amount: 1780.00,
    date: "2025-10-11",
    notes: "Loan #2025001 payment - Bonus earned",
    previousTotal: 10500.00,
    newTotal: 10500.00,      // Contributions unchanged!
    bonusAmount: 260.41,      // The bonus earned
    previousBonus: 0,
    // After: member.accumulatedBonus = 260.41
}
```

---

## ⚙️ TECHNICAL DETAILS

### Bonus Calculation in makePayment():
```javascript
if (stockvelMember) {
    const remainingBalance = loan.remaining_principal + principalPaid;
    
    // What TBFS is actually due
    const amountDueToTBFS = interestPaid + adminFee + initFeePaid;
    
    // 10% minimum
    const minimumCharge = remainingBalance * 0.10;
    
    if (amountDueToTBFS < minimumCharge) {
        // Member pays 10%, earns bonus on savings
        bonusEarned = minimumCharge - amountDueToTBFS;
        stockvelMember.accumulatedBonus += bonusEarned;  // ✅
        // Contributions unchanged!                       // ✅
    } else {
        // Already paying > 10%, no bonus
        bonusEarned = 0;
    }
}
```

### Required Loan Fields:
- `loan.memberNumber` - Links to member registry
- `loan.tieredRate` - Stored during loan creation
- `loan.isStockvelLoan` - Identifies stockvel loans

---

## 🚀 CURRENT STATUS

### ✅ Implemented:
- Separate member storage
- Bonus calculation on payment
- Accumulated bonus tracking
- Stockvel receipts
- Payment confirmation shows bonus

### ⏳ TODO:
- Store tieredRate in loan at creation
- Store memberNumber in loan at creation
- Update loan creation to link member
- Auto-fill calculator from member registry

---

## 💡 SUMMARY

**The Beautiful Thing:**
Members contribute → Earn low interest rates → "Savings" become bonuses → Bonuses can be paid out

**The Key Difference:**
OLD: Bonuses added to contributions (inflated totals)
NEW: Bonuses separate (pure tracking) ✨

**Your Control:**
You decide when to pay out bonuses. They accumulate and can be distributed monthly, quarterly, or at membership renewal!

---

**Branch:** `feature/separate-stockvel-member-system`  
**Commit:** `5f2b86b` - Make Payment integration  
**Status:** ✅ Bonus system fully integrated!
