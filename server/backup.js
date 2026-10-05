/* Backups: a nightly encrypted copy of the database, kept on the A6 (BACKUP_DIR) and copied offsite to
   iCloud (OFFSITE_DIR), plus a weekly test restore that proves the newest copy really opens.
   Receipts are copied once each (encrypted) and never deleted.

   Every file is AES-256-GCM encrypted with BACKUP_KEY (32 random bytes, base64). Without that key the
   backups can't be opened, so keep it in the password manager.

   Read a backup on any computer with Node:
     BACKUP_KEY=... node server/backup.js decrypt <file.yabbbak> <out.sqlite | out.jpg> */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const sqlite = require('node:sqlite');

const MAGIC = Buffer.from('YABBENC1');
const KEEP = { daily: 14, weekly: 8, monthly: 12 };
const BACKUP_AT_HOUR = 2; // 2am, local time on the server
const HOUR = 3600e3, DAY = 24 * HOUR;
const DB_FILE = /^yabb-\d{8}-\d{6}\.yabbbak$/; // only files we made are ever rotated

function keyFrom(b64) {
  const key = Buffer.from(String(b64 || ''), 'base64');
  if (key.length !== 32) throw new Error('BACKUP_KEY must be 32 random bytes in base64 (openssl rand -base64 32).');
  return key;
}
function encrypt(key, plain) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([c.update(plain), c.final()]);
  return Buffer.concat([MAGIC, iv, c.getAuthTag(), body]);
}
function decrypt(key, file) {
  if (!file.subarray(0, 8).equals(MAGIC)) throw new Error('Not a YABB backup file.');
  const d = crypto.createDecipheriv('aes-256-gcm', key, file.subarray(8, 20));
  d.setAuthTag(file.subarray(20, 36));
  return Buffer.concat([d.update(file.subarray(36)), d.final()]); // throws if the key is wrong or the file is damaged
}
// write through a temporary name, so a half-written file never looks like a backup
function writeAtomic(file, data) {
  fs.writeFileSync(file + '.part', data);
  fs.renameSync(file + '.part', file);
}
const stamp = (d) => d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' +
  String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + String(d.getSeconds()).padStart(2, '0');
const listBackups = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => DB_FILE.test(f)).sort() : []);
// delete only what's beyond the keep count, oldest first, so a bug can never empty a folder
function rotate(dir, keep) {
  const files = listBackups(dir);
  for (const f of files.slice(0, Math.max(0, files.length - keep))) fs.unlinkSync(path.join(dir, f));
}

