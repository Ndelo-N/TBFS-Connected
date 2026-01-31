# 🧪 Phase 7: Settings Module - Testing Guide

**Module:** Settings (`settings.html`)  
**Status:** ✅ Complete, Ready for Testing  
**Date:** January 2026

---

## 📋 Testing Checklist

### **1. Financial Settings** 💰

#### **Set Capital:**
- [ ] Enter a capital amount (e.g., R100,000)
- [ ] Click "Set Capital"
- [ ] Verify confirmation dialog shows correct values
- [ ] Confirm and verify capital is updated
- [ ] Check that current capital displays correctly
- [ ] Verify capital persists after page reload
- [ ] Test with invalid input (negative, text) - should show error

#### **Set Profit Goal:**
- [ ] Enter a profit goal (e.g., R500,000)
- [ ] Click "Set Profit Goal"
- [ ] Verify confirmation dialog shows correct values
- [ ] Confirm and verify profit goal is updated
- [ ] Check that current profit goal displays correctly
- [ ] Verify profit goal persists after page reload
- [ ] Test with invalid input (negative, text) - should show error

#### **Profit Progress Display:**
- [ ] Set a profit goal
- [ ] Verify progress bar displays correctly
- [ ] Verify percentage calculation is accurate
- [ ] Check "remaining" text when below goal
- [ ] Check "goal achieved" message when above goal
- [ ] Verify progress updates when profit changes (from other pages)

---

### **2. App Version & Updates** 🔄

#### **Version Display:**
- [ ] Verify current version displays correctly (v1.7.5)
- [ ] Check update status message

#### **Check for Updates:**
- [ ] Click "Check for Updates" button
- [ ] Verify button shows "Checking..." while loading
- [ ] If update available, verify update banner appears
- [ ] If no update, verify "latest version" message
- [ ] Test with no internet connection (should show error)

#### **Apply Update:**
- [ ] If update banner appears, click "Update Now"
- [ ] Verify page reloads after update
- [ ] Verify new version is active

---

### **3. Cloud Backup (GitHub)** ☁️

#### **Token Configuration:**
- [ ] Enter a valid GitHub token (starts with `github_pat_` or `ghp_`)
- [ ] Click "Save Token & Configure"
- [ ] Verify token is saved (encrypted in localStorage)
- [ ] Verify "Token Configured" section appears
- [ ] Verify setup form is hidden
- [ ] Test with invalid token format - should show error
- [ ] Test with empty token - should show error

#### **Remove Token:**
- [ ] Click "Remove Token" button
- [ ] Verify confirmation dialog
- [ ] Confirm removal
- [ ] Verify token is removed
- [ ] Verify setup form reappears

#### **Auto-Backup Toggle:**
- [ ] Check "Enable Auto-Backup" checkbox
- [ ] Verify auto-backup status appears
- [ ] Verify initial backup is triggered
- [ ] Uncheck to disable
- [ ] Verify confirmation dialog
- [ ] Verify auto-backup status is hidden
- [ ] Verify auto-backup setting persists after reload

#### **Cloud Restore:**
- [ ] Click "Restore from Cloud" button
- [ ] If no token configured, verify error message
- [ ] If token configured but no backup exists, verify helpful message
- [ ] If backup exists, verify restore works
- [ ] Verify page reloads after restore
- [ ] Verify data is restored correctly

#### **Offline Queue:**
- [ ] Enable auto-backup
- [ ] Disconnect internet
- [ ] Make a change (trigger save)
- [ ] Verify backup is queued
- [ ] Reconnect internet
- [ ] Verify queued backup syncs automatically

---

### **4. Manual Backup & Restore** 💾

#### **Download Backup:**
- [ ] Click "Download Local Backup" button
- [ ] Verify JSON file downloads
- [ ] Verify filename includes date
- [ ] Open file and verify it contains valid JSON
- [ ] Verify all data is included (loans, clients, stockvel, etc.)

#### **Restore from File:**
- [ ] Click "Restore from File" button
- [ ] Select a valid backup JSON file
- [ ] Verify restore confirmation
- [ ] Verify page reloads after restore
- [ ] Verify all data is restored correctly
- [ ] Test with invalid file - should show error
- [ ] Test with corrupted JSON - should show error

---

### **5. Data Management** 🗑️

#### **Clear All Data:**
- [ ] Click "Clear All Data" button
- [ ] Verify warning dialog appears
- [ ] Verify dialog lists what will be deleted
- [ ] Confirm clearing
- [ ] Verify backup is automatically created before clearing
- [ ] Verify all data is cleared
- [ ] Verify page reloads
- [ ] Verify app resets to default state
- [ ] Test cancel - verify no data is cleared

---

### **6. Cross-Tab Synchronization** 🔄

#### **State Sync:**
- [ ] Open Settings page in one tab
- [ ] Open another page (e.g., Active Loans) in another tab
- [ ] Make a change on Active Loans page
- [ ] Verify Settings page updates automatically (profit progress, etc.)
- [ ] Change capital in Settings
- [ ] Verify other tabs see the change

---

### **7. Navigation** 🧭

#### **Navigation Integration:**
- [ ] Verify navigation bar appears at top
- [ ] Verify "Settings" is highlighted as active
- [ ] Click other navigation links
- [ ] Verify navigation works correctly
- [ ] Test on mobile - verify hamburger menu works

---

### **8. Mobile Responsiveness** 📱

#### **Mobile Layout:**
- [ ] Test on mobile device or browser dev tools
- [ ] Verify all sections are readable
- [ ] Verify buttons are touch-friendly
- [ ] Verify forms are usable on mobile
- [ ] Verify navigation works on mobile

---

## 🐛 Known Issues to Watch For

### **Potential Issues:**
1. **Cloud Backup Token:** If GitHub API changes, token validation may need update
2. **Service Worker:** Update check may fail if GitHub Pages is down
3. **Large Backups:** Very large datasets may take time to backup/restore
4. **Offline Mode:** Cloud backup will queue but won't sync until online

---

## ✅ Success Criteria

All tests should pass:
- ✅ All settings functions work correctly
- ✅ Data persists after page reload
- ✅ Backup/restore works without data loss
- ✅ Cloud backup syncs correctly (if configured)
- ✅ Cross-tab synchronization works
- ✅ Mobile experience is good
- ✅ No console errors

---

## 📝 Test Results Template

```
Phase 7 Testing Results
Date: ___________
Tester: ___________

Financial Settings: [ ] Pass [ ] Fail
App Updates: [ ] Pass [ ] Fail
Cloud Backup: [ ] Pass [ ] Fail
Manual Backup: [ ] Pass [ ] Fail
Data Management: [ ] Pass [ ] Fail
Cross-Tab Sync: [ ] Pass [ ] Fail
Navigation: [ ] Pass [ ] Fail
Mobile: [ ] Pass [ ] Fail

Issues Found:
1. 
2. 
3. 

Overall: [ ] Ready for Production [ ] Needs Fixes
```

---

**Ready to test!** 🚀  
Open `settings.html` directly or use the navigation from any other page.
