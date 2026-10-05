/* YNABB: a gentle step-by-step guide. Teaches the idea, sets up the budget, then shows how to use it.
   Written for someone who's never budgeted and doesn't like numbers: one idea per screen, tapping not typing, the app does the maths. */
(function () {
  'use strict';
  const KEY = 'zeroline-guide';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const Z = () => window.ZL;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (c) => Z().money(c);
  const whole = (c) => money(c).replace(/\.00$/, ''); // $100 rather than $100.00 in the lessons
  const parse = (v) => { const n = Z().E.parseMoney(String(v || '')); return Number.isNaN(n) ? 0 : Math.abs(n); };

  // ---------- remembered progress (on this device) ----------
  let st = load();
  function load() {
    try { return Object.assign({ i: 0, seen: {}, cats: null, amts: {}, freq: {}, debt: {}, debtFreq: {} }, JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch (e) { return { i: 0, seen: {}, cats: null, amts: {}, freq: {}, debt: {}, debtFreq: {} }; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* fine */ } }

  // ---------- the plan she picks from ----------
  const GROUPS = [
    { key: 'bills', name: 'Bills', kind: 'need', order: 1, freq: 'month', say: 'The ones that come every month or so.',
      items: [['Rent', 1], ['Electricity', 1], ['Gas', 0], ['Water', 0], ['Internet', 1], ['Phone', 1], ['Car insurance', 1], ['Health insurance', 0], ['Home & contents insurance', 0], ['Streaming & subscriptions', 1]] },
    { key: 'every', name: 'Everyday', kind: 'need', order: 2, freq: 'week', say: 'The things you buy all the time.',
      items: [['Groceries', 1], ['Fuel', 1], ['Kids', 0], ['Pets', 0], ['Chemist & doctor', 1], ['Household stuff', 1]] },
    { key: 'year', name: 'Once or twice a year', kind: 'need', order: 3, freq: 'year', say: 'The ones that sneak up on you.',
      items: [['Car rego', 1], ['Car servicing', 1], ['Christmas', 1], ['Birthdays & gifts', 1], ['School costs', 0], ['Holidays', 0]] },
    { key: 'fun', name: 'Fun', kind: 'want', order: 4, freq: 'month', say: 'Yes, fun is allowed. It\'s part of the plan.',
      items: [['Eating out & takeaway', 1], ['Clothes', 1], ['Hobbies', 0], ['My fun money', 1], ['Partner\'s fun money', 0]] },
    { key: 'save', name: 'Savings', kind: 'save', order: 5, freq: 'month', say: 'Money for future you.',
      items: [['Emergency fund', 1], ['Saving for something special', 0]] },
  ];
  const FREQ = [['week', 'a week', 52 / 12], ['fortnight', 'a fortnight', 26 / 12], ['month', 'a month', 1], ['quarter', 'every 3 months', 1 / 3], ['year', 'a year', 1 / 12]];
  const perMonth = (cents, f) => Math.ceil(cents * (FREQ.find((x) => x[0] === f) || FREQ[2])[2]);

  const ACCT_TYPES = [
    ['checking', 'Everyday bank account', 'Everyday account', 'has'],
    ['savings', 'Savings account', 'Savings', 'has'],
    ['cash', 'Cash in my wallet', 'Cash', 'has'],
    ['credit', 'Credit card', 'Credit card', 'owe'],
    ['bnpl', 'Afterpay or Zip', 'Afterpay', 'owe'],
    ['loan', 'Car or personal loan', 'Car loan', 'owe'],
    ['mortgage', 'Home loan', 'Home loan', 'owe'],
    ['ato', 'Money owed to the ATO', 'ATO payment plan', 'owe'],
    ['tracking', 'Super or investments', 'Super', 'track'],
  ];

  function chosen() {
    if (!st.cats) {
      st.cats = {};
      const hasHomeLoan = Object.values(Z().data().accounts).some((a) => a.type === 'loan' && /home|mortgage/i.test(a.name));
      for (const g of GROUPS) st.cats[g.key] = g.items.filter(([n, on]) => on && !(n === 'Rent' && hasHomeLoan)).map(([n]) => n);
      // the things she said she'd love become savings goals
      const fromDreams = (st.dreams || []).map((k) => (DREAMS.find((x) => x[0] === k) || [])[2]).filter(Boolean);
      if (st.dreamOwn) fromDreams.push(st.dreamOwn);
      for (const n of fromDreams) if (!st.cats.save.includes(n)) st.cats.save.push(n);
    }
    return st.cats;
  }
  const catIdByName = (name) => { const c = Object.values(Z().data().cats).find((k) => k.name === name && !k.debtFor); return c ? c.id : null; };

  // ---------- small pieces ----------
  const big = (t) => `<p class="g-big">${t}</p>`;
  const p = (t) => `<p>${t}</p>`;
  const soft = (t) => `<p class="g-soft">${t}</p>`;
  const tip = (t) => `<div class="g-tip"><b>Good to know</b>${t}</div>`;
  const ok = (t) => `<div class="g-ok" role="status">${t}</div>`;
  const freqSel = (id, cur) => `<select class="g-freq" data-freq="${esc(id)}" data-native="1" aria-label="How often">${FREQ.map(([k, l]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`;

  // ---------- the steps ----------
  // ch: which chapter. when(): show this step at all. body(): what's on the card. bind(card): make it work.
  // next(): runs when moving on; return false to stay.
  const CH = ['The idea', 'Day to day', 'Tricky months', 'Your money', 'Your plan', 'Using it'];
  const S = [];
  const step = (o) => S.push(o);

  // ---------- envelope pictures: little animations do the explaining ----------
  // an envelope with a label written on it, and (optionally) what's inside underneath
  const env = (label, amt, cls) => `<div class="ge ${cls || ''}"><svg viewBox="0 0 64 42"><rect x="1.5" y="1.5" width="61" height="39" rx="4"/><path d="M2.5 3.5 L32 23 L61.5 3.5"/></svg><span class="ge-l">${label}</span>${amt != null ? `<b class="ge-a">${amt}</b>` : ''}</div>`;
  // put something at x (a % across) and y (px down) in a picture
  const at = (x, y, html, style) => `<div class="gs-at" style="--x:${x}%;--y:${y}px;${style || ''}">${html}</div>`;
  // a bank note flying from one spot to another, after a delay
  const fly = (sx, sy, ex, ey, d, t, cls) => `<i class="gn ${cls || ''}" style="--sx:${sx}%;--sy:${sy}px;--ex:${ex}%;--ey:${ey}px;--d:${d}s;--t:${t || 1.1}s">$</i>`;
  // something that appears after a delay (and, with "out", disappears again later)
  const show = (d, html, out) => `<span class="gs-show" style="--d:${d}s${out != null ? `;--o:${out}s` : ''}"${out != null ? ' data-out' : ''}>${html}</span>`;
  const pic = (h, inner, still) => `<div class="gs" style="--h:${h}px" aria-hidden="true">${inner}</div>` + (still ? '' : '<button class="g-replay" data-replay>↻ Play again</button>');
  const XS = [12.5, 37.5, 62.5, 87.5];

  // ---- the idea ----
  step({ id: 'hello', ch: 0, title: 'Budgeting is simpler than you think', nextLabel: 'Show me',
    body: () => pic(110, XS.map((x, i) => at(x, 30, env(['Rent', 'Food', 'Power', 'Fun'][i]))).join(''), true) +
      big('It all comes down to envelopes. Let me show you.') +
      soft('Takes about 15 minutes. Stop any time and pick up where you left off.') });

  step({ id: 'gran', ch: 0, title: 'Picture your great-grandma on payday',
    body: () => {
      const names = ['Rent', 'Food', 'Power', 'Fun'], amts = ['$450', '$250', '$100', '$200'];
      return pic(186, at(50, 10, '<div class="gs-cash"><i></i><i></i><i></i><span>Payday</span></div>') +
        [0, 1, 2, 3, 4, 5, 6, 7].map((i) => fly(50, 40, XS[i % 4], 114, i * 0.32)).join('') +
        names.map((n, i) => at(XS[i], 112, env(n, show((i + 4) * 0.32 + 1.1, amts[i])))).join('')) +
        p('She\'d take her pay out as cash and split it into envelopes, <b>one for each thing she needed.</b>') +
        p('When the Food envelope ran empty, that was it until next payday.');
    } });

  step({ id: 'cat', ch: 0, title: 'YNABB works the same way',
    body: () => pic(128,
      [0, 1, 2].map((i) => fly(24, -20, 24, 52, i * 0.45, 1)).join('') +
      at(24, 8, '<small class="gs-cap">Her way</small>') + at(75, 8, '<small class="gs-cap">In YNABB</small>') +
      at(24, 36, env('Food', show(1.9, '$250'))) +
      at(50, 42, '<b class="gs-eq">=</b>') +
      at(75, 50, `<div class="gs-row"><span>Food</span>${show(1.9, '<b class="pill st-pos">$250</b>')}<div class="gs-bar"><i></i></div></div>`)) +
      p('Each <b>category</b> is an envelope, and the green bubble shows what\'s inside.') });

  const FILL = [['Rent', 450], ['Food', 250], ['Power', 100], ['Fun', 200]];
  const filled = () => st.fill || (st.fill = {});
  const onTable = () => 1000 - FILL.reduce((a, [n]) => a + (filled()[n] || 0), 0);
  step({ id: 'fill', ch: 0, title: 'Now you try',
    body: () => {
      const f = filled(), left = onTable();
      return p('You\'ve just been paid <b>$1,000</b>. Tap each envelope to fill it.') +
        `<div class="g-left ${left === 0 ? 'done' : ''}">On the table: <b>$${left}</b></div>` +
        `<div class="g-envs">${FILL.map(([n, need]) => `<button class="g-env ${f[n] ? 'on' : ''} ${st.fillJust === n ? 'just' : ''}" data-fillenv="${n}" ${f[n] ? 'disabled' : ''}>${env(n, f[n] ? '$' + f[n] + ' ✓' : 'needs $' + need)}</button>`).join('')}</div>` +
        (left === 0 ? ok('Every dollar has a home. <b>That\'s budgeting!</b>') + soft('In YNABB, money still waiting on the table is called <b>Ready to Assign</b>.') : '') +
        (Object.keys(f).length ? `<button class="g-link" data-act="refill">Start again</button>` : '');
    },
    bind: (card) => {
      $$('[data-fillenv]', card).forEach((b) => b.addEventListener('click', () => { const n = b.dataset.fillenv, need = FILL.find((x) => x[0] === n)[1]; filled()[n] = Math.min(need, onTable()); st.fillJust = n; save(); draw(); }));
      const r = $('[data-act="refill"]', card); if (r) r.addEventListener('click', () => { st.fill = {}; st.fillJust = null; save(); draw(); });
    },
    canNext: () => onTable() === 0, needMsg: 'Tap each envelope until the table is empty.' });

  const DREAMS = [['holiday', 'A holiday', 'Holiday'], ['calm', 'Less stress about bills', null], ['debt', 'Paying off what I owe', null], ['cushion', 'A safety cushion', 'Emergency fund'], ['treats', 'Treats without guilt', 'Treats'], ['house', 'A house deposit', 'House deposit'], ['car', 'A better car', 'New car'], ['kids', 'Things for the kids', 'Kids\' extras']];
  step({ id: 'dream', ch: 0, title: 'What would you love to save for?',
    body: () => {
      const d = st.dreams || (st.dreams = []);
      return p('Pick any you like, and they\'ll get envelopes too.') +
        `<div class="g-choices">${DREAMS.map(([k, l]) => `<button class="g-choice ${d.includes(k) ? 'on' : ''}" data-dream="${k}">${d.includes(k) ? '✓ ' : ''}${l}</button>`).join('')}</div>` +
        `<span class="g-own"><input id="g-dream-own" placeholder="Something else?" value="${esc(st.dreamOwn || '')}" aria-label="Something else you'd love"></span>`;
    },
    bind: (card) => {
      $$('[data-dream]', card).forEach((b) => b.addEventListener('click', () => { const d = st.dreams, i = d.indexOf(b.dataset.dream); if (i >= 0) d.splice(i, 1); else d.push(b.dataset.dream); save(); draw(); }));
      const o = $('#g-dream-own', card); if (o) o.addEventListener('change', () => { st.dreamOwn = o.value.trim(); save(); });
    } });

  // ---- day to day ----
  step({ id: 'spend', ch: 1, title: 'When you spend, the envelope empties',
    body: () => pic(122,
      at(28, 30, env('Food', show(0, '$250', 1.2) + show(1.3, '$180'))) +
      fly(28, 40, 76, 48, 0.2, 1.1) +
      at(76, 34, '<div class="gs-shop"><span class="gs-ic">🛒</span><small>Groceries $70</small></div>')) +
      p('Spend $70 on groceries and Food drops from $250 to $180. <b>YNABB does the sums for you.</b>') });

  step({ id: 'move', ch: 1, title: 'Run out? Borrow from another envelope',
    body: () => pic(122,
      at(26, 30, env('Food', show(0, '<span class="neg">−$30</span>', 1.4) + show(1.5, '$0 ✓'))) +
      fly(74, 40, 26, 40, 0.3, 1.2, 'arc') +
      at(74, 30, env('Fun', show(0, '$200', 1.4) + show(1.5, '$170')))) +
      p('Overspent on food? Move a bit across from Fun. <b>Plans change, and that\'s fine.</b>') });

  step({ id: 'rego', ch: 1, title: 'Big bills get a little each month',
    body: () => pic(150,
      Array.from({ length: 12 }, (_, i) => fly(50, -18, 50, 30, i * 0.28, 0.8)).join('') +
      at(50, 26, env('Car rego', show(4, '$900 ready ✓'))) +
      at(50, 114, '<div class="gs-months">' + 'JFMAMJJASOND'.split('').map((m, i) => `<i style="--d:${i * 0.28 + 0.6}s">${m}</i>`).join('') + '</div>')) +
      p('Rego is <b>$900 a year</b>, so its envelope gets <b>$75 a month</b>. When the bill arrives, the money\'s waiting.') });

  step({ id: 'notyet', ch: 1, title: 'Only use money you\'ve already got',
    body: () => pic(112, at(30, 24, env('Fun', '$0')) + at(72, 30, '<div class="gs-ghost">$<small>Thursday\'s pay</small></div>'), true) +
      p('Pay coming on Thursday? <b>Wait until it lands</b>, then fill your envelopes.') });

  // ---- tricky months ----
  const ORDER = [['Rent', 100], ['Food', 100], ['Power', 100], ['Fuel', 60], ['Fun', 0]];
  step({ id: 'uneven', ch: 2, title: 'Paid in bits? Fill the essentials first',
    body: () => pic(188, ORDER.map(([n, pct], i) => at(50, 8 + i * 37, `<div class="gs-line"><span>${n}</span><div class="gs-bar"><i style="--w:${pct}%;--d:${i * 0.7}s"></i></div></div>`, 'width:86%')).join('')) +
      p('Rent, food, power and getting to work come first. <b>Everything else gets what\'s left.</b>') });

  step({ id: 'short', ch: 2, title: 'When there isn\'t enough to go around',
    body: () => `<ul class="g-wins"><li>Put fun and savings on hold for now</li><li>Call anyone you owe early. Most will help.</li><li>Try not to cover the gap with a credit card</li></ul>` +
      p('<b>Knowing</b> you\'re short is far less scary than not knowing.') });

  step({ id: 'ahead', ch: 2, title: 'Got some spare? Start on next month',
    body: () => pic(194,
      at(50, 6, '<small class="gs-cap">This month</small>') +
      [25, 50, 75].map((x, i) => at(x, 22, env(['Rent', 'Food', 'Power'][i], '✓'))).join('') +
      at(50, 98, '<small class="gs-cap">Next month</small>') +
      [25, 50, 75].map((x, i) => fly(x, 60, x, 124, i * 0.5, 1)).join('') +
      [25, 50, 75].map((x, i) => at(x, 114, env(['Rent', 'Food', 'Power'][i], show(i * 0.5 + 1, '✓')))).join('')) +
      p('Fill next month\'s envelopes a bit at a time, and one day <b>payday stops being stressful</b>.') });

  step({ id: 'card', ch: 2, title: 'Paying by card works the same way',
    body: () => pic(122,
      at(26, 30, env('Food', show(0, '$250', 1.2) + show(1.3, '$180'))) +
      fly(26, 40, 74, 40, 0.2, 1.1) +
      at(50, 10, '<span class="gs-ic">💳</span>') +
      at(74, 30, env('Visa', show(0, '$0', 1.2) + show(1.3, '$70')))) +
      p('Spend $70 on the Visa and $70 moves from Food into the <b>Visa envelope</b>, ready for the bill.') +
      p('Paying off debts? Pay the minimum on each, and put any extra on <b>one at a time</b>.') });

  step({ id: 'recap', ch: 2, title: 'That\'s really all there is to it',
    body: () => `<div class="g-cards">
        <div>${env('', null, 'mini')}<span>On payday, fill your envelopes</span></div>
        <div>${env('', null, 'mini')}<span>Spending comes out of them</span></div>
        <div>${env('', null, 'mini')}<span>Run out? Borrow from another</span></div>
        <div>${env('', null, 'mini')}<span>Big bills get a little each month</span></div>
        <div>${env('', null, 'mini')}<span>Got spare? Start on next month</span></div>
      </div>` + p('Now let\'s set up <b>your</b> envelopes.') });

  // ---- your money ----
  const hasStuff = () => { const d = Z().data(); return Object.keys(d.accounts).length > 0 || Object.keys(d.cats).length > 0; };
  // decided once, when the guide is first opened, so adding accounts later doesn't bring this back
  step({ id: 'fresh', ch: 3, title: 'There\'s already something in here', when: () => (st.hadStuff == null ? (st.hadStuff = hasStuff()) : st.hadStuff) && !st.freshDone,
    body: () => p('This budget already has some accounts or categories in it.') +
      `<div class="g-choices col"><button class="g-choice ${st.fresh === 'keep' ? 'on' : ''}" data-fresh="keep">Keep it, and add to it</button><button class="g-choice ${st.fresh === 'clear' ? 'on' : ''}" data-fresh="clear">Start with a clean, empty budget</button></div>` +
      (st.fresh === 'clear' ? `<div class="g-hm">This removes everything in this budget, for everyone who uses it. <button class="g-link" data-act="backup">Download a copy first</button> if you might want it back.<div class="g-row"><button class="g-btn danger" data-act="clear">Yes, empty it and start fresh</button></div></div>` : ''),
    bind: (card) => {
      $$('[data-fresh]', card).forEach((b) => b.addEventListener('click', () => { st.fresh = b.dataset.fresh; save(); draw(); }));
      const bk = $('[data-act="backup"]', card); if (bk) bk.addEventListener('click', () => Z().backup());
      const cl = $('[data-act="clear"]', card);
      if (cl) cl.addEventListener('click', async () => { cl.disabled = true; cl.textContent = 'Emptying\u2026'; await Z().startFresh(); st.freshDone = true; st.cats = null; st.at = 'accts'; save(); draw(true); });
    },
    canNext: () => st.fresh === 'keep' });

  step({ id: 'accts', ch: 3, title: 'Where does your money live?',
    body: () => {
      const d = Z().data();
      const list = Object.values(d.accounts).filter((a) => !a.closed);
      const t = ACCT_TYPES.find((x) => x[0] === st.atype);
      return p('Add each bank account, and anything you owe. <b>Close enough is fine.</b>') +
        (list.length ? `<ul class="g-accts">${list.map((a) => { const b = (d.bal[a.id] || {}).balance || 0, owe = Z().DEBT_TYPES[a.type]; return `<li><span>${esc(a.name)}</span><b class="${owe ? 'owe' : ''}">${owe ? 'owe ' + money(-b) : money(b)}</b><button class="g-x" data-rm="${a.id}" aria-label="Remove ${esc(a.name)}" title="Remove">\u00D7</button></li>`; }).join('')}</ul>` : '') +
        `<div class="g-add">
          <p class="g-q">${list.length ? 'Anything else?' : 'What\'s the first one?'}</p>
          <div class="g-choices">${ACCT_TYPES.map(([k, l]) => `<button class="g-choice sm ${st.atype === k ? 'on' : ''}" data-atype="${k}">${l}</button>`).join('')}</div>
          ${t ? `<div class="g-form">
            <label>What do you call it?<input id="g-aname" value="${esc(st.aname || t[2])}" autocomplete="off"></label>
            <label>${t[3] === 'owe' ? 'How much do you owe on it?' : t[3] === 'track' ? 'Roughly how much is in it?' : 'How much is in it right now?'}<span class="g-money"><i>$</i><input id="g-aamt" inputmode="decimal" placeholder="0" autocomplete="off"></span></label>
            <button class="g-btn" data-act="addacct">Add it</button>
            ${t[3] === 'track' ? soft('Kept separate. Not for spending.') : t[3] === 'owe' ? soft('We\'ll make a plan to pay it down.') : ''}
          </div>` : ''}
        </div>`;
    },
    bind: (card) => {
      $$('[data-atype]', card).forEach((b) => b.addEventListener('click', () => { st.atype = b.dataset.atype; st.aname = ''; save(); draw(); setTimeout(() => { const n = $('#g-aamt'); if (n) n.focus(); }, 30); }));
      $$('[data-rm]', card).forEach((b) => b.addEventListener('click', async () => { await Z().removeAccount(b.dataset.rm); draw(); }));
      const add = $('[data-act="addacct"]', card);
      const doAdd = async () => {
        const t = ACCT_TYPES.find((x) => x[0] === st.atype);
        const name = ($('#g-aname').value || '').trim() || t[2];
        const amt = parse($('#g-aamt').value);
        add.disabled = true;
        const type = t[0] === 'mortgage' || t[0] === 'ato' ? 'loan' : t[0];
        await Z().addAccount({ name, type, amount: amt });
        st.atype = null; st.aname = ''; save(); draw();
        Z().toast(`Added ${name}`);
      };
      if (add) add.addEventListener('click', doAdd);
      const amt = $('#g-aamt', card); if (amt) amt.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
      const nm = $('#g-aname', card); if (nm) nm.addEventListener('input', () => { st.aname = nm.value; save(); });
    },
    canNext: () => Object.keys(Z().data().accounts).length > 0, needMsg: 'Add at least one account first. Your everyday bank account is a good start.' });

  step({ id: 'total', ch: 3, title: 'Here\'s where you\'re starting',
    body: () => {
      const d = Z().data(), accts = Object.values(d.accounts);
      const has = accts.filter((a) => a.type !== 'tracking' && !Z().DEBT_TYPES[a.type]).reduce((s, a) => s + ((d.bal[a.id] || {}).balance || 0), 0);
      const owe = accts.filter((a) => Z().DEBT_TYPES[a.type]).reduce((s, a) => s - ((d.bal[a.id] || {}).balance || 0), 0);
      return `<div class="g-stat"><span>Money you can plan with</span><b>${money(has)}</b></div>` +
        (owe > 0 ? `<div class="g-stat owe"><span>What you owe</span><b>${money(owe)}</b></div>` + p('That\'s okay. Knowing the number is the hard part, and it\'s done.') : '') +
        p('Next, let\'s set up your envelopes.');
    } });

  // ---- your plan ----
  step({ id: 'cats', ch: 4, title: 'Which envelopes do you need?',
    body: () => {
      const c = chosen();
      return p('Tap the ones that fit your life. <b>You can change them any time.</b>') +
        GROUPS.map((g) => `<div class="g-group"><h3>${g.name} <small>${g.say}</small></h3><div class="g-choices">${g.items.map(([n]) => `<button class="g-choice sm ${c[g.key].includes(n) ? 'on' : ''}" data-cat="${g.key}" data-n="${esc(n)}">${c[g.key].includes(n) ? '\u2713 ' : ''}${esc(n)}</button>`).join('')}${c[g.key].filter((n) => !g.items.some(([x]) => x === n)).map((n) => `<button class="g-choice sm on" data-cat="${g.key}" data-n="${esc(n)}">\u2713 ${esc(n)}</button>`).join('')}<span class="g-own"><input data-own="${g.key}" placeholder="+ add your own" aria-label="Add your own to ${g.name}"></span></div></div>`).join('');
    },
    bind: (card) => {
      $$('[data-cat]', card).forEach((b) => b.addEventListener('click', () => {
        const l = chosen()[b.dataset.cat], n = b.dataset.n, i = l.indexOf(n);
        if (i >= 0) l.splice(i, 1); else l.push(n);
        save(); draw();
      }));
      $$('[data-own]', card).forEach((inp) => inp.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || !inp.value.trim()) return;
        e.preventDefault();
        const l = chosen()[inp.dataset.own], n = inp.value.trim();
        if (!l.includes(n)) l.push(n);
        save(); draw();
        const again = $(`[data-own="${inp.dataset.own}"]`); if (again) again.focus();
      }));
    },
    next: async () => {
      // anything typed in an "add your own" box counts too
      $$('[data-own]').forEach((inp) => { const n = inp.value.trim(); if (n && !chosen()[inp.dataset.own].includes(n)) chosen()[inp.dataset.own].push(n); });
      save();
      await Z().addCategories(GROUPS.map((g) => ({ name: g.name, kind: g.kind, order: g.order, cats: chosen()[g.key] })));
    } });

  // one screen of amounts per group, so it's never a wall of boxes
  const AMT_SAY = {
    bills: ['What do your bills cost?', 'A rough guess is fine.'],
    every: ['And the everyday things?', 'A normal week or month. Guess away.'],
    year: ['The once-a-year ones', 'Roughly what each costs a year. We\'ll split it into monthly bits.'],
    fun: ['How much for fun?', 'This money is yours to enjoy, guilt-free.'],
    save: ['Saving for future you', 'Even $20 a month counts.'],
  };
  for (const g of GROUPS) {
    step({ id: 'amt-' + g.key, ch: 4, title: AMT_SAY[g.key][0], when: () => chosen()[g.key].length > 0,
      body: () => {
        const rows = chosen()[g.key].map((n) => {
          const k = g.key + ':' + n, f = st.freq[k] || g.freq, v = st.amts[k] || '';
          const m = parse(v) ? perMonth(parse(v), f) : 0;
          return `<div class="g-amt"><span class="g-amt-n">${esc(n)}</span><span class="g-money"><i>$</i><input data-amt="${esc(k)}" inputmode="decimal" placeholder="0" value="${esc(v)}" autocomplete="off" aria-label="${esc(n)} amount"></span>${freqSel(k, f)}<span class="g-pm-out" data-out="${esc(k)}">${m && f !== 'month' ? `\u2248 ${money(m)} a month` : ''}</span></div>`;
        }).join('');
        return soft(AMT_SAY[g.key][1]) + `<div class="g-amts">${rows}</div>` + soft('Leave any blank if you don\'t know yet.');
      },
      bind: (card) => {
        const upd = (k) => { const f = st.freq[k] || g.freq, v = parse(st.amts[k]); const o = $(`[data-out="${CSS.escape(k)}"]`, card); if (o) o.textContent = v && f !== 'month' ? `\u2248 ${money(perMonth(v, f))} a month` : ''; };
        $$('[data-amt]', card).forEach((i) => i.addEventListener('input', () => { st.amts[i.dataset.amt] = i.value; save(); upd(i.dataset.amt); }));
        $$('[data-freq]', card).forEach((s) => s.addEventListener('change', () => { st.freq[s.dataset.freq] = s.value; save(); upd(s.dataset.freq); }));
      },
      next: async () => {
        for (const n of chosen()[g.key]) {
          const k = g.key + ':' + n, v = parse(st.amts[k]), id = catIdByName(n);
          if (id && v) await Z().setMonthly(id, perMonth(v, st.freq[k] || g.freq));
        }
      } });
  }

  const debts = () => Object.values(Z().data().accounts).filter((a) => Z().DEBT_TYPES[a.type] && !a.closed);
  step({ id: 'debts', ch: 4, title: 'Paying what you owe', when: () => debts().length > 0,
    body: () => p('How much do you pay on each? For a card, use the <b>minimum</b> on your statement.') +
      `<div class="g-amts">${debts().map((a) => {
        const f = st.debtFreq[a.id] || (a.type === 'bnpl' ? 'fortnight' : 'month'), v = st.debt[a.id] || '';
        const m = parse(v) ? perMonth(parse(v), f) : 0;
        return `<div class="g-amt"><span class="g-amt-n">${esc(a.name)}</span><span class="g-money"><i>$</i><input data-debt="${a.id}" inputmode="decimal" placeholder="0" value="${esc(v)}" autocomplete="off" aria-label="${esc(a.name)} payment"></span>${freqSel('d:' + a.id, f)}<span class="g-pm-out" data-dout="${a.id}">${m && f !== 'month' ? `\u2248 ${money(m)} a month` : ''}</span></div>`;
      }).join('')}</div>` + soft('These envelopes always get filled first.'),
    bind: (card) => {
      const upd = (id) => { const f = st.debtFreq[id] || 'month', v = parse(st.debt[id]); const o = $(`[data-dout="${id}"]`, card); if (o) o.textContent = v && f !== 'month' ? `\u2248 ${money(perMonth(v, f))} a month` : ''; };
      $$('[data-debt]', card).forEach((i) => i.addEventListener('input', () => { st.debt[i.dataset.debt] = i.value; save(); upd(i.dataset.debt); }));
      $$('[data-freq^="d:"]', card).forEach((s) => s.addEventListener('change', () => { const id = s.dataset.freq.slice(2); st.debtFreq[id] = s.value; save(); upd(id); }));
    },
    next: async () => {
      for (const a of debts()) {
        const v = parse(st.debt[a.id]);
        if (v) await Z().setDebtPayment(a.id, perMonth(v, st.debtFreq[a.id] || (a.type === 'bnpl' ? 'fortnight' : 'month')));
      }
    } });

  step({ id: 'assign', ch: 4, title: 'Time to fill your envelopes',
    body: () => {
      const d = Z().data(), m = d.month, plan = Z().plan();
      if (st.assigned) {
        const left = m.rta, still = m.underTotal;
        const ef = catIdByName('Emergency fund');
        return ok('Done! Your envelopes are filled.') +
          (still > 0 ? p(`You\'re <b>${money(still)}</b> short for now, which is really common. The important envelopes were filled first, and the rest can wait for payday.`) : '') +
          (left > 0 ? p(`<b>${money(left)}</b> is still on the table. Lovely!`) + `<div class="g-choices col">${ef ? `<button class="g-choice" data-act="toef">Put it in my Emergency fund</button>` : ''}<button class="g-choice" data-act="keep">Leave it for now. I\'ll decide later.</button></div>` : '') +
          (left === 0 && still === 0 ? p('Every envelope is full. Great place to be.') : '');
      }
      return `<div class="g-stat"><span>On the table</span><b>${money(m.rta)}</b></div>` +
        p(`Your envelopes need <b>${money(m.underTotal)}</b> this month. Tap below and YNABB fills them for you, most important first.`) +
        `<div class="g-row"><button class="g-btn big" data-act="fund" ${plan && Object.keys(plan.changes).length ? '' : 'disabled'}>Fill my envelopes</button></div>` +
        (m.rta <= 0 ? soft('There\'s nothing on the table right now. Come back to this step on payday.') : '');
    },
    bind: (card) => {
      const f = $('[data-act="fund"]', card);
      if (f) f.addEventListener('click', async () => { f.disabled = true; await Z().fundTargets(); st.assigned = true; save(); draw(); });
      const ef = $('[data-act="toef"]', card);
      if (ef) ef.addEventListener('click', async () => { const id = catIdByName('Emergency fund'); await Z().assign(id, Z().data().month.rta); Z().toast('Added to your Emergency fund'); draw(); });
      const k = $('[data-act="keep"]', card); if (k) k.addEventListener('click', () => go(1));
    } });

  step({ id: 'planned', ch: 4, title: 'Your envelopes are ready',
    body: () => big('That was the hardest part, and it\'s done.') +
      p('Your budget is set up. You can see it any time on the <b>Budget</b> page.') +
      p('Last up: what to do each week. It\'s quick, promise.') +
      `<div class="g-row"><button class="g-link" data-act="peek">Have a look at my budget first</button></div>`,
    bind: (card) => { const b = $('[data-act="peek"]', card); if (b) b.addEventListener('click', () => showMe('budget', '.bud', 'This is your budget. Each line is an envelope.')); } });

  // ---- using it ----
  step({ id: 'u-spend', ch: 5, title: 'Keep YNABB up to date',
    body: () => p('Bring in your spending from the bank, or tap <b>Add</b>. YNABB takes it out of the right envelope.') +
      `<div class="g-row"><button class="g-btn ghost" data-show="add">Show me Add</button></div>`,
    show: { add: ['tx', '[data-action="add-tx"]', 'Tap Add to put in something you\'ve bought.'] } });

  step({ id: 'import', ch: 5, title: 'Bringing in from your bank',
    body: () => `<ol class="g-steps"><li>In your bank, find <b>Export</b> or <b>Download transactions</b>.</li><li>Choose <b>CSV</b> or <b>QIF</b>.</li><li>In YNABB, tap <b>Import from bank</b>.</li></ol>` +
      soft('YNABB skips anything it already has.') +
      `<div class="g-row"><button class="g-btn ghost" data-show="imp">Show me where</button></div>`,
    show: { imp: ['tx', '[data-action="import"]', 'Import from bank is here.'] } });

  step({ id: 'review', ch: 5, title: 'Pop each one in its envelope',
    body: () => p('New spending waits for you. Tap it and choose its envelope.') +
      soft('YNABB learns as you go, so Woolies soon lands in Groceries on its own.') });

  step({ id: 'red', ch: 5, title: 'Red means an envelope\'s empty',
    body: () => p('Tap the red amount and move money across from another envelope, just like before.') +
      `<div class="g-row"><button class="g-btn ghost" data-show="avail">Show me where</button></div>`,
    show: { avail: ['budget', '.bud-head span:last-child', 'This column is what\'s in each envelope. Tap an amount to move money.'] } });

  step({ id: 'match', ch: 5, title: 'Check it matches your bank',
    body: () => p('Every week or two, tap <b>Reconcile</b> and enter your bank balance. YNABB shows you anything that\'s missing.') +
      `<div class="g-row"><button class="g-btn ghost" data-show="rec">Show me where</button></div>`,
    show: { rec: ['tx', '[data-action="rec-pop"]', 'Reconcile is here. Type the balance your banking app shows.'] } });

  step({ id: 'payday', ch: 5, title: 'On payday, fill your envelopes',
    body: () => p('Your pay waits in <b>Ready to Assign</b> at the top of the Budget page. Tap <b>Fund targets</b> and YNABB fills your envelopes for you.') +
      `<div class="g-row"><button class="g-btn ghost" data-show="rta">Show me where</button></div>`,
    show: { rta: ['budget', '.rta, .rta-banner, [class*="rta"]', 'Ready to Assign: money waiting for an envelope.'] } });

  step({ id: 'forward', ch: 5, title: 'Got spare? Start on next month',
    body: () => p('Use the arrow at the top to go to <b>next month</b>, then tap <b>Fund targets</b>.') +
      `<div class="g-row"><button class="g-btn ghost" data-show="fwd">Show me where</button></div>`,
    show: { fwd: ['budget', '[data-action="next-month"]', 'This arrow goes to next month.'] } });

  step({ id: 'routine', ch: 5, title: 'Twice a week, about 10 minutes', nextLabel: 'Finish',
    body: () => `<ol class="g-check"><li><b>Bring in</b> your spending</li><li><b>Pop each one</b> in its envelope</li><li><b>Fix any red</b> by moving money</li><li><b>Payday:</b> fill your envelopes</li></ol>` +
      dreamsLine() + big('You\'ve got this.') + soft('You can come back to this guide any time from the Guide button.') });

  function dreamsLine() {
    const names = (st.dreams || []).map((k) => (DREAMS.find((x) => x[0] === k) || [])[1]).filter(Boolean);
    if (st.dreamOwn) names.push(st.dreamOwn);
    return names.length ? `<div class="g-tip"><b>You\'re on your way to</b>${names.map(esc).join(' \u00B7 ')}</div>` : '';
  }

  // ---------- drawing ----------
  let root = null;
  const visible = () => S.filter((s) => !s.when || s.when());
  // the place is kept by the step's name, so steps appearing or disappearing never move you
  function cur() {
    const v = visible();
    let s = v.find((x) => x.id === st.at);
    if (!s) { const all = S.findIndex((x) => x.id === st.at); s = all >= 0 ? (S.slice(all).find((x) => v.includes(x)) || v[v.length - 1]) : v[0]; }
    st.at = s.id;
    return s;
  }
  function go(d) {
    const v = visible(), at = v.indexOf(cur());
    st.at = v[Math.max(0, Math.min(v.length - 1, at + d))].id;
    save(); draw(true);
  }
  function jumpTo(ch) {
    const s = visible().find((x) => x.ch === ch);
    if (s) { st.at = s.id; save(); draw(true); }
  }
  function draw(top) {
    if (!root) return;
    const v = visible(), s = cur(), at = v.indexOf(s);
    const chs = CH.map((n, i) => {
      const steps = v.filter((x) => x.ch === i);
      const done = steps.length && v.indexOf(steps[steps.length - 1]) < at;
      return `<button class="g-ch ${s.ch === i ? 'on' : ''} ${done ? 'done' : ''}" data-ch="${i}">${done ? '\u2713 ' : ''}${n}</button>`;
    }).join('');
    const inCh = v.filter((x) => x.ch === s.ch), pos = inCh.indexOf(s);
    root.innerHTML = `<div class="g-top">
        <div class="g-brand">YNABB guide</div>
        <nav class="g-chs" aria-label="Chapters">${chs}</nav>
        <button class="g-close" data-act="close" title="Close. Your place is saved." aria-label="Close the guide">Close</button>
      </div>
      <div class="g-wrap"><article class="g-card" aria-live="polite">
        <div class="g-dots" aria-hidden="true">${inCh.map((x, i) => `<i class="${i < pos ? 'done' : i === pos ? 'on' : ''}"></i>`).join('')}</div>
        <h2>${s.title}</h2>
        <div class="g-body">${s.body()}</div>
        <div class="g-need" hidden></div>
        <div class="g-foot">
          ${at > 0 ? '<button class="g-back" data-act="back">Back</button>' : '<span></span>'}
          <button class="g-btn big" data-act="next">${s.nextLabel || 'Next'}</button>
        </div>
      </article></div>`;
    const card = $('.g-card', root);
    if (s.bind) s.bind(card);
    // replay a picture by swapping in a fresh copy, which restarts its animations
    $$('[data-replay]', card).forEach((b) => b.addEventListener('click', () => { const g = b.previousElementSibling; g.replaceWith(g.cloneNode(true)); }));
    $$('[data-show]', card).forEach((b) => b.addEventListener('click', () => { const [view, sel, text] = s.show[b.dataset.show]; showMe(view, sel, text); }));
    const chOn = $('.g-ch.on', root), chs2 = $('.g-chs', root); // keep this chapter in view when the names scroll sideways
    if (chOn && chs2.scrollWidth > chs2.clientWidth) chs2.scrollLeft = chOn.offsetLeft - chs2.offsetLeft - (chs2.clientWidth - chOn.offsetWidth) / 2;
    $$('[data-ch]', root).forEach((b) => b.addEventListener('click', () => jumpTo(Number(b.dataset.ch))));
    $('[data-act="close"]', root).addEventListener('click', close);
    const back = $('[data-act="back"]', root); if (back) back.addEventListener('click', () => go(-1));
    $('[data-act="next"]', root).addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      if (s.canNext && !s.canNext()) { const n = $('.g-need', root); n.textContent = s.needMsg || 'Choose one to carry on.'; n.hidden = false; return; }
      if (s.next) { btn.disabled = true; btn.textContent = 'Saving\u2026'; try { if (await s.next() === false) { btn.disabled = false; return; } } catch (err) { btn.disabled = false; btn.textContent = s.nextLabel || 'Next'; Z().toast('Something didn\'t save. Try again.'); return; } }
      st.seen[s.id] = 1;
      if (at === v.length - 1) { st.finished = true; st.at = null; st.hadStuff = null; save(); close(); Z().go('budget'); Z().toast('All set up. Nice work!'); return; }
      go(1);
    });
    if (top) { root.scrollTop = 0; const h = $('h2', root); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
  }

  function open() {
    clearSpot();
    if (!root) {
      root = document.createElement('div');
      root.id = 'zl-guide';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', 'YNABB guide');
      document.body.appendChild(root);
    }
    root.hidden = false;
    document.documentElement.classList.add('noscroll');
    draw(true);
  }
  function close() {
    if (root) root.hidden = true;
    document.documentElement.classList.remove('noscroll');
    Z().render();
  }

  // ---------- "show me": point at the real thing ----------
  let spot = null;
  function clearSpot() {
    if (!spot) return;
    spot.el && spot.el.classList.remove('zl-spot');
    spot.bar.remove();
    spot = null;
  }
  function showMe(view, sel, text) {
    close();
    Z().go(view);
    setTimeout(() => {
      clearSpot();
      const el = sel.split(',').map((x) => $(x.trim())).find(Boolean);
      const bar = document.createElement('div');
      bar.className = 'zl-spotbar';
      bar.innerHTML = `<span>${esc(text)}</span><button class="g-btn" data-act="back">Back to the guide</button>`;
      document.body.appendChild(bar);
      spot = { el, bar };
      if (el) { el.classList.add('zl-spot'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      bar.querySelector('button').addEventListener('click', open);
    }, 120);
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root && !root.hidden) { e.stopPropagation(); close(); }
  }, true);

  window.ZLGuide = { open, close };

  // ---------- looks ----------
  const css = document.createElement('style');
  css.textContent = `
#zl-guide { position: fixed; inset: 0; z-index: 150; background: var(--bg); overflow-y: auto; color: var(--ink); font-size: 16.5px; line-height: 1.55; }
#zl-guide[hidden] { display: none; }
.g-top { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: calc(10px + env(safe-area-inset-top, 0px)) 18px 10px; background: color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter: blur(6px); border-bottom: 1px solid var(--line); }
.g-brand { font: 700 15px var(--display); }
.g-chs { display: flex; gap: 4px; flex-wrap: wrap; flex: 1; justify-content: center; }
.g-ch { border: 0; background: none; font: 600 13px var(--ui); color: var(--muted); padding: 5px 10px; border-radius: 99px; cursor: pointer; }
.g-ch.on { background: var(--ink); color: var(--bg); }
.g-ch.done { color: var(--good); }
.g-close { border: 1px solid var(--line); background: var(--surface); border-radius: 99px; padding: 5px 14px; font: 600 13px var(--ui); color: var(--ink); cursor: pointer; }
.g-wrap { padding: 28px 16px calc(40px + env(safe-area-inset-bottom, 0px)); }
.g-card { max-width: 640px; margin: 0 auto; background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 26px 28px 22px; box-shadow: 0 6px 30px rgba(23, 59, 72, .08); }
.g-card h2 { font: 700 26px/1.2 var(--display); letter-spacing: -.01em; margin: 6px 0 14px; outline: none; }
.g-dots { display: flex; gap: 6px; }
.g-dots i { width: 22px; height: 4px; border-radius: 2px; background: var(--line); }
.g-dots i.done { background: color-mix(in srgb, var(--accent) 50%, var(--line)); }
.g-dots i.on { background: var(--accent); }
.g-body p { margin: 0 0 12px; }
.g-big { font: 600 19px/1.4 var(--display); }
.g-soft { color: var(--muted); font-size: 15px; }
.g-tip { background: var(--accent-soft); border-radius: 12px; padding: 12px 14px; margin: 12px 0; font-size: 15px; }
.g-tip b { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: .07em; color: var(--accent); margin-bottom: 2px; }
.g-ok { background: var(--good-soft); color: var(--ink); border-radius: 12px; padding: 12px 14px; margin: 12px 0; border-left: 4px solid var(--good); }
.g-hm { background: var(--warn-soft); border-radius: 12px; padding: 12px 14px; margin: 12px 0; border-left: 4px solid var(--need); }
.g-choices { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 12px; align-items: center; }
.g-choices.col { flex-direction: column; align-items: stretch; }
.g-choice { border: 1.5px solid var(--line); background: var(--surface); border-radius: 12px; padding: 10px 16px; font: 600 15px var(--ui); color: var(--ink); cursor: pointer; text-align: left; }
.g-choice small { font-weight: 400; color: var(--muted); margin-left: 4px; }
.g-choice.sm { padding: 7px 12px; font-size: 14px; border-radius: 99px; }
.g-choice:hover { border-color: var(--accent); }
.g-choice.on { border-color: var(--accent); background: var(--accent-soft); }
.g-btn { border: 0; background: var(--accent); color: var(--accent-ink); border-radius: 12px; padding: 10px 18px; font: 700 15px var(--ui); cursor: pointer; }
.g-btn.big { padding: 12px 26px; font-size: 16px; }
.g-btn.ghost { background: var(--surface); color: var(--accent); border: 1.5px solid var(--accent); }
.g-btn.danger { background: var(--bad); color: var(--on-bad); }
.g-btn:disabled { opacity: .5; cursor: default; }
.g-link { border: 0; background: none; color: var(--accent); font: 600 15px var(--ui); text-decoration: underline; cursor: pointer; padding: 0; }
.g-row { display: flex; gap: 10px; flex-wrap: wrap; margin: 12px 0; }
.g-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 22px; padding-top: 16px; border-top: 1px solid var(--line); }
.g-back { border: 0; background: none; font: 600 15px var(--ui); color: var(--muted); cursor: pointer; padding: 8px 4px; }
.g-need { background: var(--warn-soft); border-radius: 10px; padding: 8px 12px; margin-top: 12px; font-size: 15px; }
.g-steps, .g-check { padding-left: 22px; margin: 6px 0 14px; }
.g-steps li, .g-check li { margin: 6px 0; }
.g-check { list-style: none; padding-left: 0; }
.g-check li { padding: 10px 14px; background: var(--surface-2); border-radius: 10px; }
.g-left { text-align: center; font-size: 17px; padding: 10px; border-radius: 12px; background: var(--warn-soft); }
.g-left b { font: 700 22px var(--display); }
.g-left.done { background: var(--good-soft); }
.g-cards { display: grid; gap: 6px; margin: 6px 0 16px; }
.g-wins { list-style: none; padding: 0; margin: 8px 0 14px; display: grid; gap: 6px; }
.g-wins li { padding: 9px 14px 9px 36px; background: var(--good-soft); border-radius: 10px; position: relative; }
.g-wins li::before { content: '\u2713'; position: absolute; left: 14px; color: var(--good); font-weight: 700; }
.g-cards > div { display: flex; gap: 12px; align-items: center; background: var(--surface-2); border-radius: 12px; padding: 9px 14px; font-weight: 600; }
.g-stat { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; background: var(--good-soft); border-radius: 12px; padding: 14px 16px; margin: 8px 0; }
.g-stat b { font: 700 26px var(--display); }
.g-stat.owe { background: var(--goal-soft); }
.g-stat.owe b { color: var(--goal); }
.g-accts { list-style: none; padding: 0; margin: 4px 0 14px; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.g-accts li { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-top: 1px solid var(--line); }
.g-accts li:first-child { border-top: 0; }
.g-accts li span { flex: 1; font-weight: 600; }
.g-accts li b.owe { color: var(--goal); }
.g-x { border: 0; background: none; color: var(--muted); font-size: 20px; cursor: pointer; width: 30px; height: 30px; border-radius: 50%; }
.g-x:hover { background: var(--surface-2); }
.g-add { background: var(--surface-2); border-radius: 14px; padding: 12px 14px; }
.g-q { font-weight: 700; margin: 0 0 4px !important; }
.g-form { display: grid; gap: 10px; margin-top: 6px; }
.g-form label { display: grid; gap: 4px; font-weight: 600; font-size: 15px; }
.g-form input, .g-money input { font: 16px var(--ui); padding: 10px 12px; border: 1.5px solid var(--line); border-radius: 10px; background: var(--surface); color: var(--ink); width: 100%; box-sizing: border-box; }
.g-form input:focus, .g-money input:focus { border-color: var(--accent); outline: none; }
.g-form .g-btn { justify-self: start; }
.g-money { position: relative; display: block; }
.g-money i { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); font-style: normal; color: var(--muted); }
.g-money input { padding-left: 24px; }
.g-group { margin: 14px 0 6px; }
.g-group h3 { font-size: 16px; margin: 0 0 2px; }
.g-group h3 small { font-weight: 400; color: var(--muted); font-size: 14px; margin-left: 6px; }
.g-own input { border: 1.5px dashed var(--line); border-radius: 99px; padding: 7px 12px; font: 14px var(--ui); background: none; color: var(--ink); width: 150px; }
.g-own input:focus { border-color: var(--accent); outline: none; border-style: solid; }
.g-amts { display: grid; gap: 8px; margin: 10px 0; }
.g-amt { display: grid; grid-template-columns: minmax(0, 1.3fr) 120px 150px; gap: 8px; align-items: center; }
.g-amt-n { font-weight: 600; }
.g-amt .g-pm-out { grid-column: 2 / -1; font-size: 13px; color: var(--muted); margin-top: -4px; }
.g-amt .g-pm-out:empty { display: none; }
.g-freq { font: 15px var(--ui); padding: 9px 10px; border: 1.5px solid var(--line); border-radius: 10px; background: var(--surface); color: var(--ink); }
/* envelope pictures */
.gs { position: relative; height: var(--h); background: var(--surface-2); border-radius: 14px; overflow: hidden; margin: 4px 0 2px; }
.gs-at { position: absolute; left: var(--x); top: var(--y); transform: translateX(-50%); white-space: nowrap; text-align: center; }
.ge { position: relative; width: 68px; display: inline-block; text-align: center; }
.ge svg { display: block; width: 68px; height: 45px; }
.ge rect { fill: #F3E3C3; stroke: #C29A5B; stroke-width: 1.5; }
.ge path { fill: none; stroke: #C29A5B; stroke-width: 1.5; stroke-linejoin: round; }
.ge-l { position: absolute; left: 0; right: 0; top: 26px; font: 700 11.5px var(--ui); color: #6B4A1E; overflow: hidden; text-overflow: ellipsis; padding: 0 4px; }
.ge-a { display: grid; justify-items: center; margin-top: 3px; min-height: 20px; font: 700 15px var(--display); color: var(--ink); }
.ge-a > * { grid-area: 1 / 1; }
.ge.mini { width: 34px; flex: none; }
.ge.mini svg { width: 34px; height: 23px; }
.neg { color: var(--bad); }
.gn { position: absolute; z-index: 2; left: var(--sx); top: var(--sy); width: 30px; height: 18px; margin-left: -15px; border-radius: 3px; background: #6FAE6A; border: 1px solid #4E8A4A; color: #fff; font: 700 11px/16px var(--ui); text-align: center; font-style: normal; opacity: 0; animation: gs-fly var(--t) ease-in-out var(--d) both; }
.gn.arc { animation-name: gs-arc; }
@keyframes gs-fly { 0% { left: var(--sx); top: var(--sy); opacity: 0; } 12% { opacity: 1; } 75% { left: var(--ex); top: var(--ey); opacity: 1; } 100% { left: var(--ex); top: var(--ey); opacity: 0; } }
@keyframes gs-arc { 0% { left: var(--sx); top: var(--sy); opacity: 0; } 12% { opacity: 1; } 40% { left: calc((var(--sx) + var(--ex)) / 2); top: calc(var(--sy) - 34px); } 75% { left: var(--ex); top: var(--ey); opacity: 1; } 100% { left: var(--ex); top: var(--ey); opacity: 0; } }
.gs-show { opacity: 0; animation: gs-in .4s ease var(--d) forwards; }
.gs-show[data-out] { animation: gs-in .3s ease var(--d) forwards, gs-out .3s ease var(--o) forwards; }
@keyframes gs-in { to { opacity: 1; } }
@keyframes gs-out { from { opacity: 1; } to { opacity: 0; } }
.gs-cash { position: relative; width: 64px; height: 50px; }
.gs-cash i { position: absolute; left: 4px; width: 56px; height: 28px; border-radius: 4px; background: #6FAE6A; border: 1px solid #4E8A4A; }
.gs-cash i:nth-child(1) { top: 0; transform: rotate(-6deg); }
.gs-cash i:nth-child(2) { top: 3px; transform: rotate(4deg); }
.gs-cash i:nth-child(3) { top: 6px; }
.gs-cash span { position: absolute; left: 50%; top: 38px; transform: translateX(-50%); font: 700 12px var(--ui); color: var(--muted); }
.gs-eq { font: 700 40px/1 var(--display); color: var(--muted); }
.gs-row { width: 132px; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px 9px; display: grid; grid-template-columns: 1fr auto; gap: 7px 6px; align-items: center; text-align: left; font-weight: 600; font-size: 14px; }
.gs-row .pill { min-width: 0; font-size: 13px; }
.gs-row .gs-bar { grid-column: 1 / -1; }
.gs-bar { height: 5px; border-radius: 3px; background: var(--line); overflow: hidden; }
.gs-bar i { display: block; height: 100%; width: 0; border-radius: 3px; background: var(--good); animation: gs-w 1s ease var(--d, 1.9s) forwards; }
@keyframes gs-w { to { width: var(--w, 100%); } }
.gs-line { display: grid; grid-template-columns: 54px 1fr; gap: 10px; align-items: center; text-align: left; font-weight: 600; font-size: 14px; }
.gs-line .gs-bar { height: 10px; border-radius: 5px; }
.gs-shop { display: grid; justify-items: center; gap: 4px; }
.gs-shop small { font-size: 12px; color: var(--muted); }
.gs-ic { font-size: 30px; line-height: 1; }
.gs-ghost { display: grid; justify-items: center; gap: 2px; width: 82px; padding: 8px 0 6px; border: 2px dashed var(--muted); border-radius: 8px; color: var(--muted); font: 700 18px var(--display); animation: gs-pulse 1.8s ease-in-out infinite; }
.gs-ghost small { font: 600 11px var(--ui); }
@keyframes gs-pulse { 50% { opacity: .35; } }
.gs-months { display: flex; gap: 3px; }
.gs-months i { width: 17px; height: 20px; border-radius: 4px; background: var(--accent-soft); color: var(--accent); font: 700 11px/20px var(--ui); font-style: normal; opacity: 0; animation: gs-in .3s ease var(--d) forwards; }
.gs-cap { font: 700 11px var(--ui); text-transform: uppercase; letter-spacing: .07em; color: var(--muted); }
.g-replay { display: block; margin: 0 0 10px auto; border: 0; background: none; color: var(--muted); font: 600 13px var(--ui); cursor: pointer; padding: 2px 0; }
.g-replay:hover { color: var(--accent); }
.g-envs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0 12px; }
.g-env { border: 1.5px solid var(--line); background: var(--surface); border-radius: 12px; padding: 10px 4px 6px; cursor: pointer; color: var(--ink); }
.g-env:hover:not(:disabled) { border-color: var(--accent); }
.g-env:disabled { cursor: default; }
.g-env.on { border-color: var(--good); background: var(--good-soft); }
.g-env .ge-a { font-size: 13px; white-space: nowrap; }
.g-env:not(.on) .ge-a { color: var(--muted); font-weight: 600; font-family: var(--ui); }
.g-env.just .ge { animation: gs-pop .45s ease; }
@keyframes gs-pop { 40% { transform: scale(1.12); } }
@media (max-width: 560px) { .g-envs { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) { .gs *, .g-env .ge { animation-duration: .01s !important; animation-delay: 0s !important; animation-iteration-count: 1 !important; } .g-replay { display: none; } }
@media (max-width: 560px) {
  .g-card { padding: 20px 18px 18px; border-radius: 14px; }
  .g-card h2 { font-size: 22px; }
  .g-amt { grid-template-columns: 1fr 1fr; }
  .g-amt-n { grid-column: 1 / -1; }
  .g-brand { display: none; }
  .g-top { flex-wrap: nowrap; }
  .g-chs { justify-content: flex-start; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
  .g-chs::-webkit-scrollbar { display: none; }
  .g-ch { white-space: nowrap; flex: none; }
}
.zl-spot { position: relative; z-index: 5; outline: 3px solid var(--accent) !important; outline-offset: 4px; border-radius: 10px; animation: zl-pulse 1.6s ease-in-out infinite; }
@keyframes zl-pulse { 0%, 100% { outline-color: var(--accent); } 50% { outline-color: color-mix(in srgb, var(--accent) 30%, transparent); } }
.zl-spotbar { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(16px + env(safe-area-inset-bottom, 0px)); z-index: 140; display: flex; gap: 14px; align-items: center; flex-wrap: wrap; justify-content: center; max-width: min(640px, calc(100vw - 32px)); background: var(--ink); color: var(--bg); padding: 12px 14px 12px 18px; border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,.25); font-size: 15px; }
@media (prefers-reduced-motion: reduce) { .zl-spot { animation: none; } }
`;
  document.head.appendChild(css);
})();
