# Standard Loan Calculation Breakdown
## R10,000 for 10 Months

**Generated:** ${new Date().toISOString()}  
**Calculation Method:** 30% Income Table with Long-Term Interest Cap

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
**Benefit:** Client saves 50% on interest! 🎉

---

## 📊 Step 2: Interest Calculation (Declining Balance - 5 Months)

### **Constants:**
- Principal: **R10,000**
- Base Principal Payment: R10,000 ÷ 10 = **R1,000 per month**
- Admin Fee: **R60 per month** (fixed)
- Initiation Fee: R10,000 × 12% ÷ 10 = **R120 per month**

### **Month-by-Month Interest Calculation:**

#### **Month 1:**
```
Outstanding Balance: R10,000
TBFS Income (30%):   R10,000 × 0.30 = R3,000.00
Less Admin Fee:                      -  R60.00
Less Initiation Fee:                 - R120.00
─────────────────────────────────────────────
Interest for Month 1:                = R2,820.00

Balance After Principal Payment: R10,000 - R1,000 = R9,000
```

#### **Month 2:**
```
Outstanding Balance: R9,000
TBFS Income (30%):   R9,000 × 0.30 = R2,700.00
Less Admin Fee:                      -  R60.00
Less Initiation Fee:                 - R120.00
─────────────────────────────────────────────
Interest for Month 2:                = R2,520.00

Balance After Principal Payment: R9,000 - R1,000 = R8,000
```

#### **Month 3:**
```
Outstanding Balance: R8,000
TBFS Income (30%):   R8,000 × 0.30 = R2,400.00
Less Admin Fee:                      -  R60.00
Less Initiation Fee:                 - R120.00
─────────────────────────────────────────────
Interest for Month 3:                = R2,220.00

Balance After Principal Payment: R8,000 - R1,000 = R7,000
```

#### **Month 4:**
```
Outstanding Balance: R7,000
TBFS Income (30%):   R7,000 × 0.30 = R2,100.00
Less Admin Fee:                      -  R60.00
Less Initiation Fee:                 - R120.00
─────────────────────────────────────────────
Interest for Month 4:                = R1,920.00

Balance After Principal Payment: R7,000 - R1,000 = R6,000
```

#### **Month 5:**
```
Outstanding Balance: R6,000
TBFS Income (30%):   R6,000 × 0.30 = R1,800.00
Less Admin Fee:                      -  R60.00
Less Initiation Fee:                 - R120.00
─────────────────────────────────────────────
Interest for Month 5:                = R1,620.00

Balance After Principal Payment: R6,000 - R1,000 = R5,000
```

### **Total Interest (5 Months):**
```
Month 1: R2,820.00
Month 2: R2,520.00
Month 3: R2,220.00
Month 4: R1,920.00
Month 5: R1,620.00
─────────────────
TOTAL:   R11,100.00
```

**Interest calculated for 5 months only (not 10!)** ✅

---

## 📊 Step 3: Equalize Interest Across All Months

### **Why Equalize?**
Instead of charging high interest in early months and zero in later months, we spread it evenly for **predictable payments**.

### **Calculation:**
```
Total Interest:        R11,100.00
Loan Term:                10 months
Equalized Monthly:     R11,100 ÷ 10 = R1,110.00 per month
```

**Result:** Client pays **R1,110 interest per month** for all 10 months.

---

## 📊 Step 4: Calculate Total Cost

### **Summary of All Costs:**

```
┌─────────────────────────────┬──────────────┐
│ Component                   │ Amount       │
├─────────────────────────────┼──────────────┤
│ Principal                   │  R10,000.00  │
│ Total Interest (capped)     │  R11,100.00  │
│ Total Initiation Fee        │   R1,200.00  │
│ Total Admin Fees            │     R600.00  │
├─────────────────────────────┼──────────────┤
│ TOTAL COST                  │  R22,900.00  │
└─────────────────────────────┴──────────────┘

Equal Monthly Payment = R22,900 ÷ 10 = R2,290.00
```

### **Breakdown:**
- **Principal:** R10,000 (what client borrowed)
- **Interest:** R11,100 (calculated for 5 months only!)
- **Initiation Fee:** R10,000 × 12% = R1,200
- **Admin Fees:** R60 × 10 months = R600

**Total Amount to Repay:** **R22,900**  
**Monthly Payment:** **R2,290**

---

## 📊 Step 5: Monthly Payment Breakdown

### **Every Month (1-10) - Equal Installments:**

```
┌───────┬───────────┬──────────┬──────────┬──────────┬──────────────┬─────────────┐
│ Month │ Principal │ Interest │ Admin    │ Init Fee │ Total Payment│ Balance     │
│       │ Payment   │ Payment  │ Fee      │          │              │ Remaining   │
├───────┼───────────┼──────────┼──────────┼──────────┼──────────────┼─────────────┤
│   1   │ R1,000.00 │ R1,110.00│  R60.00  │ R120.00  │  R2,290.00   │ R9,000.00   │
│   2   │ R1,000.00 │ R1,110.00│  R60.00  │ R120.00  │  R2,290.00   │ R8,000.00   │
│   3   │ R1,000.00 │ R1,110.00│  R60.00  │ R120.00  │  R2,290.00   │ R7,000.00   │
│   4   │ R1,000.00 │ R1,110.00│  R60.00  │ R120.00  │  R2,290.00   │ R6,000.00   │
│   5   │ R1,000.00 │ R1,110.00│  R60.00  │ R120.00  │  R2,290.00   │ R5,000.00   │
│   6   │ R1,000.00 │ R1,110.00│  R60.00  │ R120.00  │  R2,290.00   │ R4,000.00   │
│   7   │ R1,000.00 │ R1,110.00│  R60.00  │ R120.00  │  R2,290.00   │ R3,000.00   │
│   8   │ R1,000.00 │ R1,110.00│  R60.00  │ R120.00  │  R2,290.00   │ R2,000.00   │
│   9   │ R1,000.00 │ R1,110.00│  R60.00  │ R120.00  │  R2,290.00   │ R1,000.00   │
│  10   │ R1,000.00 │ R1,110.00│  R60.00  │ R120.00  │  R2,290.00   │     R0.00   │
├───────┼───────────┼──────────┼──────────┼──────────┼──────────────┼─────────────┤
│ TOTAL │R10,000.00 │R11,100.00│ R600.00  │R1,200.00 │ R22,900.00   │             │
└───────┴───────────┴──────────┴──────────┴──────────┴──────────────┴─────────────┘
```

