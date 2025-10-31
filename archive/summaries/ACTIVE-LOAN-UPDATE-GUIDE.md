# Active Loan Update Feature - User Guide

## 🎯 Overview

You can now update active loans in your TBFS system! This feature allows you to:
1. **Add late payment interest** to loans with missed or partial payments
2. **Increase loan amounts** (loan top-ups) for existing active loans

All adjustments are tracked in your transaction history and properly update all loan balances.

---

## 📋 How to Use

### Step 1: Access the Feature

1. Navigate to the **Dashboard** tab
2. Scroll to the **Active Loans** section
3. Find the loan you want to adjust
4. Click the blue **"📝 Adjust Loan"** button

### Step 2: Choose Adjustment Type

You'll see a dialog showing current loan details:
```
📝 Adjust Loan #[ID] - [Client Name]

Current Details:
• Principal Amount: R[amount]
• Remaining Principal: R[amount]
• Current Balance: R[amount]
• Total Interest Charged: R[amount]
• Max Interest Allowed: R[amount]

Select Adjustment Type:
1 - Add Late Payment Interest
2 - Increase Loan Amount (Top-up)
3 - Cancel

Enter choice (1-3):
```

---

## 💰 Option 1: Add Late Payment Interest

### When to Use:
- Client has missed payments
- Client made partial payments
- Need to add penalty interest for late payments

### How It Works:

1. **Select Option 1** when prompted
2. Review the current interest status:
   - Current interest charged
   - Maximum interest allowed (cap)
   - Remaining capacity before hitting cap

3. **Enter the interest amount** you want to add
   - The system will warn you if adding this exceeds the 100% interest cap
   - You can choose to proceed anyway if needed

4. **Enter a reason** (required for tracking):
   - Example: "Late payment penalty - 2 months overdue"
   - Example: "Missed 3 payments"
   - Example: "Partial payment penalty"

5. **Confirmation** - You'll see a success message with:
   - Amount of interest added
   - New total interest charged
   - New loan balance
   - The reason recorded

### What Gets Updated:
- ✅ `total_interest_charged` increases by the amount
- ✅ `current_balance` increases by the amount
- ✅ Transaction logged in history with reason
- ✅ Dashboard statistics refresh automatically

### Example Scenario:
```
Client missed 2 monthly payments of R500 each
- Original balance: R5,000
- You add R200 late interest
- New balance: R5,200
- Reason: "Late payment penalty - 2 months overdue"
```

---

## 📈 Option 2: Increase Loan Amount (Top-up)

### When to Use:
- Client needs additional funds (loan top-up)
- Emergency situation requiring more money
- Business expansion for existing client

### How It Works:

1. **Select Option 2** when prompted
2. Review current loan status
3. **Enter the amount** to add to the principal
   - System checks if you have enough capital
   - Shows "Insufficient Capital" error if not enough funds

4. **Enter a reason** (required for tracking):
   - Example: "Emergency medical top-up"
   - Example: "Additional business capital"
   - Example: "Client requested loan increase"

5. **Review confirmation** showing all changes:
   ```
   Principal: R5,000 → R7,000 (+R2,000)
   Remaining Principal: R5,000 → R7,000
   Balance: R6,500 → R8,500
   Max Interest Cap: R5,000 → R7,000
   
   Capital Impact: R50,000 → R48,000
   Deployed: R30,000 → R32,000
   
   Reason: [Your reason]
   ```

6. **Confirm or cancel** the adjustment

### What Gets Updated:
- ✅ `principal_amount` increases
- ✅ `original_principal` increases (for cap calculations)
- ✅ `remaining_principal` increases
- ✅ `current_balance` increases
- ✅ `max_interest_allowed` increases proportionally
- ✅ `expected_monthly_interest` recalculated
- ✅ `total_initiation_fee` increases by 9% of added amount
- ✅ `total_cost` recalculated
- ✅ Business capital decreases by the amount
- ✅ Deployed capital increases by the amount
- ✅ Transaction logged with full details

### Example Scenario:
```
Client with R5,000 loan needs R2,000 more
- Check available capital: R50,000 available ✓
- Add R2,000 to principal
- New principal: R7,000
- Additional 9% initiation fee: R180
- New total cost recalculated
- Capital deployed: R30,000 → R32,000
- Reason: "Emergency medical top-up"
```

---

## 🔍 Transaction History Tracking

All adjustments are automatically logged in your transaction history with:

### For Late Interest:
- Transaction type: `loan_adjustment`
- Description: "Late interest added to Loan #[ID]: R[amount] - [reason]"
- Details tracked:
  - Loan ID and client name
  - Adjustment type: `late_interest`
  - Amount added
  - Reason provided
  - Previous and new interest amounts
  - Previous and new balance

