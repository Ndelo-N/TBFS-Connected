#!/usr/bin/env node
/**
 * Global-scope collision guard.
 *
 * Classic <script> files all share ONE browser global scope. Parsing each
 * file in isolation (node --check, or per-block inline checks) can never
 * see a duplicate top-level `const`/`let`/`class` across files — the class
 * of bug that shipped in the security series and blocked Calculations and
 * CloudBackup until commit d1f501b fixed it.
 *
 * For every page this concatenates its shared scripts (in tag order, with
 * cache-busting query strings stripped) plus its inline scripts, and parses
 * the WHOLE thing as a single program — exactly what the browser's global
 * scope must swallow. Any redeclaration collision fails the build.
 *
 * Usage: node tools/check-global-scope.mjs
 */
import { readFileSync } from 'node:fs';

const PAGES = [
    'index.html', 'calculator.html', 'active-loans.html', 'stockvel.html',
    'clients.html', 'client-relationship.html', 'reports.html', 'settings.html',
    'loan-income-calculator.html'
];

let failures = 0;

for (const page of PAGES) {
    let html;
    try {
        html = readFileSync(page, 'utf8');
    } catch {
        continue; // page absent in this checkout — skip
    }

    const sharedSrcs = [...html.matchAll(/<script src="(shared\/[^"]+)"><\/script>/g)]
        .map(m => m[1].split('?')[0]);
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
        .map(m => m[1]);

    const program = sharedSrcs.map(s => readFileSync(s, 'utf8')).join('\n;\n')
        + '\n;\n' + inline.join('\n;\n');

    try {
        // Parse-only; nothing executes.
        new Function(program);
        console.log(`${page}: scope OK (${sharedSrcs.length} shared + ${inline.length} inline)`);
    } catch (err) {
        failures++;
        console.error(`${page}: GLOBAL-SCOPE FAIL — ${err.message}`);
    }
}

if (failures) {
    console.error(`\n${failures} page(s) fail when their scripts share one global scope.`);
    process.exit(1);
}
console.log('All pages parse cleanly under a shared global scope.');
