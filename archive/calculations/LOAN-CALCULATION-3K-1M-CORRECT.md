# Stockvel Loan: R3,000 for 1 Month (CORRECT CALCULATION)

## Scenario
- **Loan:** R3,000
- **Term:** 1 month  
- **Initial Contributions:** R1,500
- **Monthly Contribution:** R500

---

## 🎯 **INITIATION FEE CALCULATION (Once at Loan Start)**

### **The Rule:**
> Initiation fee is WAIVED for up to the value of total contributions at the beginning of the loan. The EXCESS is charged at 12% and spread over the loan period.

### **Application:**
```
Principal:            R3,000
Total Contributions:  R1,500
Excess:               R3,000 - R1,500 = R1,500

Total Initiation = R1,500 × 12% = R180 ✅
Monthly Initiation = R180 / 1 month = R180 ✅
```

**Zone visualization:**
```
R0 ────────── R1,500 ────────── R3,000
   ↑                    ↑
 WAIVED              CHARGED
 (no fee)            R180 total
```

**✅ The zone logic is applied HERE - once at loan start!**

---

## 📊 **TIERED INTEREST CALCULATION**

### Tier Boundaries (based on R1,500 contributions):

| Tier | Range | Rate | Method |
|------|-------|------|--------|
| 1 | R0 - R450 (30%) | 3% | Simple interest |
| 2 | R450 - R1,125 (75%) | 8% | Simple interest |
| 3 | R1,125 - R1,575 (105%) | 15% | Simple interest |
| 4 | R1,575 - R1,650 (110%) | 25% | Simple interest |
| 5 | R1,650+ (>110%) | 30% | **Income Table** |

### Tier Interest Calculation:

| Tier | Amount | Rate | Method | Interest |
|------|--------|------|--------|----------|
| 1 | R450 | 3% | Simple | R13.50 |
| 2 | R675 | 8% | Simple | R54.00 |
| 3 | R450 | 15% | Simple | R67.50 |
| 4 | R75 | 25% | Simple | R18.75 |
| 5 | R1,350 | 30% | **Income Table** | **R297.00** |
| **TOTAL** | R3,000 | | | **R450.75** |

---

## 🔍 **TIER 5 INCOME TABLE BREAKDOWN**

**Tier 5 Amount:** R1,350

### Simple Proportion Allocation:
```
Tier 5 proportion = R1,350 / R3,000 = 45% ✅

This is the proportion of the outstanding balance in Tier 5.
We allocate 45% of ALL monthly fees to this tier.
```

### Fee Allocation to Tier 5:
```
Monthly Initiation Fee = R180 (already calculated with zone awareness)
Proportional to Tier 5 = R180 × 45% = R81 ✅

Monthly Admin Fee = R60
Proportional to Tier 5 = R60 × 45% = R27 ✅
```

### Income Table Calculation:
```
30% Total Charge = R1,350 × 0.30 = R405.00

This R405 must cover:
  - Interest (what we're solving for)
  - Initiation (R81 - proportional share)
  - Admin (R27 - proportional share)

Therefore:
Interest = R405.00 - R81.00 - R27.00 = R297.00 ✅
```

---

## 💰 **COMPLETE LOAN CALCULATION**

### Total Interest:
```
Tier 1-4: R153.75
Tier 5:   R297.00
TOTAL:    R450.75 (15.025% effective rate)
```

### Check 10% Minimum:
```
Tiered Interest: R450.75 (15.025%)
10% Minimum:     R300.00 (10%)

Use: R450.75 (tiered is higher) ✅
```

### Admin Fee Calculation:
```
Based on effective rate: 15.025%
Admin = R60 × (1 - 0.15025) = R50.99 ✅
```

### Total Fees Summary:
```
Interest:   R450.75
Admin:      R50.99
Initiation: R180.00
TOTAL FEES: R681.74
```

### Bonus Check:
```
Tiered total: R681.74
10% minimum:  R540.00 (R300 + R60 + R180)

Tiered > Minimum → No bonus ✅
```

---

## 💳 **FINAL PAYMENT BREAKDOWN**

| Component | Amount | Calculation |
|-----------|--------|-------------|
| **Principal** | R3,000.00 | Full repayment |
| **Interest** | R450.75 | Tiered calculation |
| **Admin Fee** | R50.99 | R60 × (1 - 0.15025) |
| **Initiation** | R180.00 | (R3k - R1.5k) × 12% |
| **Bonus** | R0 | No bonus (tiered > min) |
| **TOTAL DUE** | **R3,681.74** | Single payment |

---

## 🎯 **KEY INSIGHTS**

### 1. **Initiation Fee - Applied Once**
```
✅ Calculated at loan START with zone awareness
✅ (principal - contributions) × 12% = R180
✅ Spread over term: R180 / 1 = R180 per month
✅ Then allocated to tiers by SIMPLE proportion
```

### 2. **NO Double-Counting of Zones**
```
❌ WRONG: Check zones again when allocating to Tier 5
✅ RIGHT: Zone logic applied once at start, then simple proportion
```

### 3. **Tier 5 Income Table Method**
```
✅ 30% = TOTAL TBFS income (not just interest)
✅ Subtract proportional fees to get interest
✅ Proportional = tier size / total outstanding
```

### 4. **Consistency Achieved**
```
✅ Standard loans at 30%: Income Table method
✅ Stockvel Tier 5 at 30%: Income Table method
✅ Same formula, same approach across the board
```

---

## 📈 **EVOLUTION OF UNDERSTANDING**

| Version | Tier 5 Calculation | Total Payment | Issue |
|---------|-------------------|---------------|-------|
| **Original** | 30% = interest only | R3,787.58 | No fee deduction ❌ |
| **Over-engineered** | Zone double-counting | R3,584.72 | Re-checked zones ❌ |
| **CORRECT** | Simple proportion | **R3,681.74** | Applied once ✅ |

---

## ✨ **CONCLUSION**

**The CORRECT calculation for R3,000 / 1 month:**

**Total Payment: R3,681.74**

This reflects:
- ✅ Initiation zone logic applied once at start
- ✅ Simple proportional allocation to tiers
- ✅ Income Table method for 30% tier
- ✅ Full system consistency

**This is what your system now correctly implements, Lindelo!** 🎯✨

Thank you for catching my over-engineering error! The rule is elegantly simple: calculate initiation with zones at the start, then allocate proportionally. No need to re-check zones! 🙌
