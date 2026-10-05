/* Zero Line: turn a YNAB export (Plan/Budget CSV + Register CSV) into a Zero Line budget. */
(function (root) {
  'use strict';
  const E = root.ZeroEngine || root.Engine;
  const INCOME = '_income';
  const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

  const cents = (s) => {
    const neg = /^\s*-|\(.*\)/.test(String(s || ''));
    const v = Math.round(parseFloat(String(s || '').replace(/[^0-9.]/g, '') || '0') * 100);
    return neg ? -v : v;
  };
  const monthKey = (s) => { // "Mar 2022" -> 2022-03
    const m = String(s).trim().match(/^([A-Za-z]{3})[A-Za-z]*\s+(\d{4})$/);
    return m && MON[m[1].toLowerCase()] ? m[2] + '-' + String(MON[m[1].toLowerCase()]).padStart(2, '0') : null;
  };
  function table(text) {
    const rows = E.parseCSV(text);
    const head = (rows.shift() || []).map((h) => h.trim().toLowerCase());
    return rows.map((r) => { const o = {}; head.forEach((h, i) => { o[h] = r[i] == null ? '' : r[i]; }); return o; });
  }
  const pick = (o, ...keys) => { for (const k of keys) if (k in o) return o[k]; return ''; };

  // Which file is which: the plan has Month + Assigned/Budgeted, the register has Account + Outflow
  function kindOf(text) {
    const first = String(text).replace(/^﻿/, '').split(/\r?\n/)[0].toLowerCase();
    if (/"?account"?/.test(first) && /outflow/.test(first)) return 'register';
    if (/"?month"?/.test(first) && /(assigned|budgeted)/.test(first)) return 'plan';
    return null;
  }

  function convert(planText, regText, opt) {
    opt = opt || {};
    const uid = opt.uid || (() => Math.random().toString(36).slice(2, 12));
    const plan = planText ? table(planText) : [];
    const reg = regText ? table(regText) : [];
    const warn = [];

    // ---------- categories, in YNAB's order ----------
    const cats = {}, groupId = {}, catId = {};
    let gOrder = 0;
    const skipGroup = (g) => /^(inflow|internal master category)$/i.test(g.trim());
    function ensure(group, name) {
      group = (group || '').trim(); name = (name || '').trim();
      if (!group || !name || skipGroup(group)) return null;
      const hidden = /^hidden categories$/i.test(group);
      const gName = hidden ? 'Hidden' : group;
      if (!groupId[gName]) {
        const id = uid();
        groupId[gName] = id;
        cats[id] = { id, name: gName, parent: null, order: ++gOrder, hidden: hidden, target: null, note: '', kind: null, linked: null };
      }
      const key = group + '\u0000' + name;
      if (!catId[key]) {
        const id = uid(), parent = groupId[gName];
        const sib = Object.values(cats).filter((c) => c.parent === parent).length;
        catId[key] = id;
        cats[id] = { id, name, parent, order: sib + 1, hidden: hidden, target: null, note: '', kind: null, linked: null };
      }
      return catId[key];
    }
    function catOf(row) {
      const g = pick(row, 'category group'), c = pick(row, 'category');
      const full = pick(row, 'category group/category', 'master category/sub category');
      if (/^inflow$/i.test(g.trim()) || /ready to assign|to be budgeted/i.test(c) || /^inflow:/i.test(full)) return INCOME;
      if (!g && !c) {
        if (!full) return null;
        const i = full.indexOf(': ');
        return i > 0 ? ensure(full.slice(0, i), full.slice(i + 2)) : null;
      }
      return ensure(g, c);
    }

    // ---------- plan: assigned per month, YNAB's available to check against ----------
    const assigned = {}, ynabAvail = {}, months = new Set();
    for (const r of plan) {
      const m = monthKey(pick(r, 'month'));
      if (!m) continue;
      const id = catOf(r);
      if (!id || id === INCOME) continue;
      months.add(m);
      const a = cents(pick(r, 'assigned', 'budgeted'));
      if (a) (assigned[m] = assigned[m] || {})[id] = a;
      (ynabAvail[m] = ynabAvail[m] || {})[id] = cents(pick(r, 'available'));
    }

    // ---------- accounts ----------
    const acctRows = {};
    for (const r of reg) { const a = pick(r, 'account').trim(); if (a) (acctRows[a] = acctRows[a] || []).push(r); }
    const accounts = {}, acctId = {};
    let aOrder = 0;
    for (const name of Object.keys(acctRows)) {
      const rows = acctRows[name];
      // a budget account has categorized transactions; one with none is a tracking account
      const onBudget = rows.some((r) => pick(r, 'category group/category', 'category', 'category group').trim());
      const id = uid();
      acctId[name] = id;
      let type = 'tracking';
      if (onBudget) type = /sav/i.test(name) ? 'savings' : /credit|card|visa|amex|mastercard/i.test(name) ? 'credit' : /cash|wallet/i.test(name) ? 'cash' : 'checking';
      accounts[id] = { id, name, type, closed: false, order: ++aOrder };
    }

    // ---------- credit cards: YNAB's "Credit Card Payments" group has one category per card ----------
    const debt = {};
    for (const id in cats) {
      const c = cats[id], g = c.parent && cats[c.parent];
      if (!g || !/^credit card payments$/i.test(g.name)) continue;
      const a = Object.values(accounts).find((x) => x.name === c.name);
      if (!a) continue;
      a.type = 'credit'; c.debtFor = a.id; debt[a.id] = id;
    }
    for (const id in cats) if (!cats[id].parent && /^credit card payments$/i.test(cats[id].name)) { cats[id].name = 'Debt payments'; cats[id].order = 0; }

    // ---------- transactions ----------
    const dates = reg.map((r) => pick(r, 'date'));
    const fmt = E.guessDateFormat(dates) || opt.dateFormat || 'dmy';
    const clearedOf = (s) => (/reconciled/i.test(s) ? 'r' : /^cleared/i.test(s) ? 'c' : 'u');
    const now = opt.now || Date.now();
    const tx = [];
    const SPLIT = /^Split \((\d+)\/(\d+)\)\s*/;
    for (let i = 0; i < reg.length; i++) {
      const r = reg[i];
      const acct = acctId[pick(r, 'account').trim()];
      if (!acct) continue;
      const date = E.parseDate(pick(r, 'date'), fmt);
      if (!date) { warn.push('Skipped a row with an unreadable date: ' + pick(r, 'date')); continue; }
      const amt = cents(pick(r, 'inflow')) - cents(pick(r, 'outflow'));
      const payee = pick(r, 'payee').trim();
      let memo = pick(r, 'memo').trim();
      const sp = memo.match(SPLIT);
      const base = { id: uid(), acct, date, payee: payee || null, cat: null, amt, bank: null, memo: null, cleared: clearedOf(pick(r, 'cleared')), approved: true, by: null, ts: now, _payee: payee };
      if (sp) {
        // the lines of one split sit together: same account, date and payee
        const n = Number(sp[2]);
        const lines = [r];
        while (lines.length < n && i + 1 < reg.length) {
          const nx = reg[i + 1];
          if (pick(nx, 'account') !== pick(r, 'account') || pick(nx, 'date') !== pick(r, 'date') || pick(nx, 'payee') !== pick(r, 'payee') || !SPLIT.test(pick(nx, 'memo'))) break;
          lines.push(nx); i++;
        }
        base.splits = lines.map((l) => ({ cat: catOf(l), amt: cents(pick(l, 'inflow')) - cents(pick(l, 'outflow')), memo: pick(l, 'memo').replace(SPLIT, '').trim() || null, _payee: pick(l, 'payee') }));
        base.amt = base.splits.reduce((s, p) => s + p.amt, 0);
        // a split line that is a transfer can't be kept as a transfer inside a split
        base.splits.forEach((p) => { if (/^Transfer : /.test(p._payee)) p.memo = (p.memo ? p.memo + ' · ' : '') + p._payee; delete p._payee; });
        tx.push(base);
        continue;
      }
      if (/^\uD83D\uDD39\s*/.test(memo)) { base.bank = memo.replace(/^\uD83D\uDD39\s*/, '').replace(/\s+/g, ' ').trim(); memo = ''; }
      if (memo) base.memo = memo;
      base.cat = catOf(r);
      if (/^Starting Balance$/i.test(payee)) {
        base.payee = 'Starting balance';
        if (debt[acct] && (!base.cat || base.cat === INCOME)) base.cat = '_start'; // owed before the budget began
      }
      tx.push(base);
    }

    // ---------- transfers ----------
    const xferName = (t) => { const m = (t._payee || '').match(/^Transfer : (.+)$/); return m ? m[1].trim() : null; };
    const used = new Set();
    let pairs = 0;
    for (const t of tx) {
      if (used.has(t.id) || t.splits) continue;
      const other = xferName(t);
      if (!other || !acctId[other]) continue;
      const fromName = accounts[t.acct].name;
      const mate = tx.find((o) => !used.has(o.id) && o !== t && o.acct === acctId[other] && o.amt === -t.amt && o.date === t.date && xferName(o) === fromName);
      if (!mate) continue;
      used.add(t.id); used.add(mate.id);
      const bothBudget = (accounts[t.acct].type === 'tracking') === (accounts[mate.acct].type === 'tracking');
      if (bothBudget && !t.cat && !mate.cat) {
        t.transfer = mate.acct; t.pair = mate.id; mate.transfer = t.acct; mate.pair = t.id;
        pairs++;
      }
      // budget <-> tracking: the budget side keeps its category, like in YNAB
    }
    tx.forEach((t) => { delete t._payee; if (!t.splits) t.splits = null; t.transfer = t.transfer || null; t.pair = t.pair || null; });

    // ---------- overspending ----------
    // YNAB clears a category's overspending at the end of the month and takes it from Ready to Assign the next month.
    // Zero Line keeps it in the category until it's covered, so cover it the next month the same way YNAB did.
    const moves = {};
    const allMonths = [...months].sort();
    let covered = 0;
    for (const m of allMonths) {
      const row = ynabAvail[m];
      for (const id in row) {
        if (row[id] >= 0) continue;
        const next = E.addMonths(m, 1);
        if (!months.has(next)) continue;
        const amt = -row[id];
        const a = assigned[next] = assigned[next] || {};
        a[id] = (a[id] || 0) + amt;
        const mid = uid();
        (moves[next] = moves[next] || {})[mid] = { id: mid, from: INCOME, to: id, amt, ts: Date.parse(next + '-01T00:00:00'), by: 'ynab', note: 'Overspending from ' + m + ' (YNAB took this from Ready to Assign)' };
        covered++;
      }
    }

    // ---------- targets: "add $X every month", from what was usually assigned ----------
    const lastMonths = allMonths.filter((m) => assigned[m] && Object.keys(assigned[m]).length).slice(-6);
    const targets = {};
    for (const id in cats) {
      if (!cats[id].parent) continue;
      const seen = {}, vals = [];
      for (const m of lastMonths) {
        let v = (assigned[m] || {})[id] || 0;
        const mv = Object.values(moves[m] || {}).filter((x) => x.to === id).reduce((s, x) => s + x.amt, 0);
        v -= mv;
        if (v > 0) { vals.push(v); seen[v] = (seen[v] || 0) + 1; }
      }
      if (!vals.length) continue;
      let best = vals[vals.length - 1], n = seen[best];
      for (let k = vals.length - 1; k >= 0; k--) if (seen[vals[k]] > n) { best = vals[k]; n = seen[best]; }
      targets[id] = { amount: best, times: n, of: lastMonths.length };
    }

    // ---------- documents ----------
    const monthDocs = {};
    const ms = new Set(Object.keys(assigned).concat(Object.keys(moves)));
    for (const m of ms) monthDocs[m] = { assigned: assigned[m] || {}, moves: moves[m] || {} };
    const txDocs = {};
    for (const t of tx) { const m = t.date.slice(0, 7); (txDocs[m] = txDocs[m] || { t: {} }).t[t.id] = t; }

    // check: rebuild the latest month and compare every category's available with YNAB's
    const check = { months: allMonths.length, mismatched: [] };
    const lastM = allMonths[allMonths.length - 1];
    if (lastM && E.computeMonth) {
      const track = new Set(Object.values(accounts).filter((a) => a.type === 'tracking').map((a) => a.id));
      const assignedByMonth = {};
      for (const m in monthDocs) assignedByMonth[m] = monthDocs[m].assigned;
      for (const m of allMonths) {
        const M = E.computeMonth({ cats, tx: tx.filter((t) => !track.has(t.acct)), assigned: assignedByMonth, debt }, m);
        for (const id in ynabAvail[m]) {
          const got = M.rows[id] ? M.rows[id].available : 0;
          if (got !== ynabAvail[m][id]) check.mismatched.push({ month: m, cat: cats[id].name, ynab: ynabAvail[m][id], zero: got });
        }
        if (m === lastM) { check.rta = M.rta; check.uncategorized = M.uncategorized; check.uncategorizedAmt = M.uncategorizedAmt; }
      }
    }

    const bal = {};
    for (const t of tx) bal[t.acct] = (bal[t.acct] || 0) + t.amt;
    // when each account was last reconciled in YNAB, and its balance then
    for (const id in accounts) {
      const rec = tx.filter((t) => t.acct === id && t.cleared === 'r').map((t) => t.date).sort();
      if (!rec.length) continue;
      const last = rec[rec.length - 1];
      accounts[id].reconciledAt = last;
      accounts[id].reconciledBalance = tx.filter((t) => t.acct === id && t.cleared === 'r').reduce((s2, t) => s2 + t.amt, 0);
    }
    const dated = tx.map((t) => t.date).sort();
    return {
      data: { meta: { cats: { items: cats }, accounts: { items: accounts } }, months: monthDocs, tx: txDocs },
      cats, accounts, targets, balances: bal,
      report: {
        txCount: tx.length, splits: tx.filter((t) => t.splits).length, transfers: pairs, covered,
        from: dated[0], to: dated[dated.length - 1], firstMonth: allMonths[0], lastMonth: lastM,
        groups: Object.values(cats).filter((c) => !c.parent).length, categories: Object.values(cats).filter((c) => c.parent).length,
        check, warn, dateFormat: fmt,
      },
    };
  }

  const api = { convert, kindOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.YNAB = api;
})(typeof self !== 'undefined' ? self : this);
