# Pull Request: Fix PWA Stockvel Data Loading from Backup

## 📋 PR Title
```
fix: Load stockvel data on app initialization after restore
```

## 🎯 Summary

Fixes the issue where stockvel member data doesn't display in the PWA after restoring from cloud backup. The data was being backed up and restored correctly, but the UI wasn't being updated to display it.

## 🔧 Changes Made

### Files Modified
- **index.html** - Added `loadStockvelDashboard()` call during app initialization (5 lines)
- **sw.js** - Updated cache version from v27 to v28 (1 line)
- **PWA-STOCKVEL-DATA-FIX.md** - Complete documentation of the issue and fix (new file)

### Technical Details

**Root Cause:** 
The `loadStockvelDashboard()` function was only called when users clicked the Stockvel tab or after specific stockvel actions. It was never called during initial app load, so restored stockvel data remained invisible until the user manually clicked the Stockvel tab.

**The Fix:**
Added automatic initialization of stockvel dashboard during app startup:
```javascript
// Initialize stockvel dashboard (must be called after AppState.init to load saved data)
if (typeof loadStockvelDashboard === 'function') {
    loadStockvelDashboard();
}
```

## ✅ What This Fixes

### Before
- ❌ Stockvel dashboard showed "0 members" after cloud restore
- ❌ Data only appeared after manually clicking Stockvel tab
- ❌ Confusing user experience

### After
- ✅ Stockvel data displays immediately after restore
- ✅ Consistent behavior between normal load and restore
- ✅ Better user experience

## 🧪 Testing

**Test 1: Normal App Load**
1. Open PWA with existing stockvel data
2. ✅ Stockvel dashboard shows correct member count immediately

**Test 2: Cloud Restore**
1. Go to Settings → Cloud Backup → Restore from Cloud
2. ✅ After reload, stockvel data displays correctly

**Test 3: Empty State**
1. Clear all data
2. ✅ Shows "0 members" (expected behavior)

## 📊 Impact

- **User Experience:** Immediate improvement - no more confusion about whether restore worked
- **Code Quality:** Better initialization flow for all dashboards
- **PWA Version:** Updated to v1.7.1
- **Risk:** Very low - minimal change, defensive coding with function existence check

## 🔗 Related Issues

- Previous work: `8954f67` - Added stockvel fields to cloud backup
- This PR: Completes the backup/restore functionality by ensuring UI displays the data

## 📝 Commit Message
```
Fix: Load stockvel data on app initialization

ISSUE:
- Stockvel data was backed up and restored correctly
- But UI showed "0 members" after restore until user clicked Stockvel tab
- Data existed in AppState but dashboard wasn't updated

ROOT CAUSE:
- loadStockvelDashboard() was never called during app initialization
- Only called when Stockvel tab clicked or after stockvel actions

FIX:
- Call loadStockvelDashboard() automatically after AppState.init()
- Added function existence check for safety
- Updated service worker cache to v28 (force reload)

RESULT:
✅ Stockvel data displays immediately after app load
✅ Cloud restore shows correct member count and data
✅ Consistent behavior across all scenarios

Files changed:
- index.html (5 lines added)
- sw.js (cache version updated)
```

## 🚀 Ready to Merge

- ✅ Code changes are minimal and focused
- ✅ Fix addresses the root cause directly
- ✅ Backward compatible - no breaking changes
- ✅ Documentation complete
- ✅ Ready for deployment

---

**Branch:** `cursor/fix-pwa-stockvel-data-loading-from-backup-24b2`  
**Base:** `main`  
**Commits:** 1 new commit (+ inherited from feature/separate-stockvel-member-system)  
**Lines Changed:** +6 / -1
