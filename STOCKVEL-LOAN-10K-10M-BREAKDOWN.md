# Stockvel Member Loan Calculation Breakdown
## R10,000 for 10 Months

**Generated:** ${new Date().toISOString()}  
**Calculation Method:** Tiered Interest + 10% Minimum + Long-Term Interest Cap

---

## 📋 Loan Details

```
Principal Amount:           R10,000
Loan Term:                  10 months
Monthly Contribution:       R500
Total Contributions:        R500 (Month 1 already paid)
Initial Contribution:       R0
Loan Start:                 Month 2 (Week 1)
Member Status:              Active Stockvel Member
```

---

## 📊 Step 1: Interest Period Calculation

### **The Rule:**
```
Interest Period = Math.ceil(term / 2) with minimum 3 months
Interest Period = Math.min(Calculated Months, Actual Term)
```

### **For This Loan:**
```
Term = 10 months
Calculated Months = Math.ceil(10 / 2) = Math.ceil(5) = 5
Minimum Check = 5 >= 3 ? ✅ Yes
Interest Period = Math.min(5, 10) = 5 months
```

**Result:** Interest calculated for **5 months only** (declining balance)  
**Same as standard loan** ✅

---

## 📊 Step 2: Initiation Fee Calculation

### **Stockvel Member Benefit:**

```
Initiation Fee Formula:
- If Principal ≤ Contributions: 0% (WAIVED)
- If Principal > Contributions: 12% on the EXCESS only

Our Case:
Principal:        R10,000
Contributions:       R500
Excess:           R9,500

Initiation Fee = R9,500 × 12% = R1,140.00
Monthly Fee = R1,140 ÷ 10 = R114.00 per month
```

**Savings vs Standard:** R1,200 - R1,140 = **R60 saved!** 🎉

---

## 📊 Step 3: Tiered Interest Tiers (Boundaries)

### **The Tiers:**

Based on R500 initial contributions:

```
┌────────┬─────────────────────┬──────────────┬──────────┐
│ Tier   │ Range               │ Amount       │ Rate     │
├────────┼─────────────────────┼──────────────┼──────────┤
│ Tier 1 │ 0% - 30% of savings │ R0 - R150    │ 3%       │
│ Tier 2 │ 30% - 75% of savings│ R150 - R375  │ 8%       │
│ Tier 3 │ 75% - 105% of savings│ R375 - R525 │ 15%      │
│ Tier 4 │ 105% - 110% of savings│ R525 - R550│ 25%      │
│ Tier 5 │ Above 110% of savings│ R550+        │ 30%*     │
└────────┴─────────────────────┴──────────────┴──────────┘

* Tier 5 uses Income Table method
```

**Our R10,000 loan is WAY above Tier 4 boundary (R550)!**  
Most of the loan is in Tier 5 = Higher interest

---

## 📊 Step 4: Month-by-Month Calculation

### **Key Points:**
- Savings grow by R500 each month (after month 1)
- Tier boundaries adjust as savings increase
- Interest calculated on declining balance
- 10% minimum rule applies
- Admin fee varies by tier rate

---

### **Month 1: Outstanding = R10,000**

#### **Current Savings:**
```
Previous: R500
New contribution: R500 (paid in month 2)
Current: R500 (no new contribution yet for month 1 calculation)
```

#### **Tier Boundaries:**
```
Tier 1 max: R500 × 0.30 = R150
Tier 2 max: R500 × 0.75 = R375
Tier 3 max: R500 × 1.05 = R525
Tier 4 max: R500 × 1.10 = R550
Tier 5: Above R550
```

#### **Tiered Interest Calculation:**

```
Tier 1: R150 × 3% = R4.50
Tier 2: (R375 - R150) = R225 × 8% = R18.00
Tier 3: (R525 - R375) = R150 × 15% = R22.50
Tier 4: (R550 - R525) = R25 × 25% = R6.25
───────────────────────────────────────────
Tiers 1-4 Total: R51.25

Tier 5 Amount: R10,000 - R550 = R9,450
```

#### **Tier 5 (Income Table Method):**
```
Tier 5 Amount: R9,450
30% Total Charge: R9,450 × 0.30 = R2,835.00

Admin Fee Calculation:
Tiers 1-4 Rate: R51.25 ÷ R550 = 9.32%
Admin Fee: R60 × (1 - 0.0932) = R54.41

Tier 5 Interest = R2,835 - R54.41 - R114.00 = R2,666.59
```

#### **Total Tiered Interest:**
```
Tiers 1-4: R51.25
Tier 5: R2,666.59
───────────────────
Total: R2,717.84
```

