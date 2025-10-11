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
// Step 1: Calculate what member WOULD pay at 10% minimum
minimumInterest = balance × 0.10
minimumCharge = minimumInterest + R60 (admin) + initiation fee portion

// Step 2: Calculate what member ACTUALLY pays (tiered rate)
tieredInterest = calculateTieredStockvelInterest(balance, contributions)
actualCharge = tieredInterest + adminFee + initiation fee portion

// Step 3: The difference is the BONUS!
bonus = minimumCharge - actualCharge
```

### Example Calculation:
```
Member has R10,500 contributions
Takes R5,000 loan for 3 months
Outstanding balance: R5,000

TIERED CALCULATION:
- First R3,150 @ 3% = R94.50
- Next R1,850 @ 8% = R148.00
- Total tiered interest = R242.50 (4.85% effective rate)

Admin fee @ 4.85%: R60 × (1 - 0.0485) = R57.09
Initiation (assuming R0 waived): R0
Actual charge = R242.50 + R57.09 = R299.59

MINIMUM CALCULATION:
- Interest @ 10% = R500.00
- Admin fee = R60.00
- Initiation = R0
- Minimum charge = R560.00

BONUS EARNED:
R560.00 - R299.59 = R260.41

✨ Member saves R260.41 and gets it as a bonus!
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
if (tieredRate < 10%) {
    bonusEarned = minimumCharge - actualCharge;
    member.accumulatedBonus += bonusEarned;  // Added here!
    // member.totalContributions UNCHANGED!   // Important!
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
• Bonus Earned: R260.41
• Total Accumulated: R260.41

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

### Example: R5,000 Loan / 3 Months

**Month 1:**
- Balance: R5,000
- Tiered rate: ~4.85%
- Bonus earned: R260.41
- Accumulated: R260.41

**Month 2:**
- Balance: R4,000
- Contributions now: R11,000 (added monthly)
- Tiered rate: ~3.8%
- Bonus earned: R248.30
- Accumulated: R508.71

**Month 3:**
- Balance: R3,000
- Contributions now: R11,500
- Tiered rate: ~3.5%
- Bonus earned: R195.20
- Accumulated: R703.91

**Total Bonuses: R703.91** 🎉

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
if (stockvelMember && loan.tieredRate !== undefined) {
    const remainingBalance = loan.remaining_principal + principalPaid;
    const minimumInterest = remainingBalance * 0.10;
    const tieredInterest = remainingBalance * (loan.tieredRate || 0);
    
    if (tieredInterest < minimumInterest) {
        const minimumCharge = minimumInterest + 60 + initFeePerMonth;
        const actualCharge = interestPaid + adminFee + initFeePaid;
        bonusEarned = Math.max(0, minimumCharge - actualCharge);
        
        stockvelMember.accumulatedBonus += bonusEarned;  // ✅
        // Contributions unchanged!                       // ✅
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
