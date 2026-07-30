/**
 * Cloud backup helpers — messaging / repo identity (no network).
 * Run: node --test tests/cloud-backup.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CloudBackup = require('../shared/cloud-backup.js');

test('repoFullName points at the private backup repository', () => {
    assert.equal(CloudBackup.repoFullName(), 'Ndelo-N/TBFS-Data-Backup');
});

test('repoAccessHelp explains private-repo 404 PAT masking', () => {
    const msg = CloudBackup.repoAccessHelp(404);
    assert.match(msg, /TBFS-Data-Backup/);
    assert.match(msg, /404/);
    assert.match(msg, /fine-grained PAT/i);
    assert.match(msg, /Contents: Read and write/);
    assert.match(msg, /Backup Now/);
});

test('_githubWriteError maps 404 to repo-access guidance', () => {
    const msg = CloudBackup._githubWriteError(404, '{"message":"Not Found"}');
    assert.match(msg, /Cannot access private repo/);
    assert.match(msg, /TBFS-Data-Backup/);
});

test('_githubWriteError maps PAT 403 to repo-access guidance', () => {
    const msg = CloudBackup._githubWriteError(
        403,
        '{"message":"Resource not accessible by PAT"}'
    );
    assert.match(msg, /TBFS-Data-Backup/);
});
