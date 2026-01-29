# 📋 Phase 3 Testing Guide: Stockvel Module

## 🎯 What We're Testing

The **Stockvel Member Management** module has been extracted from the monolithic `index.html` into a standalone page: `stockvel.html`

This is our **largest and most complex module** with independent member management, contribution tracking, and bonus systems.

## ✅ Testing Checklist

### 1️⃣ Page Load & Basic Functionality

- [ ] **Open** `stockvel.html` directly or via test dashboard
- [ ] **Verify** page loads without errors (check browser console - F12)
- [ ] **Check** the navigation header appears at the top
- [ ] **Confirm** all 4 summary stat cards display:
  - Total Members
  - Total Contributions
  - Total Bonuses Paid
  - Due for Renewal

### 2️⃣ Navigation Testing

- [ ] **Click** on different navigation links (Dashboard, Active Loans, etc.)
- [ ] **Verify** each link takes you to the correct page
- [ ] **Test** keyboard shortcuts:
  - Press `←` (Left Arrow) - should navigate to previous page
  - Press `→` (Right Arrow) - should navigate to next page
- [ ] **Test** swipe gestures on mobile/tablet:
  - Swipe right to go to previous page
  - Swipe left to go to next page
- [ ] **Check** the "Stockvel" link is highlighted in the navigation

### 3️⃣ Register New Member

- [ ] **Fill out** the registration form:
  - Full Name: "Test Member"
  - Phone: "0821234567"
  - Email: "test@example.com" (optional)
  - Start Date: Today's date
  - Monthly Contribution: R500
  - Initial Contribution: R0 (or any amount)
- [ ] **Click** "Register Member"
- [ ] **Verify** success alert shows with member number and details
- [ ] **Check** the new member appears in the Member Registry table
- [ ] **Test** registering another member with an initial contribution (e.g., R1000)
- [ ] **Verify** the contribution shows in the history

### 4️⃣ Member Registry Display

- [ ] **Check** the registry table shows all members
- [ ] **Verify** each member row displays:
  - Member number
  - Name
  - Phone
  - Total Contributions (green text)
  - Accumulated Bonus (orange text)
  - Monthly Amount
  - Status badge (Active/Soon/Urgent/Expired)
  - Expiry date
  - Action buttons (View, Renew)
- [ ] **Click** "Refresh" button - table should update
- [ ] **Click** "View" button on a member - should show details in alert
- [ ] **Test** the status badges by checking different dates

### 5️⃣ Record Receipts/Contributions

- [ ] **Select** a member from the dropdown
- [ ] **Verify** member info panel appears showing:
  - Current Contributions
  - Accumulated Bonus
  - Membership Status
  - Expiry Date
- [ ] **Test** each receipt type:

#### Monthly Contribution:
- [ ] Type: Monthly Contribution
- [ ] Amount: R500
- [ ] Date: Today
- [ ] Notes: "Monthly payment"
- [ ] **Submit** and verify success
- [ ] **Check** member's total contributions increased
- [ ] **Verify** appears in contribution history

#### Loan Payment (with bonus):
- [ ] Type: Loan Payment (with bonus)
- [ ] Amount: R1000
- [ ] **Submit** and verify bonus is calculated
- [ ] **Check** member's accumulated bonus increased

#### Adjustment:
- [ ] Type: Adjustment
- [ ] Amount: R100 (or negative for deduction)
- [ ] Notes: "Test adjustment"
- [ ] **Submit** and verify contribution total updated

### 6️⃣ Contribution History

- [ ] **Verify** all recorded receipts appear in the history table
- [ ] **Check** each row shows:
  - Date
  - Member name and number
  - Type badge (color-coded)
  - Amount
  - New Total
  - Bonus Added
  - Notes
- [ ] **Test** filtering by member:
  - Select a specific member
  - Verify only their receipts show
  - Select "All Members" to see everything
- [ ] **Click** "Export History" - should download CSV file

### 7️⃣ Membership Renewals

- [ ] **Check** the Renewal Alerts section
- [ ] **Verify** it shows members expiring in next 30 days (if any)
- [ ] **Test** renewing a membership:
  - Click "Renew" button on a member (in registry or alert)
  - Confirm the renewal
  - Verify expiry date extended by 12 months
  - Check alert disappears if member was expiring

### 8️⃣ Bonus Payout Report

- [ ] **Click** "Generate Report"
- [ ] **Verify** table shows all members with:
  - Total Bonuses Earned
  - Bonuses Paid Out
  - Pending Bonuses
  - Last Bonus Date
  - Payout button (if pending bonus > 0)
- [ ] **Test** bonus payout:
  - Click "Payout" button for a member with pending bonus
  - Confirm the payout
  - Verify accumulated bonus goes to 0
  - Check receipt appears in contribution history
- [ ] **Click** "Export to Excel" - should show coming soon alert

### 9️⃣ Export Functions