#### **10% Minimum Check:**
```
Minimum Interest: R10,000 × 10% = R1,000.00
Tiered Interest: R2,717.84

R2,717.84 > R1,000? ✅ Yes
Use Tiered Interest: R2,717.84
```

#### **Admin Fee:**
```
Based on Tiers 1-4 rate: R54.41
```

#### **Summary for Month 1:**
```
Principal Payment: R1,000.00
Interest: R2,717.84
Admin Fee: R54.41
Initiation Fee: R114.00
───────────────────────────
Monthly Payment: R3,886.25
Bonus: R0 (tiered > minimum)

Balance After: R9,000
```

---

### **Month 2: Outstanding = R9,000**

#### **Current Savings:**
```
Previous: R500
New contribution: R500
Current: R1,000
```

#### **Tier Boundaries (Updated):**
```
Tier 1 max: R1,000 × 0.30 = R300
Tier 2 max: R1,000 × 0.75 = R750
Tier 3 max: R1,000 × 1.05 = R1,050
Tier 4 max: R1,000 × 1.10 = R1,100
Tier 5: Above R1,100
```

#### **Tiered Interest Calculation:**

```
Tier 1: R300 × 3% = R9.00
Tier 2: (R750 - R300) = R450 × 8% = R36.00
Tier 3: (R1,050 - R750) = R300 × 15% = R45.00
Tier 4: (R1,100 - R1,050) = R50 × 25% = R12.50
───────────────────────────────────────────
Tiers 1-4 Total: R102.50

Tier 5 Amount: R9,000 - R1,100 = R7,900
```

#### **Tier 5 (Income Table Method):**
```
Tier 5 Amount: R7,900
30% Total Charge: R7,900 × 0.30 = R2,370.00

Admin Fee Calculation:
Tiers 1-4 Rate: R102.50 ÷ R1,100 = 9.32%
Admin Fee: R60 × (1 - 0.0932) = R54.41

Tier 5 Interest = R2,370 - R54.41 - R114.00 = R2,201.59
```

#### **Total Tiered Interest:**
```
Tiers 1-4: R102.50
Tier 5: R2,201.59
───────────────────
Total: R2,304.09
```

#### **10% Minimum Check:**
```
Minimum Interest: R9,000 × 10% = R900.00
Tiered Interest: R2,304.09

R2,304.09 > R900? ✅ Yes
Use Tiered Interest: R2,304.09
```

#### **Summary for Month 2:**
```
Principal Payment: R1,000.00
Interest: R2,304.09
Admin Fee: R54.41
Initiation Fee: R114.00
───────────────────────────
Monthly Payment: R3,472.50
Bonus: R0

Balance After: R8,000
```

---

### **Month 3: Outstanding = R8,000**

#### **Current Savings:**
```
Current: R1,500 (R500 × 3 months)
```

#### **Tier Boundaries:**
```
Tier 1 max: R450
Tier 2 max: R1,125
Tier 3 max: R1,575
Tier 4 max: R1,650
Tier 5: Above R1,650
```

#### **Tiered Interest:**
```
Tier 1: R450 × 3% = R13.50
Tier 2: R675 × 8% = R54.00
Tier 3: R450 × 15% = R67.50
Tier 4: R75 × 25% = R18.75
───────────────────────────
Tiers 1-4 Total: R153.75

Tier 5: R8,000 - R1,650 = R6,350
Tier 5 Interest (Income Table): R1,735.59
───────────────────────────
Total Tiered: R1,889.34
```

#### **10% Minimum Check:**
```
Minimum: R800.00
Tiered: R1,889.34
Use: R1,889.34 ✅
```

#### **Summary for Month 3:**
```
Monthly Payment: R3,057.75
Bonus: R0
Balance After: R7,000
```

---

### **Month 4: Outstanding = R7,000**

#### **Current Savings:**
```
Current: R2,000 (R500 × 4 months)
```

#### **Tier Boundaries:**
```
Tier 1 max: R600
Tier 2 max: R1,500
Tier 3 max: R2,100
Tier 4 max: R2,200
Tier 5: Above R2,200
```

#### **Tiered Interest:**
```
Tier 1: R600 × 3% = R18.00
Tier 2: R900 × 8% = R72.00
Tier 3: R600 × 15% = R90.00
Tier 4: R100 × 25% = R25.00
───────────────────────────
Tiers 1-4 Total: R205.00

Tier 5: R7,000 - R2,200 = R4,800
Tier 5 Interest: R1,274.59
───────────────────────────
Total Tiered: R1,479.59
```

