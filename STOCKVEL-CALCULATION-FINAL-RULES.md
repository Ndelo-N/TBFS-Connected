# Stockvel Loan Calculation - Final Correct Rules

## 🎯 **Core Principles**

### **1. Admin Fee Formula (ALWAYS):**
```
Admin Fee = 60 × (1 - Tiered Effective Rate)
```
- Based on TIERED interest rate (before 10% minimum applied)
- NOT based on final effective rate after 10% minimum

### **2. Bonus Eligibility:**
- **Bonus applies ONLY when:** Loan Amount ≤ Total Contributions
- **NO bonus when:** Loan Amount > Total Contributions
- Bonus = 10% minimum payment - (tiered interest + admin fee + initiation fee)

### **3. Total Cost:**
```
Total Cost = Principal + Total Interest Paid
```
- Where Total Interest = what member actually pays (10% minimum when it applies)
- Admin fees and initiation shown for information but included in calculations
- NOT added separately to total cost

---

## 📊 **Example: R2,000 Loan with R9,000 Contributions**

### **Given:**
- Principal: R2,000
- Contributions: R9,000
- Term: 1 month
- Loan < Contributions ✓ → Bonus eligible

### **Step 1: Tier Calculation**
```
R2,000 / R9,000 = 22.2% → Tier 1 (3%)
Tiered Interest: R2,000 × 3% = R60
```

### **Step 2: Admin Fee**
```
Tiered Effective Rate: R60 / R2,000 = 3%
Admin Fee = 60 × (1 - 0.03) = 60 × 0.97 = R58.20
```

### **Step 3: Initiation Fee**
```
Loan ≤ Contributions → Initiation WAIVED
Initiation Fee: R0
```

### **Step 4: Apply 10% Minimum**
```
Tiered Interest: R60 (3%)
10% Minimum: R2,000 × 10% = R200
Use: R200 ✓ (higher)
```

### **Step 5: Bonus Calculation**
```
Loan ≤ Contributions → Bonus eligible ✓

Member Pays: R200 (10% minimum)
Actual Fees: R60 + R58.20 + R0 = R118.20

Bonus: R200 - R118.20 = R81.80
```

### **Step 6: Total Cost**
```
Total Cost = Principal + What Member Pays
Total Cost = R2,000 + R200 (10% minimum payment) = R2,200 ✓

Note: Interest DISPLAYED = R60 (tiered)
      Member PAYS = R200 (10% minimum)
```

---

## 📋 **Breakdown Display:**

| Component | Amount | Notes |
|-----------|--------|-------|
| **Principal** | R2,000 | |
| **Interest** | R200 | 10% minimum applied |
| **Admin Fee** | R58.20 | Shown for info (included in calculations) |
| **Initiation** | R0 | Waived (loan ≤ contributions) |
| **Bonus** | R81.80 | Member benefit |
| **Total Payment** | **R2,200** | Principal + Interest |

---

## 🚫 **When NO Bonus Applies**

### **Example: R10,000 Loan with R9,000 Contributions**

```
Loan > Contributions → NO BONUS

Even if tiered rate < 10%:
- Member still pays 10% minimum
- NO bonus credited
- Initiation fee applies: (R10,000 - R9,000) × 12% = R120
```

---

## ✅ **Implementation Checklist**

- [x] Admin fee = 60 × (1 - tiered effective rate)
- [x] Bonus ONLY when loan ≤ contributions
- [x] Bonus = 10% min - (tiered interest + admin + initiation)
- [x] Total cost = principal + actual interest paid
- [x] Initiation waived when loan ≤ contributions
- [x] 10% minimum check applied correctly
- [x] Top-up recalculation uses same rules

---

## 🔄 **Hard Refresh Required**

After code updates, always do:
- **Windows/Linux:** Ctrl + Shift + R
- **Mac:** Cmd + Shift + R
- **Or:** DevTools → Right-click refresh → "Empty Cache and Hard Reload"

---

## ✨ **Expected Test Results**

### **R2,000 loan, R9,000 contributions, 1 month:**
```
✓ Total Cost: R2,200
✓ Interest: R200
✓ Admin Fee: R58.20 (calculated, shown for info)
✓ Initiation: R0
✓ Bonus: R81.80
```