- [ ] **Click** "Export Registry" button
- [ ] **Verify** CSV file downloads with all member data
- [ ] **Open** the CSV - check data is correct and formatted properly
- [ ] **Click** "Export History" button
- [ ] **Verify** CSV downloads with all receipt data
- [ ] **Check** both files have proper headers and content

### 🔟 Data Persistence & Cross-Tab Sync

- [ ] **Register** a new member in `stockvel.html`
- [ ] **Open** `stockvel.html` in a NEW tab (keep first tab open)
- [ ] **Verify** the new member appears automatically in the second tab
- [ ] **Record** a receipt in the second tab
- [ ] **Switch** back to the first tab
- [ ] **Verify** the receipt appears there too (may need to wait a second)
- [ ] **Close** all tabs and reopen `stockvel.html`
- [ ] **Verify** all data persists (members, contributions, etc.)

### 1️⃣1️⃣ Mobile Responsiveness

- [ ] **Resize** browser to mobile width (or use DevTools Device Mode - F12)
- [ ] **Verify** layout adapts properly:
  - Navigation collapses to hamburger menu
  - Tables become scrollable
  - Forms stack vertically
  - Buttons remain clickable
- [ ] **Test** all key functions on mobile view:
  - Register member
  - Record receipt
  - View member details

### 1️⃣2️⃣ Error Handling & Edge Cases

- [ ] **Try** submitting empty registration form - should show error
- [ ] **Try** recording receipt without selecting member - should show error
- [ ] **Try** paying out more bonus than accumulated - should show error
- [ ] **Test** with extremely large numbers (e.g., R1,000,000)
- [ ] **Verify** currency formatting works correctly (R 1,000,000.00)
- [ ] **Test** with negative amounts in adjustments

### 1️⃣3️⃣ Performance Check

- [ ] **Check** browser console for any errors (F12 → Console tab)
- [ ] **Verify** page loads in under 2 seconds
- [ ] **Check** no layout shifts or flickering during load
- [ ] **Test** with 10+ members - should still be fast
- [ ] **Record** multiple receipts quickly - should handle smoothly

### 1️⃣4️⃣ Integration with Active Loans

- [ ] **Navigate** to Active Loans page
- [ ] **Note** a loan tied to a stockvel member (if any)
- [ ] **Return** to Stockvel page
- [ ] **Record** a "Loan Payment" receipt for that member
- [ ] **Verify** bonus is calculated correctly
- [ ] **Navigate** back to Active Loans
- [ ] **Verify** data is consistent

## 🐛 Known Issues to Look For

Watch out for these potential issues:

1. **Member Number Generation**: Should be sequential (1001, 1002, etc.)
2. **Date Formatting**: Should display in local format (MM/DD/YYYY or DD/MM/YYYY)
3. **Currency Display**: Should always show "R" prefix and 2 decimals
4. **Membership End Date**: Should be exactly 12 months from start date
5. **Cross-Tab Sync**: May have 1-2 second delay - this is normal
6. **Receipt Type Badges**: Should have correct colors
7. **Export Files**: Should have unique names with today's date

## 📊 Success Criteria

Phase 3 passes testing if:

- ✅ All core features work (register, record, view, export)
- ✅ No console errors appear during normal use
- ✅ Data persists after page refresh
- ✅ Cross-tab synchronization works
- ✅ Mobile view is functional
- ✅ Performance is acceptable (< 2 second load)
- ✅ Export functions generate valid CSV files

## 🚨 If You Find Issues

1. **Note** the exact steps to reproduce
2. **Check** browser console for error messages (F12)
3. **Screenshot** the issue if visual
4. **Report** the issue with:
   - What you were doing
   - What you expected to happen
   - What actually happened
   - Any error messages

## 🎯 Comparison Testing

To ensure we haven't lost functionality:

1. **Open** the old `index.html` (the monolithic version)
2. **Navigate** to the Stockvel tab (if still there)
3. **Compare** features between old and new:
   - Are all features present in the new version?
   - Does the new version work the same way?
   - Is the new version faster?

## ✨ Bonus Features to Explore

While testing, notice these improvements:

1. **Faster Loading**: Stockvel page is now independent
2. **Better Navigation**: Direct URL access (stockvel.html)
3. **Keyboard Shortcuts**: Arrow keys for navigation
4. **Swipe Gestures**: Mobile-friendly navigation
5. **Consistent Styling**: Uses shared CSS modules
6. **Better UX**: Cleaner, more focused interface

## 📝 Testing Notes

Use this space to record your findings:

### ✅ What Works Well:
- 

### ⚠️ Issues Found:
- 

### 💡 Suggestions:
- 

## 🎉 Next Steps

After completing Phase 3 testing:

1. **Report** any critical issues for fixing
2. **Confirm** readiness to proceed to Phase 4
3. **Phase 4** will extract: **Reports Module** (analytics & charts)

---

**Happy Testing, Lindelo!** 🚀

Take your time, test thoroughly, and let me know how it goes!
