# Stockvel Loan Calculation: R3,000 for 3 Months

## Scenario Setup
- **Loan Amount:** R3,000
- **Term:** 3 months
- **Initial Contributions:** R1,500
- **Monthly Contribution:** R500
- **Principal Payment per Month:** R1,000

---

## 📊 Savings Growth & Tier Progression

| Month | Starting Balance | Savings | Loan/Savings Ratio | Tier |
|-------|------------------|---------|-------------------|------|
| 1 | R3,000 | R1,500 | 200% | Multiple (>110%) |
| 2 | R2,000 | R2,000 | 100% | Tier 3 (15%) |
| 3 | R1,000 | R2,500 | 40% | Tier 2 (8%) |

**Key Transition:** Savings catch up by month 2! 🎉

---

## 💰 MONTH 1 CALCULATION

**Balance:** R3,000 | **Savings:** R1,500

### Tiered Interest:
| Tier | Amount | Rate | Interest |
|------|--------|------|----------|
| 1 (0-30%) | R450 | 3% | R13.50 |
| 2 (30-75%) | R675 | 8% | R54.00 |
| 3 (75-105%) | R450 | 15% | R67.50 |
| 4 (105-110%) | R75 | 25% | R18.75 |
| 5 (>110%) | R1,350 | 30% | R405.00 |
| **TOTAL** | R3,000 | **18.625%** | **R558.75** |

### 10% Minimum Check:
- Tiered: R558.75
- 10% Min: R300
- **Use tiered** (higher) ✅

### Fees:
- Admin: R60 × (1 - 0.18625) = **R48.83**
- Initiation: R180 ÷ 3 = **R60**

### Bonus:
- Tiered > 10% minimum → **No bonus**

### Month 1 Payment:
```
Principal:     R1,000.00
Interest:        R558.75
Admin:            R48.83
Initiation:       R60.00
─────────────────────────
TOTAL:         R1,667.58
Bonus:              R0.00
```

---

## 💰 MONTH 2 CALCULATION

**Balance:** R2,000 | **Savings:** R2,000 (catches up!)

### Tier Analysis (100% coverage):
Loan = 100% of savings → Falls in **Tier 3 (75-105%)** @ 15%

### Tiered Interest:
| Tier | Amount | Rate | Interest |
|------|--------|------|----------|
| 1 (0-30%) | R600 | 3% | R18.00 |
| 2 (30-75%) | R900 | 8% | R72.00 |
| 3 (75-105%) | R500 | 15% | R75.00 |
| **TOTAL** | R2,000 | **8.25%** | **R165.00** |

### 10% Minimum Check:
- Tiered: R165.00 (8.25%)
- 10% Min: R200.00
- **Use 10% minimum** ✅ (kicks in!)

### Fees (using 10% rate):
- Admin: R60 × (1 - 0.10) = **R54.00**
- Initiation: **R60**

### Bonus Calculation! 💰
**This is where the magic happens!**

- **Amount due (tiered):** 
  - Interest: R165.00
  - Admin (at 8.25%): R60 × (1 - 0.0825) = R55.05
  - Initiation: R60
  - **Total: R280.05**

- **Amount due (10% minimum):**
  - Interest: R200.00
  - Admin (at 10%): R54.00
  - Initiation: R60
  - **Total: R314.00**

- **Member pays 10% minimum** (R314) but earned tiered rate (R280.05)
- **BONUS: R314.00 - R280.05 = R33.95** ✨

### Month 2 Payment:
```
Principal:     R1,000.00
Interest:        R200.00 (10% min)
Admin:            R54.00
Initiation:       R60.00
─────────────────────────
TOTAL:         R1,314.00
Bonus Earned:     R33.95 💰
```

---

## 💰 MONTH 3 CALCULATION

**Balance:** R1,000 | **Savings:** R2,500 (well ahead!)

### Tier Analysis (40% coverage):
Loan = 40% of savings → Falls in **Tier 2 (30-75%)** @ 8%

### Tiered Interest:
| Tier | Amount | Rate | Interest |
|------|--------|------|----------|
| 1 (0-30%) | R750 | 3% | R22.50 |
| 2 (30-75%) | R250 | 8% | R20.00 |
| **TOTAL** | R1,000 | **4.25%** | **R42.50** |

### 10% Minimum Check:
- Tiered: R42.50 (4.25%)
- 10% Min: R100.00
- **Use 10% minimum** ✅ (big gap!)

### Fees (using 10% rate):
- Admin: R60 × (1 - 0.10) = **R54.00**
- Initiation: **R60**

### Bonus Calculation! 💰💰
**Even bigger bonus this month!**