### For Loan Increase:
- Transaction type: `loan_adjustment`
- Description: "Loan amount increased for Loan #[ID]: R[amount] - [reason]"
- Details tracked:
  - Loan ID and client name
  - Adjustment type: `increase_principal`
  - Amount added
  - Reason provided
  - Previous and new principal
  - Previous and new balance
  - Previous and new max interest
  - Additional initiation fee charged

---

## ⚠️ Important Notes

### Interest Cap Protection:
- The system warns if adding interest exceeds the 100% cap
- You can choose to proceed or cancel
- Cap is based on `max_interest_allowed` (declining balance calculation)

### Capital Requirements:
- Loan increases require sufficient business capital
- System checks before allowing the increase
- Shows clear error if insufficient funds

### Status Restrictions:
- Only **ACTIVE** loans can be adjusted
- Completed, defaulted, or blacklisted loans cannot be adjusted
- System shows clear error if trying to adjust non-active loan

### Calculation Integrity:
- All amounts rounded to 2 decimal places
- Interest cap recalculated when principal increases
- Expected monthly interest adjusted automatically
- Total cost includes: Principal + Max Interest + Initiation Fee

### Data Persistence:
- All changes saved immediately to localStorage
- Transaction history preserves full audit trail
- Dashboard updates automatically
- Can view history in Transaction History tab

---

## 🎨 UI Location

The **"📝 Adjust Loan"** button appears:
- **Color**: Blue (`#3498db`)
- **Position**: Between "Make Payment" and "Mark Paid" buttons
- **Visibility**: Only shown for ACTIVE loans
- **Style**: Small button with padding for compact display

---

## 💡 Best Practices

### When Adding Late Interest:
1. Document the reason clearly
2. Check current interest charged vs. cap
3. Consider client's ability to pay increased balance
4. Review payment history before adding penalties

### When Increasing Loan Amount:
1. Verify client's repayment history
2. Check available business capital
3. Document reason for increase
4. Consider impact on monthly payment expectations
5. Communicate new terms with client

### Record Keeping:
1. Always provide clear, detailed reasons
2. Review transaction history regularly
3. Monitor interest caps across all loans
4. Track adjustments in external records if needed

---

## 🔧 Technical Details

### Functions Added:
1. `adjustActiveLoan(loanId)` - Main entry point
2. `addLateInterest(loan)` - Handles interest additions
3. `increaseLoanAmount(loan)` - Handles principal increases

### Loan Properties Modified:
- `total_interest_charged` - Interest tracking
- `current_balance` - Outstanding balance
- `principal_amount` - Loan principal
- `original_principal` - For cap calculations
- `remaining_principal` - Unpaid principal
- `max_interest_allowed` - Interest cap
- `expected_monthly_interest` - Monthly calculation
- `total_initiation_fee` - Fee tracking
- `total_cost` - Total loan cost

### AppState Properties Modified:
- `capital` - Business funds (decreases on loan increase)
- `deployed` - Deployed capital (increases on loan increase)
- Transaction history with full audit trail

---

## ✅ Testing Recommendations

Test the feature with these scenarios:

1. **Late Interest - Within Cap:**
   - Add small interest amount
   - Verify balance increases correctly
   - Check transaction history

2. **Late Interest - Exceeds Cap:**
   - Try adding interest that exceeds cap
   - Verify warning appears
   - Test both proceeding and canceling

3. **Loan Increase - Sufficient Capital:**
   - Add amount to loan principal
   - Verify all calculations update
   - Check capital and deployed changes

4. **Loan Increase - Insufficient Capital:**
   - Try increasing beyond available capital
   - Verify error message
   - Confirm no changes made

5. **Edge Cases:**
   - Try adjusting completed loan (should fail)
   - Try adjusting defaulted loan (should fail)
   - Cancel adjustments mid-process
   - Test with very large amounts

---

## 📞 Support

If you encounter any issues:
1. Check browser console for errors (F12)
2. Verify loan status is "active"
3. Ensure sufficient capital for loan increases
4. Review transaction history for audit trail
5. Check localStorage data persistence

---

## 🎉 Summary

You now have full control over active loan adjustments! This feature gives you the flexibility to:
- Handle late payments professionally
- Provide top-ups to existing clients
- Maintain accurate financial records
- Track all changes with detailed audit trail

All adjustments are safe, reversible through your backup system, and fully integrated with your existing loan management workflow.

---

**Version:** 1.0  
**Date:** 2025-10-14  
**Feature:** Active Loan Update System  
**Branch:** cursor/update-active-loan-details-99c4