#### **10% Minimum Check:**
```
Minimum: R700.00
Tiered: R1,479.59
Use: R1,479.59 ✅
```

#### **Summary for Month 4:**
```
Monthly Payment: R2,648.00
Bonus: R0
Balance After: R6,000
```

---

### **Month 5: Outstanding = R6,000**

#### **Current Savings:**
```
Current: R2,500 (R500 × 5 months)
```

#### **Tier Boundaries:**
```
Tier 1 max: R750
Tier 2 max: R1,875
Tier 3 max: R2,625
Tier 4 max: R2,750
Tier 5: Above R2,750
```

#### **Tiered Interest:**
```
Tier 1: R750 × 3% = R22.50
Tier 2: R1,125 × 8% = R90.00
Tier 3: R750 × 15% = R112.50
Tier 4: R125 × 25% = R31.25
───────────────────────────
Tiers 1-4 Total: R256.25

Tier 5: R6,000 - R2,750 = R3,250
Tier 5 Interest: R813.59
───────────────────────────
Total Tiered: R1,069.84
```

#### **10% Minimum Check:**
```
Minimum: R600.00
Tiered: R1,069.84
Use: R1,069.84 ✅
```

#### **Summary for Month 5:**
```
Monthly Payment: R2,238.25
Bonus: R0
Balance After: R5,000
```

---

## 📊 Step 5: Interest Calculation Summary (First 5 Months)

```
┌───────┬──────────────┬────────────┬──────────┬──────────┐
│ Month │ Outstanding  │ Savings    │ Interest │ Admin    │
├───────┼──────────────┼────────────┼──────────┼──────────┤
│   1   │  R10,000     │    R500    │ R2,717.84│  R54.41  │
│   2   │   R9,000     │  R1,000    │ R2,304.09│  R54.41  │
│   3   │   R8,000     │  R1,500    │ R1,889.34│  R54.41  │
│   4   │   R7,000     │  R2,000    │ R1,479.59│  R54.41  │
│   5   │   R6,000     │  R2,500    │ R1,069.84│  R54.41  │
├───────┼──────────────┼────────────┼──────────┼──────────┤
│ TOTAL │              │            │ R9,460.70│ R272.05  │
└───────┴──────────────┴────────────┴──────────┴──────────┘
```

**Total Interest (5 months only):** **R9,460.70**

---

## 📊 Step 6: Equalize Interest & Calculate Total Cost

### **Interest Equalization:**
```
Total Interest (5 months): R9,460.70
Spread over 10 months: R9,460.70 ÷ 10 = R946.07 per month
```

### **Admin Fee Equalization:**
```
Total Admin (5 months): R272.05
Spread over 10 months: R272.05 ÷ 10 = R27.21 per month
```

### **Total Cost:**
```
Principal:               R10,000.00
+ Interest (capped):      R9,460.70
+ Initiation Fee:         R1,140.00
+ Admin Fees:               R272.05
────────────────────────────────────
= TOTAL COST:            R20,872.75

Equal Monthly Payment = R20,872.75 ÷ 10 = R2,087.28
```

---

## 📅 Monthly Payment Schedule (Equal Installments)

```
┌───────┬───────────┬──────────┬────────┬──────────┬───────────┬──────────┐
│ Month │ Principal │ Interest │  Admin │ Init Fee │   Total   │ Balance  │
├───────┼───────────┼──────────┼────────┼──────────┼───────────┼──────────┤
│   1   │  R1,000   │  R946.07 │ R27.21 │  R114.00 │  R2,087.28│ R9,000   │
│   2   │  R1,000   │  R946.07 │ R27.21 │  R114.00 │  R2,087.28│ R8,000   │
│   3   │  R1,000   │  R946.07 │ R27.21 │  R114.00 │  R2,087.28│ R7,000   │
│   4   │  R1,000   │  R946.07 │ R27.21 │  R114.00 │  R2,087.28│ R6,000   │
│   5   │  R1,000   │  R946.07 │ R27.21 │  R114.00 │  R2,087.28│ R5,000   │
│   6   │  R1,000   │  R946.07 │ R27.21 │  R114.00 │  R2,087.28│ R4,000   │
│   7   │  R1,000   │  R946.07 │ R27.21 │  R114.00 │  R2,087.28│ R3,000   │
│   8   │  R1,000   │  R946.07 │ R27.21 │  R114.00 │  R2,087.28│ R2,000   │
│   9   │  R1,000   │  R946.07 │ R27.21 │  R114.00 │  R2,087.28│ R1,000   │
│  10   │  R1,000   │  R946.07 │ R27.21 │  R114.00 │  R2,087.28│     R0   │
├───────┼───────────┼──────────┼────────┼──────────┼───────────┼──────────┤
│ TOTAL │ R10,000   │ R9,460.70│ R272.10│ R1,140.00│ R20,872.80│          │
└───────┴───────────┴──────────┴────────┴──────────┴───────────┴──────────┘
```