function setup({ db, dataDir, blobDir, env = process.env, log = console.log }) {
  const localDir = env.BACKUP_DIR ? path.resolve(env.BACKUP_DIR) : null;
  const offsiteDir = env.OFFSITE_DIR ? path.resolve(env.OFFSITE_DIR) : null;
  let key = null, keyProblem = null;
  try { key = keyFrom(env.BACKUP_KEY); } catch (e) { keyProblem = e.message; }

  db.exec(`CREATE TABLE IF NOT EXISTS backup_runs (
    seq INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, ts INTEGER NOT NULL, ok INTEGER NOT NULL,
    offsite_ok INTEGER, file TEXT, size INTEGER, note TEXT)`);
  const record = (r) => db.prepare('INSERT INTO backup_runs (kind, ts, ok, offsite_ok, file, size, note) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(r.kind, Date.now(), r.ok ? 1 : 0, r.offsite_ok == null ? null : r.offsite_ok ? 1 : 0, r.file || null, r.size || null, r.note || null);
  const last = (kind, okOnly) => db.prepare(`SELECT * FROM backup_runs WHERE kind = ?${okOnly ? ' AND ok = 1' : ''} ORDER BY seq DESC LIMIT 1`).get(kind);

  // copy each receipt once, encrypted; receipts never change, so these are never rewritten or deleted
  function copyBlobs(toDir, fromDir) {
    fs.mkdirSync(toDir, { recursive: true });
    let n = 0;
    for (const { id } of db.prepare('SELECT id FROM blobs').all()) {
      const out = path.join(toDir, id + '.yabbbak');
      if (fs.existsSync(out)) continue;
      const src = fromDir ? path.join(fromDir, id + '.yabbbak') : path.join(blobDir, id);
      writeAtomic(out, fromDir ? fs.readFileSync(src) : encrypt(key, fs.readFileSync(src)));
      n++;
    }
    return n;
  }
  // make `to` hold the same backups as `from`, then rotate it the same way
  function mirror(from, to) {
    for (const tier of Object.keys(KEEP)) {
      const a = path.join(from, tier), b = path.join(to, tier);
      fs.mkdirSync(b, { recursive: true });
      for (const f of listBackups(a)) if (!fs.existsSync(path.join(b, f))) writeAtomic(path.join(b, f), fs.readFileSync(path.join(a, f)));
      rotate(b, KEEP[tier]);
    }
    copyBlobs(path.join(to, 'blobs'), path.join(from, 'blobs'));
  }

  async function backupNow() {
    if (!key) throw new Error(keyProblem);
    if (!localDir) throw new Error('BACKUP_DIR is not set.');
    const now = new Date();
    const name = 'yabb-' + stamp(now) + '.yabbbak';
    const tmp = path.join(dataDir, 'backup-snapshot.tmp');
    try {
      // a consistent copy of the live database, taken while it keeps running
      await sqlite.backup(db, tmp);
      const plain = fs.readFileSync(tmp);
      const sealed = encrypt(key, zlib.gzipSync(plain));
      // prove the sealed copy opens to exactly what we took before trusting it
      if (!zlib.gunzipSync(decrypt(key, sealed)).equals(plain)) throw new Error('The backup did not read back the same.');
      const check = new sqlite.DatabaseSync(tmp, { readOnly: true });
      const integrity = check.prepare('PRAGMA integrity_check').get();
      check.close();
      if (Object.values(integrity)[0] !== 'ok') throw new Error('The database copy failed its integrity check.');
      for (const tier of Object.keys(KEEP)) fs.mkdirSync(path.join(localDir, tier), { recursive: true });
      writeAtomic(path.join(localDir, 'daily', name), sealed);
      if (now.getDay() === 0) writeAtomic(path.join(localDir, 'weekly', name), sealed); // Sundays
      if (now.getDate() === 1) writeAtomic(path.join(localDir, 'monthly', name), sealed); // 1st of the month
      for (const tier of Object.keys(KEEP)) rotate(path.join(localDir, tier), KEEP[tier]);
      copyBlobs(path.join(localDir, 'blobs'));
      let offsiteOk = null, note = null;
      if (offsiteDir) {
        try {
          if (!fs.existsSync(offsiteDir)) throw new Error('The iCloud folder is missing.');
          mirror(localDir, offsiteDir);
          offsiteOk = true;
        } catch (e) { offsiteOk = false; note = 'Saved on the server but not copied to iCloud: ' + e.message; }
      }
      record({ kind: 'backup', ok: true, offsite_ok: offsiteOk, file: name, size: sealed.length, note });
      log(`backup ${name} (${sealed.length} bytes)${offsiteOk === false ? ' NOT offsite' : ''}`);
      return last('backup');
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  }

  // open the newest backup like a real restore would, and compare it with the live database
  async function drillNow() {
    if (!key) throw new Error(keyProblem);
    const daily = path.join(localDir, 'daily');
    const newest = listBackups(daily).pop();
    if (!newest) throw new Error('There is no backup to test.');
    const tmp = path.join(dataDir, 'restore-check.tmp');
    try {
      fs.writeFileSync(tmp, zlib.gunzipSync(decrypt(key, fs.readFileSync(path.join(daily, newest)))));
      const copy = new sqlite.DatabaseSync(tmp, { readOnly: true });
      const problems = [];
      if (Object.values(copy.prepare('PRAGMA integrity_check').get())[0] !== 'ok') problems.push('integrity check failed');
      const count = (d) => Object.fromEntries(d.prepare('SELECT budget_id b, COUNT(*) n FROM docs GROUP BY budget_id').all().map((r) => [r.b, r.n]));
      const live = count(db), back = count(copy);
      for (const b in live) {
        if (!back[b]) problems.push(`a budget came back empty (${live[b]} documents live)`);
        else if (back[b] < live[b] * 0.9) problems.push(`a budget came back more than 10% short (${back[b]} of ${live[b]})`);
      }
      const users = copy.prepare('SELECT COUNT(*) n FROM users').get().n;
      if (!users) problems.push('no logins in the backup');
      // every receipt the backup knows about must be in the receipt copies, and the newest must open
      const ids = copy.prepare('SELECT id FROM blobs ORDER BY ts DESC').all().map((r) => r.id);
      copy.close();
      const missing = ids.filter((id) => !fs.existsSync(path.join(localDir, 'blobs', id + '.yabbbak')));
      if (missing.length) problems.push(`${missing.length} receipts missing from the backup`);
      for (const id of ids.slice(0, 3)) {
        if (missing.includes(id)) continue;
        try { decrypt(key, fs.readFileSync(path.join(localDir, 'blobs', id + '.yabbbak'))); } catch (e) { problems.push('a receipt copy would not open'); break; }
      }
      let offsiteOk = null;
      if (offsiteDir) {
        const off = path.join(offsiteDir, 'daily', newest);
        offsiteOk = fs.existsSync(off) && fs.statSync(off).size === fs.statSync(path.join(daily, newest)).size;
        if (!offsiteOk) problems.push('the newest backup is not in iCloud');
      }
      const docs = Object.values(back).reduce((a, n) => a + n, 0);
      const note = problems.length ? problems.join('; ') : `${newest} opened: ${docs} documents, ${users} logins, ${ids.length} receipts`;
      record({ kind: 'drill', ok: !problems.length, offsite_ok: offsiteOk, file: newest, note });
      log('restore check: ' + note);
      return last('drill');
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  }

  let busy = false;
  async function run(kind) {
    if (busy) throw new Error('A backup is already running.');
    busy = true;
    try { return kind === 'drill' ? await drillNow() : await backupNow(); } catch (e) {
      record({ kind, ok: false, note: e.message });
      log(`${kind} FAILED: ${e.message}`);
      throw e;
    } finally { busy = false; }
  }
  // the most recent 2am that has passed
  function lastSlot(now) {
    const d = new Date(now);
    d.setHours(BACKUP_AT_HOUR, 0, 0, 0);
    if (d.getTime() > now) d.setDate(d.getDate() - 1);
    return d.getTime();
  }
  // checked every few minutes, so a box that was off at 2am catches up when it's back
  async function tick() {
    if (!key || !localDir || busy) return;
    const now = Date.now();
    const b = last('backup', true), tried = last('backup');
    const recentlyFailed = tried && !tried.ok && now - tried.ts < HOUR;
    if ((!b || b.ts < lastSlot(now)) && !recentlyFailed) await run('backup').catch(() => {});
    const d = last('drill', true), dTried = last('drill');
    if (last('backup', true) && (!d || now - d.ts > 7 * DAY) && !(dTried && !dTried.ok && now - dTried.ts < 6 * HOUR)) await run('drill').catch(() => {});
  }
  function start() {
    if (!localDir) { log('Backups are off: BACKUP_DIR is not set.'); return; }
    if (!key) { log('Backups are off: ' + keyProblem); return; }
    setTimeout(tick, 60e3);
    setInterval(tick, 10 * 60e3).unref();
  }
  // what the admin page shows: one line each for the nightly backup and the weekly restore check
  function status() {
    const now = Date.now();
    const show = (kind, staleAfter) => {
      const r = last(kind), good = last(kind, true);
      if (!localDir || !key) return { state: 'off', note: !localDir ? 'BACKUP_DIR is not set.' : keyProblem };
      if (!r) return { state: 'never', note: 'Has not run yet.' };
      const base = { ts: r.ts, lastGood: good ? good.ts : null, note: r.note, file: r.file, size: r.size };
      if (!good || now - good.ts > staleAfter) return Object.assign(base, { state: 'stale' }); // the dangerous one: nothing is running
      if (!r.ok) return Object.assign(base, { state: 'failed' });
      if (r.offsite_ok === 0) return Object.assign(base, { state: 'local-only' });
      return Object.assign(base, { state: 'ok' });
    };
    return { backup: show('backup', 36 * HOUR), drill: show('drill', 10 * DAY), offsite: !!offsiteDir, busy };
  }
  return { start, run, status, tick };
}

module.exports = { setup, encrypt, decrypt, keyFrom };

if (require.main === module) {
  const [cmd, input, output] = process.argv.slice(2);
  if (cmd !== 'decrypt' || !input || !output) {
    console.error('Usage: BACKUP_KEY=... node server/backup.js decrypt <file.yabbbak> <output>');
    process.exit(1);
  }
  const plain = decrypt(keyFrom(process.env.BACKUP_KEY), fs.readFileSync(input));
  // database backups are gzipped; receipts aren't
  const out = plain[0] === 0x1f && plain[1] === 0x8b ? zlib.gunzipSync(plain) : plain;
  fs.writeFileSync(output, out);
  console.log(`Wrote ${output} (${out.length} bytes).`);
}
