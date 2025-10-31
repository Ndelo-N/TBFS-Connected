#!/bin/bash
# Documentation Archive Script
# Moves 21 outdated files to archive/ folder (preserves history)
# Created: 2025-10-31
# Version: 1.0

echo "================================"
echo "TBFS Documentation Archive v1.0"
echo "================================"
echo ""
echo "This script will archive 21 outdated documentation files."
echo ""
echo "Files will be moved to /archive/ folder organized by category:"
echo "  - archive/investigations/ (5 files)"
echo "  - archive/bug-reports/ (5 files)"
echo "  - archive/calculations/ (8 files)"
echo "  - archive/summaries/ (4 files)"
echo "  - archive/temporary/ (2 files)"
echo ""
echo "18 current essential files will remain in root."
echo ""
echo "Press Ctrl+C to cancel, or Enter to continue..."
read -r

echo ""
echo "Starting archive process..."
echo ""

# Create archive directories if they don't exist
mkdir -p archive/investigations
mkdir -p archive/bug-reports
mkdir -p archive/calculations
mkdir -p archive/summaries
mkdir -p archive/temporary

# Archive old investigations
echo "Archiving investigation reports..."
mv START-HERE.md archive/investigations/ 2>/dev/null || echo "  (START-HERE.md not found, skipping)"
mv PWA-ERROR-INVESTIGATION-REPORT.md archive/investigations/ 2>/dev/null || echo "  (PWA-ERROR-INVESTIGATION-REPORT.md not found, skipping)"
mv INVESTIGATION-DELIVERABLES.md archive/investigations/ 2>/dev/null || echo "  (INVESTIGATION-DELIVERABLES.md not found, skipping)"
mv INVESTIGATION-COMPLETE.txt archive/investigations/ 2>/dev/null || echo "  (INVESTIGATION-COMPLETE.txt not found, skipping)"
mv INVESTIGATION-SUMMARY.txt archive/investigations/ 2>/dev/null || echo "  (INVESTIGATION-SUMMARY.txt not found, skipping)"

# Archive old quick fixes and bug reports
echo "Archiving bug reports and fixes..."
mv QUICK-FIX-GUIDE.md archive/bug-reports/ 2>/dev/null || echo "  (QUICK-FIX-GUIDE.md not found, skipping)"
mv QUICK-FIX-REFERENCE.md archive/bug-reports/ 2>/dev/null || echo "  (QUICK-FIX-REFERENCE.md not found, skipping)"
mv BUG-FIX-SUMMARY.md archive/bug-reports/ 2>/dev/null || echo "  (BUG-FIX-SUMMARY.md not found, skipping)"
mv BUG-FIX-UNDEFINED-PROPERTIES.md archive/bug-reports/ 2>/dev/null || echo "  (BUG-FIX-UNDEFINED-PROPERTIES.md not found, skipping)"
mv BUG-TEST-REPORT.md archive/bug-reports/ 2>/dev/null || echo "  (BUG-TEST-REPORT.md not found, skipping)"
mv BUG-TEST-RESULTS.md archive/bug-reports/ 2>/dev/null || echo "  (BUG-TEST-RESULTS.md not found, skipping)"
mv PWA-STOCKVEL-DATA-FIX.md archive/bug-reports/ 2>/dev/null || echo "  (PWA-STOCKVEL-DATA-FIX.md not found, skipping)"

