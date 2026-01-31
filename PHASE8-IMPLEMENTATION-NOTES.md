# Phase 8: Dashboard Refactor - Implementation Notes

**Status:** Starting Implementation  
**Approach:** Create lightweight dashboard preserving essential statistics

---

## Key Decisions

1. **Transaction History:** Keep display but remove undo button (moved to active-loans.html)
2. **Data Management Buttons:** Remove (moved to settings.html)
3. **Profit Goal:** Keep display but editing moved to settings.html
4. **AppStateManager:** Use `deployedCapital` field (compatibility handled in app-state.js)

---

## Field Name Mapping

Legacy AppState → AppStateManager:
- `deployed` → `deployedCapital` (handled in app-state.js)
- `transactionHistory` → `transactions` (need to check)
- `capital` → `capital` (same)
- `totalInterestEarned` → `totalInterestEarned` (same)
- `totalFeesEarned` → `totalFeesEarned` (same)
- `profitGoal` → `profitGoal` (same)

---

## Functions to Preserve

1. `updateDashboard()` - Adapted for AppStateManager
2. `recalculateFinancialState()` - Financial validation
3. `validateAndFixData()` - Data integrity
4. `updateTransactionHistory()` - Display only (no undo)

---

## Functions to Remove

- All tab switching logic
- All module-specific functions
- Undo payment function (moved to active-loans.html)
- Backup/restore functions (moved to settings.html)

---

**Proceeding with implementation...**