**Every month: Pay R2,087.28 → Equal predictable payments** ✅

---

## 💡 Stockvel vs Standard Comparison

```
┌─────────────────────────────┬────────────┬────────────┬───────────┐
│ Component                   │  Standard  │  Stockvel  │ Savings   │
├─────────────────────────────┼────────────┼────────────┼───────────┤
│ Principal                   │ R10,000.00 │ R10,000.00 │     R0    │
│ Interest                    │ R11,100.00 │  R9,460.70 │  R1,639.30│
│ Initiation Fee              │  R1,200.00 │  R1,140.00 │     R60.00│
│ Admin Fees                  │    R600.00 │    R272.10 │    R327.90│
├─────────────────────────────┼────────────┼────────────┼───────────┤
│ TOTAL COST                  │ R22,900.00 │ R20,872.80 │  R2,027.20│
│ Monthly Payment             │  R2,290.00 │  R2,087.28 │    R202.72│
└─────────────────────────────┴────────────┴────────────┴───────────┘
```

### **Stockvel Member Saves:**
- **R2,027.20 total** (8.85% less)
- **R202.72 per month** 
- Lower interest (R1,639 less)
- Lower admin fees (R328 less)
- Lower initiation fee (R60 less)

**Being a stockvel member saves almost R2,000!** 🎉

---

## 📊 Key Differences: Stockvel vs Standard

### **Standard Loan:**
- Fixed 30% Income Table rate
- R60 admin fee every month
- 12% initiation fee on full amount
- Higher total cost

### **Stockvel Loan:**
- Tiered rates (3% to 30%)
- Variable admin fee (lower with better tiers)
- 12% initiation fee on EXCESS only
- Savings grow monthly = Better rates
- **Much lower total cost!**

---

## 🎯 Summary

### **The Math:**
1. **Interest calculated** for 5 months (declining balance + growing savings)
2. **Tiered rates** applied (3%, 8%, 15%, 25%, 30%)
3. **Total interest** = R9,460.70 (vs R11,100 for standard)
4. **Equalized** across 10 months = R946.07/month
5. **Total cost** = R20,872.80

### **The Benefits:**
- ✅ **Lower interest** - Tiered rates reward savings
- ✅ **Lower admin fees** - Variable based on tier performance
- ✅ **Lower initiation fee** - Only on excess above contributions
- ✅ **Interest capped** - Only 5 months calculation
- ✅ **Predictable** - Equal monthly payments
- ✅ **Total savings** - R2,027 less than standard!

### **The Result:**
**Stockvel member pays R2,087.28 per month for 10 months = R20,872.80 total**

**vs Standard client paying R2,290 per month = R22,900 total**

**Stockvel membership advantage: R2,027.20 savings!** 🌟

---

## 📋 Loan Object Fields (Stockvel)

```javascript
{
    loan_id: 1,
    client_name: "Stockvel Member Name",
    account_number: "ACC001",
    
    // Principal tracking
    principal_amount: 10000,
    original_principal: 10000,
    remaining_principal: 10000,
    
    // Term & payments
    term_months: 10,
    monthly_payment: 2087.28,
    payments_made: 0,
    
    // Financial totals
    total_cost: 20872.80,
    current_balance: 20872.80,
    total_interest: 9460.70,
    
    // Interest cap fields
    interest_calculation_months: 5,
    max_interest_allowed: 9460.70,
    expected_monthly_interest: 946.07,
    total_interest_charged: 0,
    interest_paid: 0,
    
    // Fee tracking
    total_initiation_fee: 1140.00,
    initiation_fee_paid: 0,
    
    // Stockvel-specific
    loan_type: 'stockvel',
    total_contributions: 500,
    monthly_contribution: 500,
    isStockvelLoan: true,
    tieredRate: 0.0932, // For bonus calculation
    
    // Status
    status: 'active'
}
```

---

**Generated by:** TBFS Calculation Engine v2.0  
**Method:** Tiered Stockvel + Interest Cap  
**Member Benefit:** R2,027.20 savings vs Standard

---

*Stockvel membership pays off!* 💼✨
