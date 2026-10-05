/* Zero Line storage. One interface, two backends:
   - cloud: the claude.ai artifact database (live sync between devices and people)
   - local: this browser only (preview / signed out)
   To move to another host later, write a third backend with the same shape.

   Layout (collections → documents):
     meta/cats      {items: {catId: cat}}
     meta/accounts  {items: {acctId: account}}
     meta/rules     {items: {key: {payee, cat}}}
     meta/settings  {currency, ...}
     months/<YYYY-MM> {assigned: {catId: cents}, moves: {id: move}}
     tx/<YYYY-MM>     {t: {txId: tx}}
   Deleted map entries are written as null. */
(function (root) {
  'use strict';
  const COLLS = ['meta', 'months', 'tx'];
  const LOCAL_KEY = 'zeroline-local-v1';

  const Store = {
    mode: 'loading', // 'cloud' | 'local'
    data: { meta: {}, months: {}, tx: {} },
    loaded: { meta: false, months: false, tx: false },
    status: 'idle', // 'idle' | 'saving' | 'error'
    error: null,
    db: null,
    assets: null,
    downloads: null,
    user: null,
    me: null,
    canWrite: true,
    _listeners: [],
    _queue: {},
    _exists: {},
  };

  Store.onChange = (fn) => Store._listeners.push(fn);
  const emit = (why) => Store._listeners.forEach((fn) => fn(why));

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function deepMerge(target, patch) {
    const out = isObj(target) ? Object.assign({}, target) : {};
    for (const k in patch) {
      const v = patch[k];
      out[k] = isObj(v) && isObj(out[k]) ? deepMerge(out[k], v) : (isObj(v) ? deepMerge({}, v) : v);
    }
    return out;
  }
  Store.deepMerge = deepMerge;
  function stripNulls(o) {
    if (!isObj(o)) return o;
    const out = {};
    for (const k in o) if (o[k] !== null && o[k] !== undefined) out[k] = isObj(o[k]) ? stripNulls(o[k]) : o[k];
    return out;
  }

  // ---------- init ----------
  Store.init = async function () {
    let db = null;
    try { db = window.claude && window.claude.use ? await window.claude.use('db') : null; } catch (e) { db = null; }
    if (!db) return initLocal();
    Store.db = db;
    Store.mode = 'cloud';
    try { Store.user = await window.claude.use('user'); } catch (e) { Store.user = null; }
    if (Store.user) {
      try { Store.me = await Store.user.me(); } catch (e) { /* stays null */ }
      try { const w = await Store.user.can('data.write'); if (w === false) Store.canWrite = false; } catch (e) { /* keep */ }
    }
    window.claude.use('assets').then((a) => { Store.assets = a; emit('caps'); }).catch(() => {});
    window.claude.use('downloads').then((d) => { Store.downloads = d; emit('caps'); }).catch(() => {});
    for (const c of COLLS) {
      db.collection(c).onSnapshot((snap) => {
        const next = {};
        for (const d of snap.docs) { next[d.id] = d.data(); Store._exists[c + '/' + d.id] = true; }
        // keep local edits that haven't reached the server yet
        for (const path in Store._queue) {
          const q = Store._queue[path];
          if (!path.startsWith(c + '/')) continue;
          const id = path.slice(c.length + 1);
          if (q.inflight) next[id] = deepMerge(next[id], q.inflight);
          if (q.patch) next[id] = deepMerge(next[id], q.patch);
        }
        Store.data[c] = next;
        Store.loaded[c] = true;
        emit('remote');
      }, (err) => {
        Store.status = 'error';
        Store.error = err && err.code === 'revoked' ? 'Access to this budget changed. Reload to continue.' : 'Lost the connection to your budget. Reload to reconnect.';
        emit('error');
      });
    }
    emit('mode');
  };

  function initLocal() {
    Store.mode = 'local';
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) Store.data = Object.assign({ meta: {}, months: {}, tx: {} }, JSON.parse(raw));
    } catch (e) { /* storage blocked: run in memory */ }
    COLLS.forEach((c) => (Store.loaded[c] = true));
    emit('mode');
  }
  function saveLocal() {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(Store.data)); } catch (e) { /* in-memory only */ }
  }

  Store.ready = () => COLLS.every((c) => Store.loaded[c]);

  // ---------- undo / redo ----------
  // Every write records how to reverse itself. Writes caused by one click, edit or key press form one step.
  Store.undoStack = [];
  Store.redoStack = [];
  let group = null, capture = null;
  Store.newStep = () => { group = null; };
  const clone = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));
  function inverseOf(old, patch) {
    const inv = {};
    for (const k in patch) {
      const pv = patch[k], ov = isObj(old) ? old[k] : undefined;
      inv[k] = isObj(pv) && isObj(ov) ? inverseOf(ov, pv) : clone(ov);
    }
    return inv;
  }
  function remember(coll, id, patch) {
    const step = { coll, id, patch: inverseOf(Store.data[coll][id], patch) };
    if (capture) { capture.push(step); return; }
    if (!group) {
      group = [];
      Store.undoStack.push(group);
      if (Store.undoStack.length > 100) Store.undoStack.shift();
    }
    Store.redoStack = [];
    group.push(step);
  }
  function replay(from, to) {
    const g = from.pop();
    if (!g) return null;
    capture = [];
    for (const w of g.slice().reverse()) Store.write(w.coll, w.id, w.patch);
    to.push(capture);
    capture = null;
    group = null;
    return g;
  }
  Store.undo = () => replay(Store.undoStack, Store.redoStack);
  Store.redo = () => replay(Store.redoStack, Store.undoStack);

  // ---------- writes ----------
  // patch merges into the document; nested objects merge, null removes an entry.
  Store.write = function (coll, id, patch) {
    remember(coll, id, patch);
    Store.data[coll][id] = deepMerge(Store.data[coll][id], patch); // optimistic
    if (Store.mode === 'local') { saveLocal(); emit('local'); return Promise.resolve(); }
    emit('local');
    const path = coll + '/' + id;
    const q = Store._queue[path] = Store._queue[path] || { patch: null, busy: null };
    q.patch = q.patch ? deepMerge(q.patch, patch) : patch;
    if (!q.busy) q.busy = flush(coll, id, q);
    return q.busy;
  };

  async function flush(coll, id, q) {
    const path = coll + '/' + id;
    Store.status = 'saving'; emit('status');
    while (q.patch) {
      const p = q.patch; q.patch = null; q.inflight = p;
      try {
        await writeOne(coll, id, p);
        q.inflight = null;
      } catch (e) {
        if (e && e.code === 'unavailable') {
          await new Promise((r) => setTimeout(r, 800 + Math.random() * 800));
          try { await writeOne(coll, id, p); q.inflight = null; continue; } catch (e2) { e = e2; }
        }
        Store.status = 'error';
        Store.error = errorText(e);
        q.busy = null; q.inflight = null;
        emit('status');
        throw e;
      }
    }
    q.busy = null; q.inflight = null;
    if (!Object.values(Store._queue).some((x) => x.busy)) Store.status = 'idle';
    emit('status');
  }

  async function writeOne(coll, id, patch) {
    const ref = Store.db.collection(coll).doc(id);
    const key = coll + '/' + id;
    if (!Store._exists[key]) {
      const snap = await ref.get();
      if (snap.exists) Store._exists[key] = true;
      else { await ref.set(stripNulls(patch)); Store._exists[key] = true; return; }
    }
    await ref.update(patch);
  }

  function errorText(e) {
    const c = e && e.code;
    if (c === 'invalid_argument') return Store.canWrite ? 'A change could not be saved. If this keeps happening, this month may have too many transactions for one record.' : 'You have view-only access, so changes are not saved.';
    if (c === 'quota_exceeded') return 'The budget database is full. Export a backup and remove old data.';
    if (c === 'resource_exhausted') return 'Saving too quickly. Wait a moment and try again.';
    if (c === 'revoked') return 'Access to this budget changed. Reload to continue.';
    return 'A change could not be saved. Check your connection and try again.';
  }

  // Replace a whole document (used by restore from backup).
  Store.replace = async function (coll, id, body) {
    Store.undoStack = []; Store.redoStack = []; group = null;
    Store.data[coll][id] = body;
    if (Store.mode === 'local') { saveLocal(); emit('local'); return; }
    emit('local');
    await Store.db.collection(coll).doc(id).set(stripNulls(body));
    Store._exists[coll + '/' + id] = true;
  };

  // ---------- reads ----------
  Store.items = (metaId) => {
    const doc = Store.data.meta[metaId];
    const out = {};
    if (doc && doc.items) for (const k in doc.items) if (doc.items[k]) out[k] = doc.items[k];
    return out;
  };
  Store.settings = () => Store.data.meta.settings || {};
  Store.allTx = () => {
    const out = [];
    for (const m in Store.data.tx) {
      const t = (Store.data.tx[m] || {}).t || {};
      for (const k in t) if (t[k]) out.push(t[k]);
    }
    return out;
  };
  Store.assignedByMonth = () => {
    const out = {};
    for (const m in Store.data.months) {
      const a = (Store.data.months[m] || {}).assigned || {};
      const row = {};
      for (const k in a) if (a[k]) row[k] = a[k];
      out[m] = row;
    }
    return out;
  };
  Store.moves = (m) => {
    const mv = ((Store.data.months[m] || {}).moves) || {};
    return Object.values(mv).filter(Boolean).sort((a, b) => b.ts - a.ts);
  };

  Store.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  root.Store = Store;
})(this);
