# 🧪 Phase 2 Testing Guide: Active Loans Module

**Module:** `active-loans.html`  
**Status:** ✅ Extracted and Ready for Testing  
**Dependencies:** ✅ All shared modules in `/shared` folder

---

## 📊 **What Changed**

### **Before (SPA):**
```
index.html (353KB, 7,201 lines)
  ├── Dashboard tab
  ├── Calculator tab
  ├── Clients tab
  ├── Stockvel tab
  ├── Active Loans tab ← WAS HERE
  ├── Reports tab
  ├── Income Table tab
  └── Settings tab
```

### **After (Multi-Page):**
```
active-loans.html (26KB, 650 lines) ← NOW STANDALONE
  ├── Imports: app-state.js
  ├── Imports: calculations.js
  ├── Imports: navigation.js
  ├── Imports: styles.css
  └── Works independently!
```

**File Size Reduction:** 93% smaller! ⚡

---

## 🎯 **Testing Checklist**

### **Step 1: Open the Page**

1. **Open in browser:**
   ```
   file:///workspace/active-loans.html
   ```
   OR if using local server:
   ```
   http://localhost:8000/active-loans.html
   ```

2. **Expected Result:**
   - ✅ Page loads quickly (< 1 second)
   - ✅ Navigation bar appears at top
   - ✅ "Active Loans Management" heading visible
   - ✅ Stats summary card shows (Portfolio Overview)
   - ✅ Filter section appears (Status filter, Sort by)
   - ✅ Loans list displays (or "No loans found" if empty)

---

### **Step 2: Check Navigation**

1. **Click on navigation links:**
   - Click "📊 Dashboard" → Should go to `index.html`
   - Click "💳 Calculator" → Should go to `calculator.html` (will create next)
   - Click "💰 Active Loans" → Should stay here (active state)
   - Click other links → Will go to respective pages

2. **Test Keyboard Navigation:**
   - Press **Arrow Left** → Should try to go to previous page
   - Press **Arrow Right** → Should try to go to next page

3. **Test Mobile Menu (resize browser to < 768px):**
   - ✅ Hamburger menu appears
   - ✅ Clicking hamburger opens menu
   - ✅ Navigation links stack vertically

4. **Expected Result:**
   - ✅ All navigation works
   - ✅ Current page highlighted
   - ✅ Logo appears (or fallback text if image missing)
   - ✅ Mobile menu responsive

---

### **Step 3: Check Data Loading**

1. **Open browser console (F12):**
   - Look for message: `✅ Active Loans page initialized`
   - Look for message: `✅ State loaded successfully`
   - Check for any error messages (red text)

2. **Check stats display:**
   - Active Loans count
   - Total Outstanding amount
   - Overdue Loans count
   - This Month Revenue

3. **Expected Result:**
   - ✅ No errors in console
   - ✅ Stats show correct values from localStorage
   - ✅ If no data, shows zeros (R0.00, 0 loans)

---

### **Step 4: Test Loan Display**

#### **If You Have Existing Loans:**

1. **Check loan cards display:**
   - Each loan shows in a white card
   - Loan number and client name as heading
   - All info rows visible (Date, Due Date, Principal, etc.)
   - Status badge colored correctly:
     - Green = Active
     - Blue = Completed
     - Red = Defaulted
     - Black = Blacklisted

2. **Check for overdue loans:**
   - Overdue loans show "X days overdue" in red
   - Due date highlighted

3. **Expected Result:**
   - ✅ All loans display correctly
   - ✅ Information matches old system
   - ✅ Action buttons appear

#### **If No Loans Yet:**

1. **Check empty state:**
   - Shows 📋 icon
   - "No loans found" message
   - "Create New Loan" button

2. **Expected Result:**
   - ✅ Empty state looks good
   - ✅ Button links to calculator (will create next)

---

### **Step 5: Test Filtering**

1. **Test Status Filter:**
   - Select "All Loans" → Shows all
   - Select "Active Only" → Shows only active
   - Select "Completed" → Shows only completed
   - Select "Defaulted" → Shows only defaulted
   - Select "Overdue" → Shows only overdue active loans

2. **Test Sorting:**
   - Select "Date (Newest First)" → Sorts by creation date
   - Select "Loan Amount" → Sorts by principal amount
   - Select "Outstanding Balance" → Sorts by remaining principal
   - Select "Due Date" → Sorts by next payment due

3. **Expected Result:**
   - ✅ Filtering works instantly
   - ✅ Sorting updates immediately
   - ✅ No page refresh needed

---

### **Step 6: Test Payment Processing**

#### **Make a Test Payment:**

1. Click "💰 Make Payment" on an active loan
2. Popup shows:
   - Expected Monthly Payment
   - Remaining Principal
   - Current Balance
3. Enter payment amount (e.g., monthly payment amount)
4. Click OK

#### **Expected Result:**
- ✅ Payment processes successfully
- ✅ Success message shows breakdown:
  - Principal paid
  - Interest paid
  - Admin fee paid
  - Initiation fee paid
  - Remaining principal
- ✅ Loan card updates with new balance
- ✅ Stats update (Total Outstanding decreases)
- ✅ Payments made counter increases (e.g., 1/6 → 2/6)

#### **Verify in Original System:**
1. Open `index.html` in another tab
2. Go to Active Loans tab
3. Check if payment appears there too
4. **Expected:** ✅ Same data shows (localStorage sync works!)

---

