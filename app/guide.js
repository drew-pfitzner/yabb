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
  const CH = ['Welcome', 'Why bother', 'Practice', 'Uneven pay', 'Your money', 'Your plan', 'Using it'];
  const S = [];
  const step = (o) => S.push(o);

  step({ id: 'hello', ch: 0, title: 'Hi! Let\'s sort out your money, together.', nextLabel: 'Let\'s start',
    body: () => big('This isn\'t a maths test. YNABB does all the adding up for you.') +
      p('Your only job is to decide what your money is <b>for</b>. That\'s it.') +
      p('We\'ll go one small step at a time:') +
      `<ol class="g-chapters"><li><b>Why bother</b>: what a plan can do for you</li><li><b>Practice</b>: try it on a pretend person first. Nothing real, nothing to break.</li><li><b>Uneven pay</b>: what to do when money comes in bits and pieces</li><li><b>Your money</b>: where your money is, and what you owe</li><li><b>Your plan</b>: what your money is for</li><li><b>Using it</b>: the few things you\'ll do each week</li></ol>` +
      soft('About 35 minutes all up. You can close this any time. It remembers where you were.') });

  // ---- why bother ----
  step({ id: 'yes', ch: 1, title: 'A budget doesn\'t say no. It says yes, on purpose.',
    body: () => big('Knowing your numbers is a superpower.') +
      p('When you know where your money is going, you stop wondering "can I afford this?" You <b>know</b>. And you can say yes to the things you really care about, without the guilt or the 2am worry.') +
      `<ul class="g-wins">
        <li>Booking the holiday, knowing it\'s already paid for</li>
        <li>Christmas without the January dread</li>
        <li>Saying yes to the school excursion straight away</li>
        <li>The car breaks down, and it\'s annoying, not a crisis</li>
        <li>Watching a debt shrink, month by month</li>
      </ul>` +
      p('That\'s what this is for. Not less fun. <b>More choice.</b>') });

  const DREAMS = [['holiday', 'A holiday', 'Holiday'], ['calm', 'Less stress about bills', null], ['debt', 'Paying off what I owe', null], ['cushion', 'A safety cushion', 'Emergency fund'], ['treats', 'Treats without guilt', 'Treats'], ['house', 'A house deposit', 'House deposit'], ['car', 'A better car', 'New car'], ['kids', 'Things for the kids', 'Kids\' extras']];
  step({ id: 'dream', ch: 1, title: 'What would you love your money to do?',
    body: () => {
      const d = st.dreams || (st.dreams = []);
      return p('Tap as many as you like. There are no wrong answers.') +
        `<div class="g-choices">${DREAMS.map(([k, l]) => `<button class="g-choice ${d.includes(k) ? 'on' : ''}" data-dream="${k}">${d.includes(k) ? '\u2713 ' : ''}${l}</button>`).join('')}</div>` +
        `<p class="g-q">Something else?</p><span class="g-own"><input id="g-dream-own" placeholder="e.g. A new couch" value="${esc(st.dreamOwn || '')}" aria-label="Something else you'd love"></span>` +
        (d.length || st.dreamOwn ? ok('Lovely. We\'ll build these into your plan, so they actually happen.') : '');
    },
    bind: (card) => {
      $$('[data-dream]', card).forEach((b) => b.addEventListener('click', () => { const d = st.dreams, i = d.indexOf(b.dataset.dream); if (i >= 0) d.splice(i, 1); else d.push(b.dataset.dream); save(); draw(); }));
      const o = $('#g-dream-own', card); if (o) o.addEventListener('change', () => { st.dreamOwn = o.value.trim(); save(); draw(); });
    } });

  // ---- practice with a pretend person ----
  // Sam's pretend budget lives only in the guide. Nothing real changes.
  const SAM = [
    ['Rent', 500, 'need'], ['Groceries', 250, 'need'], ['Phone', 50, 'need'],
    ['Car rego', 75, 'need', '$900 a year, so $75 a month'], ['Fun', 100, 'want'], ['Weekend away', 0, 'dream', 'Sam\'s dream'],
  ];
  const samJobs = () => st.sam || (st.sam = Object.fromEntries(SAM.map(([n]) => [n, 0])));
  const samLeft = () => 1200 - Object.values(samJobs()).reduce((a, b) => a + b, 0);
  const IDEAL = { Rent: 500, Groceries: 250, Phone: 50, 'Car rego': 75, Fun: 100, 'Weekend away': 225 };
  const samTable = (opts) => {
    const j = opts && opts.ideal ? IDEAL : samJobs(), left = samLeft();
    return `<div class="g-sam">${SAM.map(([n, want, kind, note]) => {
      const v = j[n] + (opts && opts.spent && opts.spent[n] ? -opts.spent[n] : 0);
      return `<div class="g-sam-row ${v < 0 ? 'red' : ''} ${kind === 'dream' ? 'dream' : ''}">
        <span class="g-sam-n">${n}${note ? `<small>${note}</small>` : ''}</span>
        ${opts && opts.edit ? `<button class="g-pm" data-sam="${n}" data-d="-25" aria-label="Take $25 from ${n}" ${j[n] <= 0 ? 'disabled' : ''}>\u2212</button>` : ''}
        <b class="g-sam-v">${v < 0 ? '\u2212$' + (-v) : '$' + v}</b>
        ${opts && opts.edit ? `<button class="g-pm" data-sam="${n}" data-d="25" aria-label="Give $25 to ${n}" ${left <= 0 ? 'disabled' : ''}>+</button>${want && j[n] < want ? `<button class="g-fill" data-fill="${n}">Fill to $${want}</button>` : !want && left > 0 ? `<button class="g-fill" data-rest="${n}">Give it the rest</button>` : `<span></span>`}` : ''}
      </div>`;
    }).join('')}</div>`;
  };

  step({ id: 'sam', ch: 2, title: 'Meet Sam',
    body: () => p('Before your real numbers, let\'s practise on a pretend person. Nothing you do here is real, and nothing can break.') +
      `<div class="g-person"><div class="g-face" aria-hidden="true">S</div><div><b>This is Sam.</b> Sam has never really budgeted. Money comes in, money goes out, and Sam\'s never quite sure where it went.<br><br>Sam just got paid. There\'s <b>$1,200</b> in the bank. And Sam would love a <b>weekend away</b> one day, about $600.</div></div>` +
      p('Let\'s help Sam make a plan.') });

  step({ id: 'sam-jobs', ch: 2, title: 'Give every dollar a job',
    body: () => {
      const left = samLeft();
      return p('Here\'s the big idea: when money comes in, you give <b>every dollar</b> a job, until there\'s none left without one.') +
        p('Help Sam. Tap <b>Fill</b> for each thing Sam needs, then give the rest to the weekend away.') +
        samTable({ edit: true }) +
        `<div class="g-left ${left === 0 ? 'done' : ''}">Still needs a job: <b>$${left}</b></div>` +
        (left === 0 ? ok(`That\'s it. That\'s budgeting. Every dollar knows what it\'s for, and the weekend away already has <b>$${samJobs()['Weekend away']}</b>.`) : '');
    },
    bind: (card) => {
      $$('[data-sam]', card).forEach((b) => b.addEventListener('click', () => { const j = samJobs(), d = Number(b.dataset.d); j[b.dataset.sam] = Math.max(0, j[b.dataset.sam] + Math.min(d, samLeft())); save(); draw(); }));
      $$('[data-rest]', card).forEach((b) => b.addEventListener('click', () => { samJobs()[b.dataset.rest] += samLeft(); save(); draw(); }));
      $$('[data-fill]', card).forEach((b) => b.addEventListener('click', () => { const j = samJobs(), n = b.dataset.fill, want = SAM.find((x) => x[0] === n)[1]; j[n] += Math.min(want - j[n], samLeft()); save(); draw(); }));
    },
    canNext: () => samLeft() === 0, needMsg: 'Give all of Sam\'s $1,200 a job first. Tip: whatever\'s left can go to the weekend away.' });

  step({ id: 'sam-rego', ch: 2, title: 'Did you spot the car rego?',
    body: () => p('Sam\'s rego only comes once a year: <b>$900</b>. That used to be a nasty shock.') +
      p('So Sam puts <b>$75</b> aside every month instead. By the time the bill comes, the $900 is sitting there waiting.') +
      ok('Big bills, made small. Christmas, birthdays, car service, insurance: they all work this way.') });

  step({ id: 'now', ch: 2, title: 'Only the money you have right now',
    body: () => p('Sam\'s next pay comes on Thursday. Can Sam give it jobs today?') +
      `<div class="g-choices"><button class="g-choice ${st.q1 === 'yes' ? 'on' : ''}" data-q1="yes">Yes</button><button class="g-choice ${st.q1 === 'no' ? 'on' : ''}" data-q1="no">Not yet</button></div>` +
      (st.q1 === 'no' ? ok('Exactly. When it lands, then it gets jobs. That way you never plan with money that isn\'t there yet.') : st.q1 === 'yes' ? `<div class="g-hm">Close! It\'s not in the bank yet, so it waits. When it lands on Thursday, then it gets its jobs.</div>` : ''),
    bind: (card) => $$('[data-q1]', card).forEach((b) => b.addEventListener('click', () => { st.q1 = b.dataset.q1; save(); draw(); })) });

  step({ id: 'sam-over', ch: 2, title: 'Uh oh, Sam overspent',
    body: () => {
      const moved = st.samMv;
      return p('Two weeks later, Sam\'s groceries came to <b>$280</b>, not $250. Groceries is <b>$30 in the red</b>.') +
        p('This happens to <b>everyone</b>. It\'s not a fail. Sam just moves $30 from somewhere else. Where should it come from?') +
        samTable({ ideal: true, spent: { Groceries: moved ? 250 : 280, ...(moved ? { [moved]: 30 } : {}) } }) +
        `<div class="g-choices">${['Fun', 'Weekend away'].map((n) => `<button class="g-choice ${moved === n ? 'on' : ''}" data-mv="${n}">Move $30 from ${n}</button>`).join('')}</div>` +
        (moved ? ok(`Done. Groceries is back to $0. Sam made a choice on purpose${moved === 'Fun' ? ', and the weekend away is untouched' : ''}. No guilt, no starting over.`) : '');
    },
    bind: (card) => $$('[data-mv]', card).forEach((b) => b.addEventListener('click', () => { st.samMv = b.dataset.mv; save(); draw(); })),
    canNext: () => !!st.samMv, needMsg: 'Pick where Sam\'s $30 comes from. Either is fine!' });

  step({ id: 'sam-dream', ch: 2, title: 'A few months later\u2026',
    body: () => `<div class="g-person"><div class="g-face happy" aria-hidden="true">S</div><div>Sam kept doing this every payday. A little to the weekend away each time.<br><br>In March, the weekend away fund hit <b>$600</b>. Sam booked it that night. <b>Paid for, no guilt, no credit card.</b></div></div>` +
      big('That\'s what a budget is for. Not "no". "Yes, and here\'s how."') });

  step({ id: 'ahead', ch: 2, title: 'Getting ahead, a little at a time',
    body: () => p('Right now, most people pay this week\'s bills with this week\'s pay. That\'s really normal.') +
      p('As the plan settles, a small cushion builds up. One day you\'re paying this month\'s bills with <b>last month\'s</b> money, and payday stops being stressful.') +
      tip('You don\'t have to do anything special for this. It happens slowly, just by following the plan.') });

  step({ id: 'debt', ch: 2, title: 'If you owe money',
    body: () => p('Lots of people do. Credit cards, Afterpay, a car loan, the ATO. No judgement here.') +
      `<ol class="g-steps"><li>Always pay at least the <b>minimum</b> on everything.</li><li>If there\'s any extra, put it on <b>one</b> debt at a time.</li><li>When that one\'s gone, move on to the next.</li></ol>` +
      p('YNABB keeps track of all of it, and shows you when each one will be paid off. Watching that date get closer is very satisfying.') });

  // ---- uneven pay: Jo ----
  // Jo's month, most important first. [name, needs, why]
  const JO = [['Rent', 1000, 'A roof'], ['Groceries', 500, 'Food'], ['Electricity', 150, 'Lights on'], ['Fuel', 160, 'Getting to work'], ['Phone', 50], ['Kids', 120], ['Fun', 100], ['Savings', 100]];
  const joHas = () => st.jo || (st.jo = Object.fromEntries(JO.map(([n]) => [n, 0])));
  // hand money out from the top of the list down, filling each gap in turn
  function joFill(amount, has) {
    let left = amount;
    for (const [n, need] of JO) { if (left <= 0) break; const add = Math.min(need - has[n], left); if (add > 0) { has[n] += add; left -= add; } }
    return left;
  }
  const joTable = (has, title) => `<div class="g-sam">${title ? `<div class="g-sam-row g-sam-h"><span>${title}</span><b>has / needs</b></div>` : ''}${JO.map(([n, need, why]) => {
    const h = has[n], full = h >= need;
    return `<div class="g-sam-row jo ${full ? 'full' : h > 0 ? 'part' : 'none'}"><span class="g-sam-n">${n}${why ? `<small>${why}</small>` : ''}</span><span class="g-jo-bar"><i style="width:${Math.round(Math.min(1, h / need) * 100)}%"></i></span><b class="g-sam-v">$${h} <small>/ $${need}</small></b></div>`;
  }).join('')}</div>`;
  const INCOME = [['pay1', 'Payday: Jo\'s part-time job', 800], ['sale', 'Sold the old pram on Marketplace', 120], ['pay2', 'Payday again', 800], ['babysit', 'Babysitting for a neighbour', 90]];

  step({ id: 'jo', ch: 3, title: 'Meet Jo',
    body: () => `<div class="g-person"><div class="g-face jo" aria-hidden="true">J</div><div><b>This is Jo.</b> Jo works part-time, so pay changes from month to month. Some months there\'s a bit extra from selling things or babysitting. Some months, there just isn\'t enough.<br><br>Jo\'s month costs about <b>$2,180</b>. The job brings in about <b>$1,600</b>.</div></div>` +
      p('This happens to <b>so many people</b>. A plan doesn\'t magically make more money. But it means the most important things get paid, and nothing catches Jo by surprise.') +
      soft('Your pay is always the same? You can skip this part.') +
      `<div class="g-row"><button class="g-link" data-act="skipjo">Skip to setting up my money</button></div>`,
    bind: (card) => { const b = $('[data-act="skipjo"]', card); if (b) b.addEventListener('click', () => jumpTo(4)); } });

  step({ id: 'jo-first', ch: 3, title: 'Money lands. What gets it first?',
    body: () => {
      const pick = st.joQ;
      const good = ['Rent', 'Groceries', 'Electricity', 'Fuel'];
      const opts = ['Fun', 'Rent', 'Savings', 'Groceries', 'Kids'];
      return p('Payday: <b>$800</b> lands. Jo\'s month needs $2,180, so it won\'t cover everything yet.') +
        p('<b>Which should get money first?</b>') +
        `<div class="g-choices">${opts.map((n) => `<button class="g-choice ${pick === n ? 'on' : ''}" data-joq="${n}">${n}</button>`).join('')}</div>` +
        (pick ? (good.includes(pick)
          ? ok('Yes. First things first: <b>a roof, food, power, and getting to work</b>. Keep those safe and everything else can wait a little.')
          : `<div class="g-hm">${pick === 'Kids' ? 'Lovely instinct! But the kids need a roof and food first.' : 'Not first, but it still matters.'} The first things are <b>a roof, food, power, and getting to work</b>. Then everything else.</div>`) : '');
    },
    bind: (card) => $$('[data-joq]', card).forEach((b) => b.addEventListener('click', () => { st.joQ = b.dataset.joq; save(); draw(); })),
    canNext: () => !!st.joQ, needMsg: 'Tap one. There\'s no wrong guess.' });

  step({ id: 'jo-in', ch: 3, title: 'Every time money lands, fill the next gap',
    body: () => {
      const got = st.joIn || (st.joIn = []);
      const has = Object.fromEntries(JO.map(([n]) => [n, 0]));
      let leftover = 0;
      for (const k of got) leftover += joFill(INCOME.find((x) => x[0] === k)[2], has);
      const next = INCOME.find((x) => !got.includes(x[0]));
      return p('Jo\'s list goes from <b>most important at the top</b> to least at the bottom. Each time money comes in, it fills the next gap, top down. Tap to see the month play out.') +
        (next ? `<div class="g-row"><button class="g-btn" data-act="income">+ $${next[2]}: ${next[1]}</button></div>` : '') +
        joTable(has, 'Jo\'s month') +
        (got.length ? `<p class="g-soft">Came in so far: ${got.map((k) => '$' + INCOME.find((x) => x[0] === k)[2]).join(' + ')} = <b>$${got.reduce((a, k) => a + INCOME.find((x) => x[0] === k)[2], 0)}</b></p>` : '') +
        (!next ? `<div class="g-hm">That\'s all the money for this month: <b>$1,810</b>. The roof, food, power and fuel are all covered. That\'s the most important part. But the phone, Kids, Fun and Savings are short. Jo is <b>$370</b> short altogether.</div>` : '');
    },
    bind: (card) => { const b = $('[data-act="income"]', card); if (b) b.addEventListener('click', () => { const next = INCOME.find((x) => !st.joIn.includes(x[0])); st.joIn.push(next[0]); save(); draw(); }); },
    canNext: () => (st.joIn || []).length === INCOME.length, needMsg: 'Tap the money button until all of Jo\'s money for the month is in.' });

  const SHORT = [
    ['pause', 'Pause Fun and Savings this month', true, 'Totally fine. They\'re not gone, just paused. They come back when there\'s more.'],
    ['ask', 'Ask the school if the excursion can be paid next week', true, 'Great move. Talking to people early almost always helps. Bills, school, even the ATO usually have options if you ask before it\'s late.'],
    ['extra', 'Look for an extra shift, or sell something else', true, 'Yes. Any extra goes straight into the next gap on the list.'],
    ['card', 'Put the gap on the credit card', false, 'Try to avoid this if you can. It makes next month harder, because now there\'s a bill too. If it\'s truly the only way, that\'s okay, but put it in the plan so it doesn\'t surprise you.'],
    ['hide', 'Stop looking at the budget for a while', false, 'Very understandable! But this is exactly when the plan helps most. Knowing it\'s $370 short is much less scary than not knowing at all.'],
  ];
  step({ id: 'jo-short', ch: 3, title: 'When there isn\'t enough to go around',
    body: () => {
      const picked = st.joShort || (st.joShort = []);
      return p('Jo is $370 short this month. It\'s stressful, but it\'s not a disaster, because Jo <b>knows</b>. Tap each idea to see if it helps.') +
        `<div class="g-choices col">${SHORT.map(([k, l, good]) => `<button class="g-choice ${picked.includes(k) ? (good ? 'on' : 'meh') : ''}" data-short="${k}">${picked.includes(k) ? (good ? '\u2713 ' : '\u2192 ') : ''}${l}</button>${picked.includes(k) ? `<div class="${good ? 'g-ok' : 'g-hm'} g-inline">${SHORT.find((x) => x[0] === k)[3]}</div>` : ''}`).join('')}</div>`;
    },
    bind: (card) => $$('[data-short]', card).forEach((b) => b.addEventListener('click', () => { const l = st.joShort, k = b.dataset.short; if (!l.includes(k)) l.push(k); save(); draw(); })) });

  const EXTRA = [['next', 'Next month\'s rent, food and power', 1650], ['cushion', 'A cushion for slow months', 0], ['debt', 'Extra off the credit card', 0], ['treat', 'Something nice for the family', 0]];
  step({ id: 'jo-extra', ch: 3, title: 'And when there\'s extra?',
    body: () => {
      const done = st.joX || (st.joX = []);
      const left = 1500 - (done.includes('next') ? 1500 : 0);
      return p('A good month! Jo\'s tax refund arrives: <b>$1,500</b>, and this month is already covered. What first?') +
        `<div class="g-choices col">${EXTRA.map(([k, l]) => `<button class="g-choice ${done.includes(k) ? 'on' : ''}" data-extra="${k}">${l}</button>`).join('')}</div>` +
        (done.length ? (done[0] === 'next'
          ? ok('Perfect. That\'s called <b>getting ahead</b>: next month\'s most important things are already paid for, before next month even starts. With uneven pay, this is gold. A slow month just stops being scary.')
          : `<div class="g-hm">That\'s not wrong, and it\'s Jo\'s money to choose! But with uneven pay, the strongest first move is usually <b>next month\'s essentials</b>. Then a cushion, then extra off debt, then treats.</div>`) : '') +
        (done.includes('next') ? p('In YNABB, you do this by going to <b>next month</b> (the arrow at the top of the Budget page) and giving the money jobs there.') : '');
    },
    bind: (card) => $$('[data-extra]', card).forEach((b) => b.addEventListener('click', () => { const l = st.joX, k = b.dataset.extra; if (!l.includes(k)) l.unshift(k); save(); draw(); })) });

  step({ id: 'recap', ch: 3, title: 'You already know how to do this',
    body: () => `<div class="g-cards">
        <div><b>1</b><span>Every dollar gets a job</span></div>
        <div><b>2</b><span>Only plan with money you have</span></div>
        <div><b>3</b><span>Make big bills small</span></div>
        <div><b>4</b><span>When plans change, move money. No guilt.</span></div>
        <div><b>5</b><span>When money lands, fill the most important gaps first</span></div>
        <div><b>6</b><span>Got extra? Get next month sorted.</span></div>
      </div>` + p('You just did all of this for Sam and Jo. Now let\'s do it for <b>you</b>. Have your banking app handy.') });

  // ---- your money ----
  const hasStuff = () => { const d = Z().data(); return Object.keys(d.accounts).length > 0 || Object.keys(d.cats).length > 0; };
  // decided once, when the guide is first opened, so adding accounts later doesn't bring this back
  step({ id: 'fresh', ch: 4, title: 'There\'s already something in here', when: () => (st.hadStuff == null ? (st.hadStuff = hasStuff()) : st.hadStuff) && !st.freshDone,
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

  step({ id: 'accts', ch: 4, title: 'Where does your money live?',
    body: () => {
      const d = Z().data();
      const list = Object.values(d.accounts).filter((a) => !a.closed);
      const t = ACCT_TYPES.find((x) => x[0] === st.atype);
      return p('Add each place your money is, and each thing you owe on. Open your banking app to see the amounts. <b>Close enough is fine.</b>') +
        (list.length ? `<ul class="g-accts">${list.map((a) => { const b = (d.bal[a.id] || {}).balance || 0, owe = Z().DEBT_TYPES[a.type]; return `<li><span>${esc(a.name)}</span><b class="${owe ? 'owe' : ''}">${owe ? 'owe ' + money(-b) : money(b)}</b><button class="g-x" data-rm="${a.id}" aria-label="Remove ${esc(a.name)}" title="Remove">\u00D7</button></li>`; }).join('')}</ul>` : '') +
        `<div class="g-add">
          <p class="g-q">${list.length ? 'Anything else?' : 'What\'s the first one?'}</p>
          <div class="g-choices">${ACCT_TYPES.map(([k, l]) => `<button class="g-choice sm ${st.atype === k ? 'on' : ''}" data-atype="${k}">${l}</button>`).join('')}</div>
          ${t ? `<div class="g-form">
            <label>What do you call it?<input id="g-aname" value="${esc(st.aname || t[2])}" autocomplete="off"></label>
            <label>${t[3] === 'owe' ? 'How much do you owe on it?' : t[3] === 'track' ? 'Roughly how much is in it?' : 'How much is in it right now?'}<span class="g-money"><i>$</i><input id="g-aamt" inputmode="decimal" placeholder="0" autocomplete="off"></span></label>
            <button class="g-btn" data-act="addacct">Add it</button>
            ${t[3] === 'track' ? soft('This is kept separate. It shows what you have, but it isn\'t part of the spending plan.') : t[3] === 'owe' ? soft('This won\'t come out of your spending money. We\'ll make a plan to pay it down.') : ''}
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

  step({ id: 'total', ch: 4, title: 'Here\'s where you\'re starting',
    body: () => {
      const d = Z().data(), accts = Object.values(d.accounts);
      const has = accts.filter((a) => a.type !== 'tracking' && !Z().DEBT_TYPES[a.type]).reduce((s, a) => s + ((d.bal[a.id] || {}).balance || 0), 0);
      const owe = accts.filter((a) => Z().DEBT_TYPES[a.type]).reduce((s, a) => s - ((d.bal[a.id] || {}).balance || 0), 0);
      return `<div class="g-stat"><span>Money you can plan with</span><b>${money(has)}</b></div>` +
        (owe > 0 ? `<div class="g-stat owe"><span>What you owe</span><b>${money(owe)}</b></div>` + p('That\'s okay. Knowing the number is the hard part, and you\'ve just done it. We\'ll make a plan for it.') : '') +
        p('Next: what is your money <b>for</b>?');
    } });

  // ---- your plan ----
  step({ id: 'cats', ch: 5, title: 'What do you spend money on?',
    body: () => {
      const c = chosen();
      return p('Tap to choose what fits your life. We\'ve picked some common ones to start. <b>You can change all of this later.</b>') +
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
    bills: ['Roughly what do your bills cost?', 'Look at your last bill, or just guess. You can fix it any time.'],
    every: ['And the everyday things?', 'Think about a normal week or month. A rough guess is perfect.'],
    year: ['The once-a-year ones', 'Roughly what each costs in a year. We\'ll set a little aside each month, so it\'s there when it comes.'],
    fun: ['What would feel good for fun?', 'Pick an amount that feels comfortable. This money is guilt-free.'],
    save: ['Saving for future you', 'Even $20 a month counts. An emergency fund is the best first goal: it stops surprises becoming debt.'],
  };
  for (const g of GROUPS) {
    step({ id: 'amt-' + g.key, ch: 5, title: AMT_SAY[g.key][0], when: () => chosen()[g.key].length > 0,
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
  step({ id: 'debts', ch: 5, title: 'Paying what you owe', when: () => debts().length > 0,
    body: () => p('How much do you pay on each one? For a credit card, use the <b>minimum</b> on your statement.') +
      `<div class="g-amts">${debts().map((a) => {
        const f = st.debtFreq[a.id] || (a.type === 'bnpl' ? 'fortnight' : 'month'), v = st.debt[a.id] || '';
        const m = parse(v) ? perMonth(parse(v), f) : 0;
        return `<div class="g-amt"><span class="g-amt-n">${esc(a.name)}</span><span class="g-money"><i>$</i><input data-debt="${a.id}" inputmode="decimal" placeholder="0" value="${esc(v)}" autocomplete="off" aria-label="${esc(a.name)} payment"></span>${freqSel('d:' + a.id, f)}<span class="g-pm-out" data-dout="${a.id}">${m && f !== 'month' ? `\u2248 ${money(m)} a month` : ''}</span></div>`;
      }).join('')}</div>` + soft('This becomes a "need" in your plan, so it always gets paid first.'),
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

  step({ id: 'assign', ch: 5, title: 'Now, give your money its jobs',
    body: () => {
      const d = Z().data(), m = d.month, plan = Z().plan();
      if (st.assigned) {
        const left = m.rta, still = m.underTotal;
        const ef = catIdByName('Emergency fund');
        return ok('Done! Your money has its jobs.') +
          (still > 0 ? p(`Your plan asks for <b>${money(still)}</b> more than you have right now. That\'s really common, especially at the start. The most important things were covered first. The rest gets filled in when you\'re next paid.`) : '') +
          (left > 0 ? p(`You have <b>${money(left)}</b> left without a job. Lovely!`) + `<div class="g-choices col">${ef ? `<button class="g-choice" data-act="toef">Put it in my Emergency fund</button>` : ''}<button class="g-choice" data-act="keep">Leave it for now. I\'ll decide later.</button></div>` : '') +
          (left === 0 && still === 0 ? p('Every dollar has a job, and every part of your plan is covered. That\'s a great place to be.') : '');
      }
      return `<div class="g-stat"><span>Money waiting for a job</span><b>${money(m.rta)}</b></div>` +
        p(`Your plan asks for <b>${money(m.underTotal)}</b> this month. Tap the button and YNABB hands out your money for you, most important things first.`) +
        `<div class="g-row"><button class="g-btn big" data-act="fund" ${plan && Object.keys(plan.changes).length ? '' : 'disabled'}>Give my money its jobs</button></div>` +
        (m.rta <= 0 ? soft('There\'s nothing waiting for a job right now. That\'s okay: when you\'re next paid, come back to this step.') : '');
    },
    bind: (card) => {
      const f = $('[data-act="fund"]', card);
      if (f) f.addEventListener('click', async () => { f.disabled = true; await Z().fundTargets(); st.assigned = true; save(); draw(); });
      const ef = $('[data-act="toef"]', card);
      if (ef) ef.addEventListener('click', async () => { const id = catIdByName('Emergency fund'); await Z().assign(id, Z().data().month.rta); Z().toast('Added to your Emergency fund'); draw(); });
      const k = $('[data-act="keep"]', card); if (k) k.addEventListener('click', () => go(1));
    } });

  step({ id: 'planned', ch: 5, title: 'You did it',
    body: () => big('That was the hardest part, and it\'s done.') +
      p('Your budget is set up. You can see it any time on the <b>Budget</b> page.') +
      p('Last chapter: the few small things you\'ll do each week. It\'s quick, promise.') +
      `<div class="g-row"><button class="g-link" data-act="peek">Have a look at my budget first</button></div>`,
    bind: (card) => { const b = $('[data-act="peek"]', card); if (b) b.addEventListener('click', () => showMe('budget', '.bud', 'This is your budget. Each line is one job for your money.')); } });

  // ---- using it ----
  step({ id: 'spend', ch: 6, title: 'When you spend money',
    body: () => p('Each time you spend, YNABB needs to know, so the right job gets smaller.') +
      p('The easy way: <b>bring it in from your bank</b> every few days (next page). Or add one by hand with the <b>Add</b> button.') +
      `<div class="g-row"><button class="g-btn ghost" data-show="add">Show me the Add button</button></div>`,
    show: { add: ['tx', '[data-action="add-tx"]', 'Tap Add to put in something you\'ve bought. Pick what it was for, and you\'re done.'] } });

  step({ id: 'import', ch: 6, title: 'Bringing it in from your bank',
    body: () => `<ol class="g-steps"><li>In your bank\'s website, open the account and look for <b>Export</b> or <b>Download transactions</b>.</li><li>Choose the <b>QIF</b> or <b>CSV</b> file.</li><li>In YNABB, tap <b>Import from bank</b> and choose that file.</li></ol>` +
      p('YNABB skips anything it already has, and matches up anything you added by hand.') +
      `<div class="g-row"><button class="g-btn ghost" data-show="imp">Show me where</button></div>`,
    show: { imp: ['tx', '[data-action="import"]', 'Import from bank is here. Choose the file you downloaded from your bank.'] } });

  step({ id: 'review', ch: 6, title: 'Giving each one a job',
    body: () => p('New transactions from the bank wait for you to say what they were for. Click one, choose its category, done.') +
      p('YNABB learns as you go. Next time Woolies comes in, it\'ll already know it\'s Groceries.') +
      tip('Five minutes, a couple of times a week, keeps it easy. Leaving it for a month makes it a chore.') });

  step({ id: 'red', ch: 6, title: 'When something goes red',
    body: () => p('Red means you spent more than you planned in that category. It happens!') +
      p('Click the red amount, and move money from a category that has some spare. Remember the $30 groceries? Exactly like that.') +
      `<div class="g-row"><button class="g-btn ghost" data-show="avail">Show me where</button></div>`,
    show: { avail: ['budget', '.bud-head span:last-child', 'This column shows what\'s left in each category. Click any amount to move money in or out.'] } });

  step({ id: 'match', ch: 6, title: 'Checking it matches the bank',
    body: () => p('Every week or two, check that YNABB and your bank agree. Tap <b>Reconcile</b>, type what your bank says you have, and YNABB shows you if anything\'s missing.') +
      p('If it matches, you know your plan is right. That\'s a lovely feeling.') +
      `<div class="g-row"><button class="g-btn ghost" data-show="rec">Show me where</button></div>`,
    show: { rec: ['tx', '[data-action="rec-pop"]', 'Reconcile is here. Type the balance your banking app shows.'] } });

  step({ id: 'payday', ch: 6, title: 'When you get paid',
    body: () => p('New money lands in <b>Ready to Assign</b>, at the top of your Budget page. It\'s waiting for a job.') +
      p('Tap <b>Fund targets</b> and YNABB gives it jobs for you, the same as you did earlier. Anything left, you choose.') +
      `<div class="g-row"><button class="g-btn ghost" data-show="rta">Show me where</button></div>`,
    show: { rta: ['budget', '.rta, .rta-banner, [class*="rta"]', 'This is Ready to Assign: money waiting for a job.'] } });

  step({ id: 'forward', ch: 6, title: 'Got extra? Get next month sorted',
    body: () => p('When this month is fully covered and there\'s money left, go to <b>next month</b> with the arrow at the top of the Budget page, and tap <b>Fund targets</b> there.') +
      p('Next month\'s essentials are then paid for before it even starts. Just like Jo.') +
      `<div class="g-row"><button class="g-btn ghost" data-show="fwd">Show me where</button></div>`,
    show: { fwd: ['budget', '[data-action="next-month"]', 'This arrow takes you to next month. Give spare money jobs there to get ahead.'] } });

  step({ id: 'routine', ch: 6, title: 'Your 10-minute check-in', nextLabel: 'Finish',
    body: () => p('That\'s everything. Here\'s all you need to do, once or twice a week:') +
      `<ol class="g-check"><li><b>Bring in</b> your spending from the bank</li><li><b>Give each one a job</b></li><li><b>Fix anything red</b> by moving money</li><li><b>On payday,</b> give the new money its jobs</li></ol>` +
      dreamsLine() + big('You\'ve got this.') + soft('This guide is always under the Guide button at the top if you want a refresher.') });

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
    $$('[data-show]', card).forEach((b) => b.addEventListener('click', () => { const [view, sel, text] = s.show[b.dataset.show]; showMe(view, sel, text); }));
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
.g-chapters, .g-steps, .g-check { padding-left: 22px; margin: 6px 0 14px; }
.g-chapters li, .g-steps li, .g-check li { margin: 6px 0; }
.g-check { list-style: none; padding-left: 0; }
.g-check li { padding: 10px 14px; background: var(--surface-2); border-radius: 10px; }
.g-jobs { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 8px; margin: 10px 0; }
.g-job { display: grid; grid-template-columns: 1fr 40px 64px 40px; align-items: center; gap: 6px; background: var(--surface-2); border-radius: 12px; padding: 6px 8px 6px 14px; font-weight: 600; }
.g-job b { text-align: center; font: 700 18px var(--display); }
.g-pm { width: 40px; height: 40px; border-radius: 50%; border: 1.5px solid var(--line); background: var(--surface); font: 700 20px var(--ui); color: var(--accent); cursor: pointer; }
.g-pm:disabled { opacity: .35; cursor: default; }
.g-left { text-align: center; font-size: 17px; padding: 10px; border-radius: 12px; background: var(--warn-soft); }
.g-left b { font: 700 22px var(--display); }
.g-left.done { background: var(--good-soft); }
.g-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; margin: 6px 0 16px; }
.g-wins { list-style: none; padding: 0; margin: 8px 0 14px; display: grid; gap: 6px; }
.g-wins li { padding: 9px 14px 9px 36px; background: var(--good-soft); border-radius: 10px; position: relative; }
.g-wins li::before { content: '\u2713'; position: absolute; left: 14px; color: var(--good); font-weight: 700; }
.g-person { display: flex; gap: 16px; align-items: flex-start; background: var(--surface-2); border-radius: 14px; padding: 16px; margin: 10px 0 14px; }
.g-face { flex: none; width: 52px; height: 52px; border-radius: 50%; background: var(--brand); color: #fff; display: grid; place-items: center; font: 700 24px var(--display); }
.g-face.happy { background: var(--good); }
.g-sam { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; margin: 10px 0; }
.g-sam-row { display: grid; grid-template-columns: minmax(0, 1fr) 40px 76px 40px 96px; gap: 6px; align-items: center; padding: 7px 10px 7px 14px; border-top: 1px solid var(--line); }
.g-sam-row:first-child { border-top: 0; }
.g-sam:not(:has(.g-pm)) .g-sam-row { grid-template-columns: minmax(0, 1fr) auto; }
.g-sam-n { font-weight: 600; display: flex; flex-direction: column; }
.g-sam-n small { font-weight: 400; color: var(--muted); font-size: 12.5px; }
.g-sam-v { text-align: center; font: 700 17px var(--display); }
.g-sam-row.red .g-sam-v { color: var(--on-bad); background: var(--bad); border-radius: 99px; padding: 2px 10px; }
.g-sam-row.dream { background: var(--goal-soft); }
.g-fill { border: 1.5px solid var(--accent); background: var(--surface); color: var(--accent); border-radius: 99px; padding: 5px 10px; font: 600 13px var(--ui); cursor: pointer; }
@media (max-width: 560px) { .g-sam-row { grid-template-columns: minmax(0, 1fr) 36px 64px 36px; } .g-fill { grid-column: 1 / -1; justify-self: start; } }
.g-face.jo { background: var(--accent); }
.g-sam-h { background: var(--surface-2); font-size: 13px; color: var(--muted); font-weight: 600; }
.g-sam-h, .g-sam-row.jo { grid-template-columns: minmax(0, 1fr) 110px 110px !important; }
.g-sam-h b { grid-column: 3; text-align: center; font-weight: 600; }
.g-sam-row.jo .g-sam-v small { font-weight: 400; color: var(--muted); font-size: 13px; }
.g-jo-bar { height: 8px; border-radius: 4px; background: var(--surface-2); overflow: hidden; }
.g-jo-bar i { display: block; height: 100%; background: var(--need); border-radius: 4px; transition: width .4s; }
.g-sam-row.jo.full .g-jo-bar i { background: var(--good); }
.g-sam-row.jo.none .g-sam-v { color: var(--bad); }
.g-choice.meh { border-color: var(--need); background: var(--warn-soft); }
.g-inline { margin: -2px 0 6px !important; font-size: 15px; }
.g-cards div { display: flex; gap: 12px; align-items: center; background: var(--surface-2); border-radius: 12px; padding: 12px 14px; font-weight: 600; }
.g-cards b { flex: none; width: 32px; height: 32px; border-radius: 50%; background: var(--accent); color: var(--accent-ink); display: grid; place-items: center; }
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
@media (max-width: 560px) {
  .g-card { padding: 20px 18px 18px; border-radius: 14px; }
  .g-card h2 { font-size: 22px; }
  .g-amt { grid-template-columns: 1fr 1fr; }
  .g-amt-n { grid-column: 1 / -1; }
  .g-brand { display: none; }
  .g-chs { justify-content: flex-start; }
}
.zl-spot { position: relative; z-index: 5; outline: 3px solid var(--accent) !important; outline-offset: 4px; border-radius: 10px; animation: zl-pulse 1.6s ease-in-out infinite; }
@keyframes zl-pulse { 0%, 100% { outline-color: var(--accent); } 50% { outline-color: color-mix(in srgb, var(--accent) 30%, transparent); } }
.zl-spotbar { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(16px + env(safe-area-inset-bottom, 0px)); z-index: 140; display: flex; gap: 14px; align-items: center; flex-wrap: wrap; justify-content: center; max-width: min(640px, calc(100vw - 32px)); background: var(--ink); color: var(--bg); padding: 12px 14px 12px 18px; border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,.25); font-size: 15px; }
@media (prefers-reduced-motion: reduce) { .zl-spot { animation: none; } }
`;
  document.head.appendChild(css);
})();
