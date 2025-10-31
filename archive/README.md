# TBFS Documentation Archive

**Archive Date:** 2025-10-31  
**Reason:** Documentation cleanup for v1.7.5  
**Status:** Historical reference only

---

## 📦 What's in this Archive?

This folder contains **21 outdated documentation files** that have been superseded by current documentation.

These files are preserved for:
- Historical reference
- Understanding system evolution
- Audit trail
- Recovery if needed

---

## 📁 Archive Structure

### `/investigations/` - 5 files
Old PWA error investigation reports and deliverables.

**Status:** Investigations complete, issues fixed  
**Superseded by:** Current system documentation

**Files:**
- START-HERE.md
- PWA-ERROR-INVESTIGATION-REPORT.md
- INVESTIGATION-DELIVERABLES.md
- INVESTIGATION-COMPLETE.txt
- INVESTIGATION-SUMMARY.txt

---

### `/bug-reports/` - 7 files
Old bug reports, quick fixes, and test results.

**Status:** Bugs fixed in previous versions  
**Superseded by:** CHANGELOG-v1.7.5.md and current code

**Files:**
- QUICK-FIX-GUIDE.md
- QUICK-FIX-REFERENCE.md
- BUG-FIX-SUMMARY.md
- BUG-FIX-UNDEFINED-PROPERTIES.md
- BUG-TEST-REPORT.md
- BUG-TEST-RESULTS.md
- PWA-STOCKVEL-DATA-FIX.md

---

### `/calculations/` - 8 files
Old loan calculation examples and method explanations.

**Status:** Calculation methods updated, rates changed  
**Superseded by:** TBFS-COMPLETE-BUSINESS-RULES.md v1.7.5

**Files:**
- LOAN-CALCULATION-3K-1M.md
- LOAN-CALCULATION-3K-1M-CORRECT.md
- LOAN-CALCULATION-3K-3M.md
- FINAL-CALCULATION-R3K-1M.md
- LOAN-COMPARISON-5K-10M.md
- INCOME-TABLE-METHOD-EXPLAINED.md
- INITIATION-FEE-LOGIC-EXPLAINED.md
- CALCULATION-UPDATE-SUMMARY.md

**Note:** These show evolution of calculation logic. Rates have changed:
- Old: 15% monthly → New: 30% Income Table method
- Old: 9% initiation → New: 12% initiation

---

### `/summaries/` - 5 files
Old implementation and feature summaries.

**Status:** Features now documented in main docs  
**Superseded by:** TBFS-FEATURES.md and business rules doc

**Files:**
- IMPLEMENTATION-SUMMARY.md
- COMPLETE-IMPLEMENTATION-SUMMARY.md
- SEPARATE-MEMBER-SYSTEM-SUMMARY.md
- TAB-AND-SWIPE-FIX-SUMMARY.md
- ACTIVE-LOAN-UPDATE-GUIDE.md

---

### `/temporary/` - 2 files
Temporary PR and merge commit messages.

**Status:** Already used or obsolete  
**Superseded by:** Git commit history

**Files:**
- PR-MERGE-DESCRIPTION.md
- MERGE-COMMIT-MESSAGE.txt

---

## ⚠️ Important Notes

### Do NOT use these files for:
- ❌ Current business rules (use TBFS-COMPLETE-BUSINESS-RULES.md)
- ❌ Current calculations (rates have changed!)
- ❌ Current features (use TBFS-FEATURES.md)
- ❌ Current bug tracking (use CHANGELOG-v1.7.5.md)

### These files are useful for:
- ✅ Understanding system history
- ✅ Seeing how calculations evolved
- ✅ Audit trail
- ✅ Historical reference
- ✅ Learning from past issues

---

## 📚 Current Documentation

For current information, see:

**Master Document:**
- `/TBFS-COMPLETE-BUSINESS-RULES.md` ⭐

**Current Features:**
- `/TBFS-FEATURES.md`
- `/STOCKVEL-FEATURES-GUIDE.md`
- `/BONUS-SYSTEM-EXPLAINED.md`

**Latest Changes:**
- `/CHANGELOG-v1.7.5.md`

**Current Calculations:**
- `/LOAN-INCOME-TABLE.md`
- `/STANDARD-LOAN-FIX-VERIFICATION.md`
- `/STOCKVEL-30K-6M-CALCULATION.md`

**Operations:**
- `/DEPLOYMENT-CHECKLIST.md`
- `/GIT-WORKFLOW-GUIDE.md`
- `/TEST-LOCALLY.md`

---

## 🔄 Archive Policy

**Review:** Annually (next review: 2026-10-31)

**Potential Actions:**
- Keep if still useful for reference
- Delete if no longer needed
- Move to deeper archive if rarely accessed

**Current Status:** Keep for at least 1 year

---

## 📊 Archive Statistics

| Category | Files | Oldest | Newest | Status |
|----------|-------|--------|--------|--------|
| Investigations | 5 | Old | Old | Complete |
| Bug Reports | 7 | Old | Old | Fixed |
| Calculations | 8 | Old | Old | Superseded |
| Summaries | 5 | Old | Old | Superseded |
| Temporary | 2 | Old | Old | Used |
| **Total** | **27** | - | - | **Archived** |

---

## 🔍 How to Search Archive

```bash
# Search all archived files
grep -r "search term" archive/

# Search specific category
grep -r "calculation" archive/calculations/

# List all files
find archive/ -type f

# Count files
find archive/ -type f | wc -l
```

---

## 📝 Archive History

**v1.0 (2025-10-31):**
- Initial archive creation
- 21 files archived
- Organized into 5 categories
- Documentation cleanup for v1.7.5

---

**Archive Maintained By:** TBFS Development Team  
**Next Review Date:** 2026-10-31  
**Archive Location:** `/workspace/archive/`

---

*These files are preserved for historical reference only. For current documentation, see root directory.*
