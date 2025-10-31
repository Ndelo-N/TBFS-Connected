# Quick Archive - Simple Commands

**If the script doesn't work, use these simple commands:**

## Option 1: One Command at a Time

```bash
# Create folders
mkdir -p archive/investigations archive/bug-reports archive/calculations archive/summaries archive/temporary

# Move investigations (one at a time)
mv START-HERE.md archive/investigations/
mv PWA-ERROR-INVESTIGATION-REPORT.md archive/investigations/
mv INVESTIGATION-DELIVERABLES.md archive/investigations/
mv INVESTIGATION-COMPLETE.txt archive/investigations/
mv INVESTIGATION-SUMMARY.txt archive/investigations/

# Move bug reports
mv QUICK-FIX-GUIDE.md archive/bug-reports/
mv QUICK-FIX-REFERENCE.md archive/bug-reports/
mv BUG-FIX-SUMMARY.md archive/bug-reports/
mv BUG-FIX-UNDEFINED-PROPERTIES.md archive/bug-reports/
mv BUG-TEST-REPORT.md archive/bug-reports/
mv BUG-TEST-RESULTS.md archive/bug-reports/
mv PWA-STOCKVEL-DATA-FIX.md archive/bug-reports/

# Move calculations
mv LOAN-CALCULATION-3K-1M.md archive/calculations/
mv LOAN-CALCULATION-3K-1M-CORRECT.md archive/calculations/
mv LOAN-CALCULATION-3K-3M.md archive/calculations/
mv FINAL-CALCULATION-R3K-1M.md archive/calculations/
mv LOAN-COMPARISON-5K-10M.md archive/calculations/
mv INCOME-TABLE-METHOD-EXPLAINED.md archive/calculations/
mv INITIATION-FEE-LOGIC-EXPLAINED.md archive/calculations/
mv CALCULATION-UPDATE-SUMMARY.md archive/calculations/

# Move summaries
mv IMPLEMENTATION-SUMMARY.md archive/summaries/
mv COMPLETE-IMPLEMENTATION-SUMMARY.md archive/summaries/
mv SEPARATE-MEMBER-SYSTEM-SUMMARY.md archive/summaries/
mv TAB-AND-SWIPE-FIX-SUMMARY.md archive/summaries/
mv ACTIVE-LOAN-UPDATE-GUIDE.md archive/summaries/

# Move temporary
mv PR-MERGE-DESCRIPTION.md archive/temporary/
mv MERGE-COMMIT-MESSAGE.txt archive/temporary/

echo "Done! Check with: ls archive/*/"
```

## Option 2: Copy-Paste Everything

```bash
mkdir -p archive/investigations archive/bug-reports archive/calculations archive/summaries archive/temporary && mv START-HERE.md PWA-ERROR-INVESTIGATION-REPORT.md INVESTIGATION-DELIVERABLES.md INVESTIGATION-COMPLETE.txt INVESTIGATION-SUMMARY.txt archive/investigations/ 2>/dev/null; mv QUICK-FIX-GUIDE.md QUICK-FIX-REFERENCE.md BUG-FIX-SUMMARY.md BUG-FIX-UNDEFINED-PROPERTIES.md BUG-TEST-REPORT.md BUG-TEST-RESULTS.md PWA-STOCKVEL-DATA-FIX.md archive/bug-reports/ 2>/dev/null; mv LOAN-CALCULATION-3K-1M.md LOAN-CALCULATION-3K-1M-CORRECT.md LOAN-CALCULATION-3K-3M.md FINAL-CALCULATION-R3K-1M.md LOAN-COMPARISON-5K-10M.md INCOME-TABLE-METHOD-EXPLAINED.md INITIATION-FEE-LOGIC-EXPLAINED.md CALCULATION-UPDATE-SUMMARY.md archive/calculations/ 2>/dev/null; mv IMPLEMENTATION-SUMMARY.md COMPLETE-IMPLEMENTATION-SUMMARY.md SEPARATE-MEMBER-SYSTEM-SUMMARY.md TAB-AND-SWIPE-FIX-SUMMARY.md ACTIVE-LOAN-UPDATE-GUIDE.md archive/summaries/ 2>/dev/null; mv PR-MERGE-DESCRIPTION.md MERGE-COMMIT-MESSAGE.txt archive/temporary/ 2>/dev/null; echo "Archive complete! Files moved to archive/"; ls archive/*/
```

## Then Commit:

```bash
git add -A
git commit -m "docs: Archive outdated files into organized structure"
git push
```

---

**Note:** The `2>/dev/null` suppresses errors if a file doesn't exist (safe).
