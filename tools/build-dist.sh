#!/usr/bin/env bash
# build-dist.sh — assemble the deployable app shell into dist/
#
# F-14 remediation: GitHub Pages must serve ONLY the runtime application,
# never internal documentation, client files, or dev/test pages.
# Anything not explicitly listed here does not ship.
set -euo pipefail

cd "$(dirname "$0")/.."
rm -rf dist
mkdir -p dist

# Runtime pages (explicit allowlist)
PAGES=(
    index.html
    calculator.html
    active-loans.html
    stockvel.html
    clients.html
    client-relationship.html
    client-portal.html
    reports.html
    loan-income-calculator.html
    settings.html
    offline.html
    splash.html
)
for p in "${PAGES[@]}"; do
    cp "$p" dist/
done

# App shell assets
cp manifest.json sw.js TBFS_Logo.png dist/
cp -r shared dist/shared
cp -r icons dist/icons
mkdir -p dist/client-status
# Published encrypted packs land here after operator publish + deploy
if [ -d client-status ]; then
    cp -r client-status/. dist/client-status/ 2>/dev/null || true
fi

# Vendored third-party libraries (present from the F-10 patch onward)
if [ -d vendor ]; then
    cp -r vendor dist/vendor
fi

echo "dist/ assembled:"
find dist -type f | sort
