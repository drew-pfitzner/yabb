// The YABB -> YNABB rename: an existing yabb.sqlite (with unsaved journal) is carried across on first start.
'use strict';
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ynabb-rename-test-'));
after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('an old yabb.sqlite, journal and all, becomes ynabb.sqlite with nothing lost', () => {
  // a child process writes in WAL mode and exits without closing, leaving the last write only in the journal
  const writer = `
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(${JSON.stringify(path.join(dir, 'yabb.sqlite'))});
    db.exec("PRAGMA journal_mode = WAL; PRAGMA wal_autocheckpoint = 0; CREATE TABLE t (v TEXT); INSERT INTO t VALUES ('first'), ('only in the journal');");
    process.exit(0);`;
  assert.equal(spawnSync(process.execPath, ['-e', writer]).status, 0);
  assert.ok(fs.existsSync(path.join(dir, 'yabb.sqlite-wal')), 'journal exists before the move');
  process.env.DATA_DIR = dir;
  process.env.COOKIE_SECURE = '0';
  const { db } = require('../server.js');
  assert.ok(fs.existsSync(path.join(dir, 'ynabb.sqlite')));
  assert.ok(!fs.existsSync(path.join(dir, 'yabb.sqlite')));
  assert.deepEqual(db.prepare('SELECT v FROM t ORDER BY rowid').all().map((r) => r.v), ['first', 'only in the journal']);
});
