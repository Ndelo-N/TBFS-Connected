# Phase 6: Clients Module - Testing Guide

**Phase:** 6 - Clients  
**File:** `clients.html`  
**Status:** Ready for Testing

---

## 🧪 How to Test

1. **Open the test dashboard:** `test-dashboard.html`
2. Click **"Test Now"** next to **Clients** (Phase 6 ✓)
3. Or open **Clients** from the app navigation (any page → 👥 Clients)

---

## ✅ Checklist

### Stats & Display
- [ ] **Client Overview** shows: Total Clients, Active, Blacklisted, Defaulted
- [ ] With no data, all counts are 0
- [ ] After adding a client or accepting a loan (Calculator), counts update

### Add Client
- [ ] **Add New Client** form: First Name, Last Name, Account Number
- [ ] Submit adds client; stats and table update
- [ ] Duplicate account number shows alert and does not add
- [ ] Form resets after successful add

### Table & Actions
- [ ] **Client Database** table shows: Account #, Name, Total Loans, Total Repayment, Status, Actions
- [ ] **Filter by Status:** All, Active Only, Defaulted, Blacklisted
- [ ] **Sort by:** Name (A–Z), Account Number, Total Loans (high first)
- [ ] **Activate** (only if status ≠ active): client and UI update
- [ ] **Mark Default:** confirm dialog; client and their **active loans** set to defaulted; deployed capital decreases
- [ ] **Blacklist:** confirm dialog; client and their **active loans** set to blacklisted; deployed capital decreases

### Integration
- [ ] **New Loan** button goes to `calculator.html`
- [ ] **Export to Excel** downloads a file with client list
- [ ] **Navigation:** header shows current page “Clients”; all other module links work
- [ ] **Cross-tab:** change data in another tab (e.g. accept loan in Calculator); Clients tab reflects changes after refresh or when switching back (AppStateManager.onUpdate)

### Data Consistency
- [ ] Add client on Clients page → open Calculator → accept loan for same account number → existing client is used (no duplicate)
- [ ] Accept loan on Calculator (new client) → open Clients → new client appears in list
- [ ] Mark client defaulted on Clients → open Active Loans → their loans show as defaulted

---

## 🐛 If Something Fails

- **Stats or table empty:** Ensure `shared/app-state.js` is loaded and `AppStateManager.load()` returns `clients` array.
- **Navigation broken:** Ensure `shared/navigation.js` is loaded and `Navigation.init('clients')` runs on page load.
- **Status change doesn’t update loans:** Check that `updateClientStatus` updates `AppState.loans` for that client and calls `AppStateManager.recalculateDeployedCapital(AppState)` before save.

---

## 📁 Files Touched in Phase 6

- `clients.html` (new)
- `test-dashboard.html` (Phase 6 link + progress 60%)
- `sw.js` (cache v37, add `clients.html`)
- `MODULARIZATION-PROGRESS.md` (Phase 6 complete, next Phase 7)
- `shared/navigation.js` (already had `clients.html` in pages; no change needed)

---

**Once testing passes, Phase 6 is complete. Next: Phase 7 (Settings).**
