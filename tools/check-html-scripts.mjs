#!/usr/bin/env node
/**
 * check-html-scripts.mjs
 * Extracts every inline <script> block from the given HTML files and
 * verifies each parses as valid JavaScript. Exits non-zero on any failure.
 *
 * Usage: node tools/check-html-scripts.mjs [file1.html file2.html ...]
 * With no args, checks all top-level *.html files.
 */
import { readFileSync, readdirSync } from 'node:fs';

const args = process.argv.slice(2);
const files = args.length
    ? args
    : readdirSync('.').filter(f => f.endsWith('.html'));

let failures = 0;

for (const file of files) {
    const html = readFileSync(file, 'utf8');
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let m, i = 0;
    while ((m = re.exec(html)) !== null) {
        i++;
        const body = m[1];
        if (!body.trim()) continue;
        const line = html.slice(0, m.index).split('\n').length;
        try {
            // Parse-only check; never executes the code.
            new Function(body);
        } catch (err) {
            failures++;
            console.error(`FAIL  ${file}  <script> #${i} (starts line ${line}): ${err.message}`);
        }
    }
    if (i === 0) console.log(`note  ${file}: no inline scripts`);
}

if (failures) {
    console.error(`\n${failures} script block(s) failed to parse.`);
    process.exit(1);
}
console.log('All inline scripts parse cleanly.');