**Key Points:**
- ✅ **Equal payments** every month: R2,290
- ✅ **Principal reduces** by R1,000 each month
- ✅ **Interest is equalized** at R1,110 per month
- ✅ **Predictable** - client knows exact amount

---

## 💡 Interest Cap Comparison

### **WITHOUT Interest Cap (Old Method):**

If we charged interest for all 10 months:

```
Month 1:  R2,820 interest
Month 2:  R2,520 interest
Month 3:  R2,220 interest
Month 4:  R1,920 interest
Month 5:  R1,620 interest
Month 6:  R1,320 interest
Month 7:  R1,020 interest
Month 8:    R720 interest
Month 9:    R420 interest
Month 10:   R120 interest
─────────────────────────
TOTAL:   R14,700 interest
```

### **WITH Interest Cap (New Method):**

```
Only calculate interest for 5 months:
Month 1-5 interest: R11,100

Spread across 10 months: R1,110/month
─────────────────────────
TOTAL:   R11,100 interest
```

### **Client Savings:**

```
Old Method:    R14,700 interest
New Method:    R11,100 interest
─────────────────────────
SAVINGS:       R3,600 (24.5% less!)
```

**The interest cap saves the client R3,600!** 🎉

---

## 📊 Loan Object Fields

When this loan is created in the system:

```javascript
{
    loan_id: 1,
    client_name: "Client Name",
    account_number: "ACC001",
    
    // Principal tracking
    principal_amount: 10000,
    original_principal: 10000,
    remaining_principal: 10000,
    
    // Term & payments
    term_months: 10,
    monthly_payment: 2290,
    payments_made: 0,
    
    // Financial totals
    total_cost: 22900,
    current_balance: 22900,
    total_interest: 11100,
    
    // Interest cap fields
    interest_calculation_months: 5,           // ✅ Interest for 5 months only
    max_interest_allowed: 11100,              // ✅ Interest cap
    expected_monthly_interest: 1110,          // ✅ Equalized interest
    total_interest_charged: 0,                // ✅ Starts at 0
    interest_paid: 0,                         // ✅ Starts at 0
    
    // Fee tracking
    total_initiation_fee: 1200,
    initiation_fee_paid: 0,
    
    // Status
    status: 'active',
    created_at: "2025-12-22T12:00:00.000Z"
}
```

---

## 🧪 Test It Yourself

### **In Calculator:**
1. Open `/workspace/calculator.html`
2. Enter:
   - Loan Amount: **R10,000**
   - Term: **10 months**
   - Client details
3. Click "Calculate"
4. Check results:
   - Monthly Payment: **R2,290**
   - Total Cost: **R22,900**
   - Total Interest: **R11,100**

### **In Console:**
```javascript
const result = Calculations.calculateStandardLoan(10000, 10);
console.log(result);

// Expected:
// {
//     totalInterest: 11100,
//     totalInitiationFee: 1200,
//     totalAdminFees: 600,
//     totalCost: 22900,
//     monthlyPayment: 2290,
//     interestMonths: 5,
//     maxInterestAllowed: 11100,
//     expectedMonthlyInterest: 1110,
//     breakdown: [... 10 months ...]
// }
```

---

## 📈 Key Metrics

```
┌──────────────────────────────┬──────────────┐
│ Metric                       │ Value        │
├──────────────────────────────┼──────────────┤
│ Principal Amount             │  R10,000.00  │
│ Loan Term                    │   10 months  │
│ Interest Period              │    5 months  │
│ Monthly Payment              │   R2,290.00  │
│ Total Interest               │  R11,100.00  │
│ Total Initiation Fee         │   R1,200.00  │
│ Total Admin Fees             │     R600.00  │
│ Total Amount Repayable       │  R22,900.00  │
├──────────────────────────────┼──────────────┤
│ Effective Interest Rate      │      111%    │
│ APR (Annual)                 │   133.2%     │
│ Client Savings (vs no cap)   │   R3,600.00  │
│ Percentage Saved             │      24.5%   │
└──────────────────────────────┴──────────────┘
```

---

## 🎯 Summary

### **The Math:**
1. **Interest calculated** for 5 months (declining balance) = R11,100
2. **Equalized** across 10 months = R1,110/month
3. **Total cost** = R10,000 + R11,100 + R1,200 + R600 = R22,900
4. **Monthly payment** = R22,900 ÷ 10 = R2,290

### **The Benefits:**
- ✅ **Fair interest** - Only charged for half the term
- ✅ **Predictable** - Same payment every month
- ✅ **Transparent** - All calculations shown
- ✅ **Savings** - R3,600 less than without cap

### **The Result:**
**Client pays R2,290 per month for 10 months = R22,900 total**

---

**Generated by:** TBFS Calculation Engine v2.0  
**Calculation Method:** 30% Income Table with Interest Cap  
**Compliant with:** TBFS Business Rules v1.7.5

---

*Fair lending + business viability = Win-win!* 💼✨