### **Step 7: Test Loan Actions**

1. **View Details:**
   - Click "👁️ View Details" button
   - Popup shows loan summary
   - Expected: ✅ All info accurate

2. **Mark as Defaulted:**
   - Click "⚠️ Mark Default" button
   - Confirmation dialog appears
   - Click OK
   - Expected: ✅ Loan status changes to "defaulted"
   - Expected: ✅ Loan moves to defaulted filter

3. **Check Completed Loans:**
   - If loan fully paid, shows "✅ Completed" status
   - Shows completion date

---

### **Step 8: Test Cross-Tab Sync**

1. **Open two browser tabs:**
   - Tab 1: `active-loans.html`
   - Tab 2: `index.html` (Active Loans tab)

2. **Make payment in Tab 1:**
   - Process a payment
   - Switch to Tab 2
   - Expected: ✅ Data updates automatically (may need refresh)

3. **Make payment in Tab 2:**
   - Process a payment in old system
   - Switch to Tab 1
   - Refresh page
   - Expected: ✅ Shows updated data

---

### **Step 9: Test Mobile Responsiveness**

1. **Resize browser to mobile width (< 768px):**
   - Navigation becomes hamburger menu
   - Loan cards stack nicely
   - Stats grid becomes single column
   - Action buttons wrap properly

2. **Test on actual mobile device (if available):**
   - Open page on phone
   - Check touch interactions
   - Verify readability

3. **Expected Result:**
   - ✅ Everything readable
   - ✅ No horizontal scrolling
   - ✅ Buttons easy to tap

---

### **Step 10: Performance Testing**

1. **Test load speed:**
   - Clear browser cache
   - Open `active-loans.html`
   - Note load time
   - Expected: ✅ Loads in < 1 second (vs 2+ seconds for old system)

2. **Check memory usage:**
   - Open browser Task Manager
   - Check memory for this page
   - Expected: ✅ ~15MB (vs ~50MB for old SPA)

3. **Test with many loans:**
   - If you have 50+ loans, check if page is still responsive
   - Expected: ✅ Scrolling smooth, no lag

---

## 🐛 **Common Issues & Fixes**

### **Issue: "AppStateManager is not defined"**
**Cause:** Shared modules not loaded  
**Fix:** Check that all `/shared/*.js` files exist and are accessible

### **Issue: "No loans found" when you have loans**
**Cause:** localStorage key mismatch  
**Fix:** Check browser console, ensure localStorage key is 'tbfsAppState'

### **Issue: Navigation links don't work**
**Cause:** Files not in same directory  
**Fix:** Ensure all HTML files are in `/workspace` folder

### **Issue: Styles not loading**
**Cause:** CSS file path incorrect  
**Fix:** Check that `/workspace/shared/styles.css` exists

### **Issue: Payments not saving**
**Cause:** localStorage not permitted or full  
**Fix:** Check browser settings, clear old data if needed

---

## ✅ **Success Criteria**

Your Phase 2 is successful if:

- ✅ Page loads quickly (< 1 second)
- ✅ Navigation works (all links functional)
- ✅ Data loads from localStorage correctly
- ✅ Loan display accurate (matches old system)
- ✅ Filtering and sorting work
- ✅ Payment processing works
- ✅ Stats update correctly
- ✅ Mobile responsive
- ✅ No console errors
- ✅ Cross-tab sync works (with refresh)

---

## 📝 **Test Results Template**

```
PHASE 2 TEST RESULTS
Date: _____________
Tester: Lindelo

[ ] Step 1: Page loads correctly
[ ] Step 2: Navigation works
[ ] Step 3: Data loads correctly
[ ] Step 4: Loans display correctly
[ ] Step 5: Filtering works
[ ] Step 6: Payment processing works
[ ] Step 7: Loan actions work
[ ] Step 8: Cross-tab sync works
[ ] Step 9: Mobile responsive
[ ] Step 10: Performance good

Issues Found:
1. ___________________________
2. ___________________________
3. ___________________________

Overall: [ ] PASS  [ ] FAIL  [ ] NEEDS FIXES
```

---

## 🎯 **Next Steps After Testing**

### **If Tests PASS:**
✅ Phase 2 is complete!  
➡️ Ready to start Phase 3: Extract Stockvel module

### **If Tests FAIL:**
⚠️ Document issues found  
➡️ I'll fix them before continuing  
➡️ Re-test until passing

---

## 💡 **Tips for Testing**

1. **Use browser DevTools (F12):**
   - Console for errors
   - Network tab for load times
   - Application tab to view localStorage

2. **Test with real data:**
   - Use actual loans from your system
   - Test edge cases (overdue, completed, etc.)

3. **Compare with old system:**
   - Open both versions side-by-side
   - Verify data matches exactly

4. **Test incrementally:**
   - Don't test everything at once
   - Go through checklist step-by-step

5. **Document problems:**
   - Screenshot errors
   - Note exact steps to reproduce
   - Check browser console for clues

---

## 🆘 **Need Help?**

If you encounter issues:

1. **Check browser console** (F12) - most errors show here
2. **Verify file structure** - all files in correct locations?
3. **Test in different browser** - Chrome vs Firefox vs Edge
4. **Clear browser cache** - old files might be cached
5. **Let me know!** - I'll help debug and fix

---

**Ready to test, Lindelo?** 🚀

Once you confirm Phase 2 works, we'll move to Phase 3: Extracting the Stockvel module (largest and most complex).