- **Amount due (tiered):**
  - Interest: R42.50
  - Admin (at 4.25%): R60 × (1 - 0.0425) = R57.45
  - Initiation: R60
  - **Total: R159.95**

- **Amount due (10% minimum):**
  - Interest: R100.00
  - Admin (at 10%): R54.00
  - Initiation: R60
  - **Total: R214.00**

- **Member pays 10% minimum** (R214) but earned tiered rate (R159.95)
- **BONUS: R214.00 - R159.95 = R54.05** ✨✨

### Month 3 Payment:
```
Principal:     R1,000.00
Interest:        R100.00 (10% min)
Admin:            R54.00
Initiation:       R60.00
─────────────────────────
TOTAL:         R1,214.00
Bonus Earned:     R54.05 💰💰
```

---

## 📊 COMPLETE SUMMARY

### Payment Schedule:

| Month | Balance | Savings | Rate | Principal | Interest | Fees | Total Payment | Bonus |
|-------|---------|---------|------|-----------|----------|------|---------------|-------|
| 1 | R3,000 | R1,500 | 18.625% | R1,000 | R558.75 | R108.83 | **R1,667.58** | R0 |
| 2 | R2,000 | R2,000 | 8.25%→10% | R1,000 | R200.00 | R114.00 | **R1,314.00** | **R33.95** |
| 3 | R1,000 | R2,500 | 4.25%→10% | R1,000 | R100.00 | R114.00 | **R1,214.00** | **R54.05** |

### Totals:
```
Total Principal:           R3,000.00
Total Interest:              R858.75
Total Admin Fees:            R156.83
Total Initiation:            R180.00
────────────────────────────────────
GRAND TOTAL PAID:          R4,195.58
Total Bonuses Earned:         R88.00 💰
```

---

## 💡 KEY INSIGHTS

### The Breakthrough Moment:
**Month 1:** No advantage (loan 2× savings, pays tiered 18.625%)
**Month 2:** Savings catch up! (100% coverage) → 10% minimum kicks in → **Bonus earned!**
**Month 3:** Savings surpass! (40% ratio) → Huge gap between tiered (4.25%) and minimum → **Bigger bonus!**

### Why Bonuses Increase:
- Month 2: Gap between tiered (8.25%) and minimum (10%) = 1.75%
- Month 3: Gap between tiered (4.25%) and minimum (10%) = 5.75% ← **3× larger gap!**

### Payment Pattern:
```
Month 1:  ██████████████████ R1,667.58 (no bonus, high rate)
Month 2:  ████████████ R1,314.00 + 💰R34 (bonus starts!)
Month 3:  ███████████ R1,214.00 + 💰R54 (bigger bonus!)
```

---

## 🆚 COMPARISON: 1 Month vs 3 Months

| Scenario | Total Paid | Bonuses | Net Cost | Monthly Avg |
|----------|------------|---------|----------|-------------|
| **1 Month** | R3,787.58 | R0 | **R3,787.58** | R3,787.58 |
| **3 Months** | R4,195.58 | R88.00 | **R4,107.58** | R1,365.19 |

**3-month loan advantages:**
- ✅ Lower monthly payments (R1,214-R1,667 vs R3,787)
- ✅ Bonuses earned (R88 vs R0)
- ✅ Admin fees spread out
- ✅ Savings grow during term → better rates

**3-month costs slightly more** (R320 more) because:
- More total interest (charged over 3 months vs 1)
- But you get R88 back as bonuses
- And much more manageable monthly payments!

---

## 🎯 MEMBER EXPERIENCE

### Month 1:
- "This is tough, paying R1,667 on a R3,000 loan"
- High tiered rate (loan 2× savings)
- No bonus yet

### Month 2: 
- "Oh! Payment dropped to R1,314!"
- Savings caught up to loan balance
- **First bonus: R34** 🎉

### Month 3:
- "Even better! R1,214 and bigger bonus!"
- Savings now exceed loan
- **Bonus: R54** (60% more than month 2!) 🎊

---

## ✨ CONCLUSION

For a **R3,000 loan over 3 months with R1,500 initial + R500 monthly:**

**✅ Total paid: R4,195.58**  
**💰 Bonuses earned: R88.00**  
**📉 Payments decrease: R1,667 → R1,314 → R1,214**  
**🎁 System rewards consistent contribution!**

The longer term allows savings to catch up, triggering the 10% minimum and bonus system. The member benefits from:
1. Spreading payments over time
2. Growing savings → lower tiered rates
3. Earning bonuses when tiered < 10%
4. Reduced admin fees in later months

**The tiered system incentivizes longer terms and consistent saving!** 🌟
