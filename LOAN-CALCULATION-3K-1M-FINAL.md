# Stockvel Loan: R3,000 for 1 Month (FINAL CORRECT CALCULATION)

## Scenario
- **Loan:** R3,000
- **Term:** 1 month  
- **Contributions:** R1,500
- **Monthly Contribution:** R500

---

## 🎯 **INITIATION FEE ANALYSIS**

### Waiver Rule:
```
R0 ────────── R1,500 ────────── R3,000
   ↑                    ↑
 WAIVED              CHARGED
 (no fee)          12% = R180
```

- **Waived zone:** R0 - R1,500 (up to contributions)
- **Charged zone:** R1,500 - R3,000 (excess)
- **Total initiation:** (R3,000 - R1,500) × 12% = **R180**

---

## 📊 **TIER 5 POSITION ANALYSIS**

### Tier Boundaries (R1,500 savings):
```
Tier 1: R0 - R450
Tier 2: R450 - R1,125
Tier 3: R1,125 - R1,575
Tier 4: R1,575 - R1,650
Tier 5: R1,650 - R3,000 ← R1,350 here!
```

### Tier 5 vs Initiation Waiver:
```
Contribution threshold: R1,500
Tier 5 starts at:       R1,650

R1,650 > R1,500 ✅

Result: ALL of Tier 5 (100%) is in the CHARGED zone!
```

---

## 💰 **CORRECTED TIER 5 CALCULATION**

### Tier 5 Amount: R1,350

**Position Check:**
- Tier 5 start: R1,650
- Contribution threshold: R1,500
- **R1,650 >= R1,500** → 100% has initiation ✅

**Proportional Initiation:**
```
tier5InitiationPortion = 1.0 (100%)
proportionalInitiation = R180 × 1.0 = R180 ✅

OLD (wrong): R180 × (1,350/3,000) = R81 ❌
NEW (correct): R180 × 1.0 = R180 ✅
```

**Proportional Admin:**
```
Admin proportion = 1,350 / 3,000 = 45%
proportionalAdmin = R60 × 0.45 = R27
```

**Income Table Calculation:**
```
30% Total Charge = R1,350 × 0.30 = R405.00

Subtract fees:
  - Initiation: R180.00 (100% of tier in charged zone)
  - Admin:       R27.00 (45% of total admin)
  
Interest = R405 - R180 - R27 = R198.00 ✅

OLD calculation: R405 - R81 - R27 = R297 ❌
Difference: R99 LESS interest (more allocated to fees correctly)
```

---

## 📋 **FULL LOAN CALCULATION**

### Complete Tiered Interest:

| Tier | Amount | Rate | Method | Interest |
|------|--------|------|--------|----------|
| 1 | R450 | 3% | Simple | R13.50 |
| 2 | R675 | 8% | Simple | R54.00 |
| 3 | R450 | 15% | Simple | R67.50 |
| 4 | R75 | 25% | Simple | R18.75 |
| 5 | R1,350 | 30% | **Income Table** | **R198.00** |
| **TOTAL** | R3,000 | | | **R351.75** |

**Effective Interest Rate:** 351.75 / 3,000 = **11.725%**

### Check 10% Minimum:
- Tiered: R351.75 (11.725%)
- 10% Min: R300.00
- **Use tiered** (higher) ✅

### Admin Fee:
- Based on 11.725% rate
- Admin = R60 × (1 - 0.11725) = **R52.97**

### Total Fees:
- Interest: R351.75
- Admin: R52.97
- Initiation: R180.00
- **Total:** R584.72

### Bonus Check:
- Tiered total: R584.72
- 10% minimum total: R540 (R300 + R60 + R180)
- Tiered > Minimum → **No bonus** ✅

---

## 💳 **FINAL PAYMENT BREAKDOWN**

| Component | Amount | Notes |
|-----------|--------|-------|
| **Principal** | R3,000.00 | Full repayment |
| **Interest** | R351.75 | Tiered (11.725%) |
| **Admin Fee** | R52.97 | R60 × (1 - 0.11725) |
| **Initiation** | R180.00 | 12% on R1,500 excess |
| **Bonus** | R0 | Tiered > minimum |
| **TOTAL** | **R3,584.72** | One payment |

---

## 📊 **EVOLUTION OF CALCULATIONS**

| Version | Tier 5 Interest | Total Interest | Total Payment | Notes |
|---------|----------------|----------------|---------------|-------|
| **Original** | R405 | R558.75 | R3,787.58 | 30% = interest only ❌ |
| **First Fix** | R351 | R504.75 | R3,681.74 | 30% = total, but wrong proportion ⚠️ |
| **FINAL** | R198 | R351.75 | **R3,584.72** | 30% = total, correct zones ✅ |

**Total improvement: R202.86 savings (5.4%)** from original to final!

---

## 🎯 **WHY THE DIFFERENCE?**

### Initiation Fee Allocation:

**Original (Wrong):**
```
Tier 5 Interest = R1,350 × 30% = R405
(Plus full fees on top)
```

**First Fix (Partially Correct):**
```
30% of Tier 5 = R405 total
- Init (45% of R180): R81
- Admin (45% of R60): R27
= Interest: R297
```

**FINAL (Fully Correct):**
```
30% of Tier 5 = R405 total
- Init (100% of R180): R180 ← ALL of Tier 5 has init!
- Admin (45% of R60): R27
= Interest: R198 ✅
```

**The key:** Tier 5 starts at R1,650, which is ABOVE the R1,500 contribution threshold. So **100%** of Tier 5 is in the initiation-charged zone, not just 45%!

---

## ✨ **CONCLUSION**

**With FULL CONSISTENCY + Initiation Zone Awareness:**

**Final Payment: R3,584.72**

Breakdown:
- Tier 1-4: R153.75 interest (favorable rates)
- Tier 5: R198 interest (Income Table method, correct initiation allocation)
- Admin: R52.97 (variable based on effective rate)
- Initiation: R180 (on R1,500 excess only)

**The system now:**
✅ Uses Income Table for all 30% calculations
✅ Correctly accounts for initiation waiver zones
✅ Properly allocates fees to tier portions
✅ Achieves full mathematical consistency

**Lindelo, this is the CORRECT calculation your system will now use!** 🎯✨
