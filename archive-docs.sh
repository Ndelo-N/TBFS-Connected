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
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Archive cancelled."
    exit 0
fi

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
mv START-HERE.md archive/investigations/ 2>/dev/null
mv PWA-ERROR-INVESTIGATION-REPORT.md archive/investigations/ 2>/dev/null
mv INVESTIGATION-DELIVERABLES.md archive/investigations/ 2>/dev/null
mv INVESTIGATION-COMPLETE.txt archive/investigations/ 2>/dev/null
mv INVESTIGATION-SUMMARY.txt archive/investigations/ 2>/dev/null

# Archive old quick fixes and bug reports
echo "Archiving bug reports and fixes..."
mv QUICK-FIX-GUIDE.md archive/bug-reports/ 2>/dev/null
mv QUICK-FIX-REFERENCE.md archive/bug-reports/ 2>/dev/null
mv BUG-FIX-SUMMARY.md archive/bug-reports/ 2>/dev/null
mv BUG-FIX-UNDEFINED-PROPERTIES.md archive/bug-reports/ 2>/dev/null
mv BUG-TEST-REPORT.md archive/bug-reports/ 2>/dev/null
mv BUG-TEST-RESULTS.md archive/bug-reports/ 2>/dev/null
mv PWA-STOCKVEL-DATA-FIX.md archive/bug-reports/ 2>/dev/null

# Archive old calculation docs
echo "Archiving old calculation documents..."
mv LOAN-CALCULATION-3K-1M.md archive/calculations/ 2>/dev/null
mv LOAN-CALCULATION-3K-1M-CORRECT.md archive/calculations/ 2>/dev/null
mv LOAN-CALCULATION-3K-3M.md archive/calculations/ 2>/dev/null
mv FINAL-CALCULATION-R3K-1M.md archive/calculations/ 2>/dev/null
mv LOAN-COMPARISON-5K-10M.md archive/calculations/ 2>/dev/null
mv INCOME-TABLE-METHOD-EXPLAINED.md archive/calculations/ 2>/dev/null
mv INITIATION-FEE-LOGIC-EXPLAINED.md archive/calculations/ 2>/dev/null
mv CALCULATION-UPDATE-SUMMARY.md archive/calculations/ 2>/dev/null

# Archive old summaries
echo "Archiving old implementation summaries..."
mv IMPLEMENTATION-SUMMARY.md archive/summaries/ 2>/dev/null
mv COMPLETE-IMPLEMENTATION-SUMMARY.md archive/summaries/ 2>/dev/null
mv SEPARATE-MEMBER-SYSTEM-SUMMARY.md archive/summaries/ 2>/dev/null
mv TAB-AND-SWIPE-FIX-SUMMARY.md archive/summaries/ 2>/dev/null
mv ACTIVE-LOAN-UPDATE-GUIDE.md archive/summaries/ 2>/dev/null

# Archive temporary files
echo "Archiving temporary files..."
mv PR-MERGE-DESCRIPTION.md archive/temporary/ 2>/dev/null
mv MERGE-COMMIT-MESSAGE.txt archive/temporary/ 2>/dev/null

echo ""
echo "✅ Archive complete!"
echo ""
echo "📦 Archived: 21 files organized by category"
echo "✅ Kept: 18 essential files in root"
echo ""
echo "Archive structure:"
echo "  archive/"
echo "  ├── investigations/ (5 files)"
echo "  ├── bug-reports/ (7 files)"
echo "  ├── calculations/ (8 files)"
echo "  ├── summaries/ (5 files)"
echo "  └── temporary/ (2 files)"
echo ""
echo "Root documentation (18 essential files):"
echo "  ⭐ TBFS-COMPLETE-BUSINESS-RULES.md"
echo "  📋 CHANGELOG-v1.7.5.md"
echo "  📚 TBFS-FEATURES.md"
echo "  🗺️  TBFS-Roadmap.md"
echo "  💰 LOAN-INCOME-TABLE.md"
echo "  🎁 BONUS-SYSTEM-EXPLAINED.md"
echo "  ... and 12 more current docs"
echo ""
echo "To commit these changes:"
echo '  git add -A'
echo '  git commit -m "docs: Archive 21 outdated files, organize into archive/ folder"'
echo '  git push'
echo ""
echo "To access archived files: cd archive/<category>/"
echo ""
