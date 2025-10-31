#!/bin/bash
# Documentation Cleanup Script
# Removes 21 outdated documentation files
# Created: 2025-10-31
# Version: 1.0

echo "================================"
echo "TBFS Documentation Cleanup v1.0"
echo "================================"
echo ""
echo "This script will remove 21 outdated documentation files."
echo ""
echo "Files to be removed:"
echo "  - 5 old investigation reports"
echo "  - 2 old quick fix guides"
echo "  - 5 old bug reports"
echo "  - 8 old calculation documents"
echo "  - 4 old implementation summaries"
echo "  - 2 temporary PR/merge files"
echo ""
echo "18 current essential files will be kept."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Starting cleanup..."
echo ""

# Old investigations
echo "Removing old investigation reports..."
rm -f START-HERE.md
rm -f PWA-ERROR-INVESTIGATION-REPORT.md
rm -f INVESTIGATION-DELIVERABLES.md
rm -f INVESTIGATION-COMPLETE.txt
rm -f INVESTIGATION-SUMMARY.txt

# Old quick fixes
echo "Removing old quick fix guides..."
rm -f QUICK-FIX-GUIDE.md
rm -f QUICK-FIX-REFERENCE.md

# Old bug reports
echo "Removing old bug reports..."
rm -f BUG-FIX-SUMMARY.md
rm -f BUG-FIX-UNDEFINED-PROPERTIES.md
rm -f BUG-TEST-REPORT.md
rm -f BUG-TEST-RESULTS.md
rm -f PWA-STOCKVEL-DATA-FIX.md

# Old calculation docs
echo "Removing old calculation documents..."
rm -f LOAN-CALCULATION-3K-1M.md
rm -f LOAN-CALCULATION-3K-1M-CORRECT.md
rm -f LOAN-CALCULATION-3K-3M.md
rm -f FINAL-CALCULATION-R3K-1M.md
rm -f LOAN-COMPARISON-5K-10M.md
rm -f INCOME-TABLE-METHOD-EXPLAINED.md
rm -f INITIATION-FEE-LOGIC-EXPLAINED.md
rm -f CALCULATION-UPDATE-SUMMARY.md

# Old summaries
echo "Removing old implementation summaries..."
rm -f IMPLEMENTATION-SUMMARY.md
rm -f COMPLETE-IMPLEMENTATION-SUMMARY.md
rm -f SEPARATE-MEMBER-SYSTEM-SUMMARY.md
rm -f TAB-AND-SWIPE-FIX-SUMMARY.md
rm -f ACTIVE-LOAN-UPDATE-GUIDE.md

# Temporary files
echo "Removing temporary files..."
rm -f PR-MERGE-DESCRIPTION.md
rm -f MERGE-COMMIT-MESSAGE.txt

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Removed: 21 outdated files"
echo "Kept: 18 essential files"
echo ""
echo "Remaining essential documentation:"
echo "  ⭐ TBFS-COMPLETE-BUSINESS-RULES.md (Master document)"
echo "  📋 CHANGELOG-v1.7.5.md"
echo "  📚 TBFS-FEATURES.md"
echo "  🗺️  TBFS-Roadmap.md"
echo "  💰 LOAN-INCOME-TABLE.md"
echo "  🎁 BONUS-SYSTEM-EXPLAINED.md"
echo "  ... and 12 more current docs"
echo ""
echo "To commit these changes:"
echo '  git add -A'
echo '  git commit -m "docs: Remove 21 outdated documentation files"'
echo '  git push'
echo ""