# Archive old calculation docs
echo "Archiving old calculation documents..."
mv LOAN-CALCULATION-3K-1M.md archive/calculations/ 2>/dev/null || echo "  (LOAN-CALCULATION-3K-1M.md not found, skipping)"
mv LOAN-CALCULATION-3K-1M-CORRECT.md archive/calculations/ 2>/dev/null || echo "  (LOAN-CALCULATION-3K-1M-CORRECT.md not found, skipping)"
mv LOAN-CALCULATION-3K-3M.md archive/calculations/ 2>/dev/null || echo "  (LOAN-CALCULATION-3K-3M.md not found, skipping)"
mv FINAL-CALCULATION-R3K-1M.md archive/calculations/ 2>/dev/null || echo "  (FINAL-CALCULATION-R3K-1M.md not found, skipping)"
mv LOAN-COMPARISON-5K-10M.md archive/calculations/ 2>/dev/null || echo "  (LOAN-COMPARISON-5K-10M.md not found, skipping)"
mv INCOME-TABLE-METHOD-EXPLAINED.md archive/calculations/ 2>/dev/null || echo "  (INCOME-TABLE-METHOD-EXPLAINED.md not found, skipping)"
mv INITIATION-FEE-LOGIC-EXPLAINED.md archive/calculations/ 2>/dev/null || echo "  (INITIATION-FEE-LOGIC-EXPLAINED.md not found, skipping)"
mv CALCULATION-UPDATE-SUMMARY.md archive/calculations/ 2>/dev/null || echo "  (CALCULATION-UPDATE-SUMMARY.md not found, skipping)"

# Archive old summaries
echo "Archiving old implementation summaries..."
mv IMPLEMENTATION-SUMMARY.md archive/summaries/ 2>/dev/null || echo "  (IMPLEMENTATION-SUMMARY.md not found, skipping)"
mv COMPLETE-IMPLEMENTATION-SUMMARY.md archive/summaries/ 2>/dev/null || echo "  (COMPLETE-IMPLEMENTATION-SUMMARY.md not found, skipping)"
mv SEPARATE-MEMBER-SYSTEM-SUMMARY.md archive/summaries/ 2>/dev/null || echo "  (SEPARATE-MEMBER-SYSTEM-SUMMARY.md not found, skipping)"
mv TAB-AND-SWIPE-FIX-SUMMARY.md archive/summaries/ 2>/dev/null || echo "  (TAB-AND-SWIPE-FIX-SUMMARY.md not found, skipping)"
mv ACTIVE-LOAN-UPDATE-GUIDE.md archive/summaries/ 2>/dev/null || echo "  (ACTIVE-LOAN-UPDATE-GUIDE.md not found, skipping)"

# Archive temporary files
echo "Archiving temporary files..."
mv PR-MERGE-DESCRIPTION.md archive/temporary/ 2>/dev/null || echo "  (PR-MERGE-DESCRIPTION.md not found, skipping)"
mv MERGE-COMMIT-MESSAGE.txt archive/temporary/ 2>/dev/null || echo "  (MERGE-COMMIT-MESSAGE.txt not found, skipping)"

echo ""
echo "Archive complete!"
echo ""

# Count archived files
ARCHIVED_COUNT=$(find archive/ -type f \( -name "*.md" -o -name "*.txt" \) ! -name "README.md" | wc -l)
echo "Files archived: $ARCHIVED_COUNT"
echo ""

echo "Archive structure:"
echo "  archive/"
echo "  ├── investigations/ ($(ls archive/investigations/ 2>/dev/null | wc -l) files)"
echo "  ├── bug-reports/ ($(ls archive/bug-reports/ 2>/dev/null | wc -l) files)"
echo "  ├── calculations/ ($(ls archive/calculations/ 2>/dev/null | wc -l) files)"
echo "  ├── summaries/ ($(ls archive/summaries/ 2>/dev/null | wc -l) files)"
echo "  └── temporary/ ($(ls archive/temporary/ 2>/dev/null | wc -l) files)"
echo ""

echo "Root documentation (current files):"
echo "  ⭐ TBFS-COMPLETE-BUSINESS-RULES.md"
echo "  📋 CHANGELOG-v1.7.5.md"
echo "  📚 TBFS-FEATURES.md"
echo "  🗺️  TBFS-Roadmap.md"
echo "  💰 LOAN-INCOME-TABLE.md"
echo "  🎁 BONUS-SYSTEM-EXPLAINED.md"
echo "  ... and more current docs"
echo ""

echo "To commit these changes:"
echo "  git add -A"
echo "  git commit -m \"docs: Archive outdated files into organized structure\""
echo "  git push"
echo ""
echo "To access archived files: cd archive/<category>/"
echo ""
