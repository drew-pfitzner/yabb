// Mock budget #3: reconciled 25 Sep, then a NAB CSV from 20 Sep to 8 Oct with new traps (see ANSWER-KEY-3.md).
// Run from the repo root with Node: node test-data/.generator-3.js
const fs = require('fs');
const E = require('../app/engine.js');
const OUT = __dirname + '/';
const save = (name, s) => fs.writeFileSync(OUT + name, s);

let seed = 47;
const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const D = (s) => { const p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
const add = (s, n) => { const d = D(s); d.setDate(d.getDate() + n); return iso(d); };
const ddmm = (s) => s.slice(8, 10) + '/' + s.slice(5, 7);
let idn = 0; const id = (p) => p + (++idn).toString(36).padStart(4, '0');

const ACCT = 'acctnab01', SAV = 'acctsav01';
const RECON = '2026-09-25', FILE_FROM = '2026-09-20', FILE_TO = '2026-10-08', TODAY = '2026-10-09';

// ---------- categories ----------
const cats = {}; let order = 0;
const cat = (cid, name, parent, extra) => { cats[cid] = Object.assign({ id: cid, name, parent: parent || null, order: ++order }, extra || {}); };
cat('g_bills', 'Bills', null, { kind: 'need' });
cat('mortgage', 'Mortgage', 'g_bills', { kind: 'need', target: { type: 'refill', amount: 210000, day: 1 } });
cat('power', 'Electricity', 'g_bills', { kind: 'need', target: { type: 'due', amount: 42000, due: '2026-11-20', every: 3 } });
cat('phone', 'Phone', 'g_bills', { kind: 'need', target: { type: 'refill', amount: 6500, day: 19 } });
cat('internet', 'Internet', 'g_bills', { kind: 'need', target: { type: 'refill', amount: 8500, day: 12 } });
cat('carins', 'Car insurance', 'g_bills', { kind: 'need', target: { type: 'monthly', amount: 9200 } });
cat('rates', 'Council rates', 'g_bills', { kind: 'need', target: { type: 'due', amount: 46500, due: '2026-10-14', every: 3 } });
cat('g_every', 'Everyday', null, { kind: 'need' });
cat('groc', 'Groceries', 'g_every', { kind: 'need', target: { type: 'monthly', amount: 90000 } });
cat('fuel', 'Fuel', 'g_every', { kind: 'need', target: { type: 'monthly', amount: 24000 } });
cat('health', 'Pharmacy & health', 'g_every', { kind: 'need', target: { type: 'monthly', amount: 8000 } });
cat('household', 'Household', 'g_every', { kind: 'need', target: { type: 'monthly', amount: 15000 } });
cat('kids', 'Kids', 'g_every', { kind: 'need', target: { type: 'monthly', amount: 12000 } });
cat('g_fun', 'Fun', null, { kind: 'want' });
cat('eatout', 'Eating out', 'g_fun', { kind: 'want', target: { type: 'monthly', amount: 25000 } });
cat('subs', 'Subscriptions', 'g_fun', { kind: 'want', target: { type: 'refill', amount: 3500, day: 8 } });
cat('clothes', 'Clothing', 'g_fun', { kind: 'want', target: { type: 'monthly', amount: 10000 } });
cat('gifts', 'Gifts', 'g_fun', { kind: 'want', target: { type: 'monthly', amount: 5000 } });
cat('g_save', 'Savings', null, { kind: 'save' });
cat('holiday', 'Holiday', 'g_save', { kind: 'save', target: { type: 'goal', amount: 1500000, by: '2027-06-30' } });
cat('emerg', 'Emergency fund', 'g_save', { kind: 'save' });

// ---------- the bank's truth ----------
// type and merchant fill NAB's "Transaction Type" and "Merchant Name" columns
let bank = [];
const ref = (desc) => (/^V1234 /.test(desc) ? desc + ' 7436' + String(Math.floor(rnd() * 1e7)).padStart(7, '0') : desc);
function b(date, posted, amt, desc, payee, catId, extra) {
  const r = Object.assign({ date, posted, amt, desc: ref(desc), payee, cat: catId, type: /^(V1234|POS) /.test(desc) ? 'EFTPOS DEBIT' : amt > 0 ? 'MISCELLANEOUS CREDIT' : 'DIRECT DEBIT', merchant: /^(V1234|POS) /.test(desc) ? payee : '' }, extra || {});
  bank.push(r); return r;
}
const trap = (code, date, posted, amt, desc, payee, catId, extra) => b(date, posted, amt, desc, payee, catId, Object.assign({ trap: code }, extra || {}));

// pay every second Thursday; the one on 1 Oct is a trap (it went up)
for (let p = '2026-04-02'; p <= FILE_TO; p = add(p, 14)) if (p !== '2026-10-01') b(p, p, 285000, 'ACME LOGISTICS PL SALARY 0048211', 'Acme Logistics (pay)', '_income', { type: 'SALARY' });
const shops = [
  ['WOOLWORTHS 3341 NEWTOWN', 'Woolworths', 'groc', 6000, 18000],
  ['ALDI STORES 241 MARRICKVILLE', 'Aldi', 'groc', 4000, 12000],
  ['AMPOL ST PETERS 4471', 'Ampol', 'fuel', 5500, 8500],
  ['CHEMIST WAREHOUSE NEWTOWN', 'Chemist Warehouse', 'health', 1200, 4500],
  ['BAKERS DELIGHT NEWTOWN', 'Bakers Delight', 'groc', 600, 1600],
  ['CAFE XO SURRY HILLS', 'Cafe XO', 'eatout', 450, 2400],
  ['THAI POTHONG NEWTOWN', 'Thai Pothong', 'eatout', 4500, 9000],
  ['KMART 1280 BROADWAY', 'Kmart', 'household', 1500, 6000],
];
for (let d = '2026-04-01'; d <= FILE_TO; d = add(d, 1)) {
  const day = +d.slice(8, 10);
  if (day === 1) b(d, d, -210000, 'HOME LOAN REPAYMENT 0821 4455 12', 'NAB Home Loan', 'mortgage');
  if (day === 12) b(d, d, -8500, 'AUSSIE BROADBAND DIRECT DEBIT 774120', 'Aussie Broadband', 'internet');
  if (day === 19) b(d, d, -6500, 'TELSTRA DIRECT DEBIT 3301882', 'Telstra', 'phone');
  if (day === 8) { b(d, add(d, 2), -1799, 'V1234 ' + ddmm(d) + ' NETFLIX.COM MELBOURNE', 'Netflix', 'subs'); b(d, add(d, 2), -1399, 'V1234 ' + ddmm(d) + ' SPOTIFY P2B91C SYDNEY', 'Spotify', 'subs'); }
  if (day === 15) b(d, d, -9200, 'AAMI INSURANCE DIRECT DEBIT 55120', 'AAMI', 'carins');
  if (day === 25) b(d, d, -50000, 'ONLINE  T48853' + String(Math.floor(rnd() * 1e5)).padStart(5, '0') + ' Savings', 'Transfer to savings', null, { xfer: true, type: 'TRANSFER DEBIT' });
  if (d === '2026-05-20' || d === '2026-08-20') b(d, d, -41260, 'ORIGIN ENERGY BPAY 1144', 'Origin Energy', 'power');
  if (d === '2026-07-14') b(d, d, -46500, 'INNER WEST COUNCIL BPAY 22871', 'Inner West Council', 'rates');
  if (d >= '2026-10-08') continue; // only the pending fuel hold on the last day
  const n = rnd() < 0.3 ? 0 : 1;
  for (let k = 0; k < n; k++) {
    const s = pick(shops), amt = -Math.round((s[3] + rnd() * (s[4] - s[3])) / 5) * 5 - 3; // ends in 3 or 8 cents: never collides with a trap
    // the pending fuel hold on the last day must stay unique
    b(d, add(d, d >= '2026-10-06' ? 1 : pick([1, 1, 2, 3])), amt, 'V1234 ' + ddmm(d) + ' ' + s[0], s[1], s[2]);
  }
}

// ---------- traps ----------
// T7: imported and reconciled on 23 Sep; later someone's thumb changed the amount in the app
trap('T7', '2026-09-22', '2026-09-23', -2895, 'V1234 22/09 CHEMIST WAREHOUSE NEWTOWN', 'Chemist Warehouse', 'health');
// T12: a $250 hire-car hold imported while pending before the 25 Sep reconcile; the final bill came days later for less
const PEND = [{ code: 'T12', date: '2026-09-23', amt: -25000, desc: 'POS 23/09 EUROPCAR MASCOT   MASCOT', payee: 'Europcar', cat: 'holiday' }];
trap('T12', '2026-09-29', '2026-09-30', -18740, 'V1234 29/09 EUROPCAR MASCOT MASCOT', 'Europcar', 'holiday');
trap('T1', '2026-09-27', '2026-09-28', -5000, 'V1234 27/09 AMAZON AU MARKETPLACE SYDNEY', 'Amazon', 'kids');
trap('T1', '2026-09-28', '2026-09-29', -3500, 'V1234 28/09 AMAZON AU MARKETPLACE SYDNEY', 'Amazon', 'kids');
trap('T10', '2026-09-27', '2026-09-29', -4412, 'V1234 27/09 ETSY.COM USD 28.50', 'Etsy', 'gifts');
trap('T10', '2026-09-29', '2026-09-29', -132, 'INTNL TRANSACTION FEE', 'NAB', null, { type: 'FEES' });
trap('T5', '2026-09-30', '2026-10-01', -6000, 'V1234 30/09 THE GROUNDS ALEXANDRIA', 'The Grounds', 'eatout');
trap('T5', '2026-10-01', '2026-10-02', -6000, 'V1234 01/10 PLATYPUS SHOES BROADWAY', 'Platypus Shoes', 'kids');
trap('T8', '2026-10-01', '2026-10-01', 291240, 'ACME LOGISTICS PL SALARY 0048211', 'Acme Logistics (pay)', '_income', { type: 'SALARY' });
trap('T11', '2026-10-01', '2026-10-02', -8995, 'V1234 01/10 REBEL SPORT BROADWAY', 'Rebel Sport', 'clothes');
trap('T3', '2026-10-02', '2026-10-03', -4260, 'V1234 02/10 ALDI STORES 241 MARRICKVILLE', 'Aldi', 'groc');
trap('T13', '2026-10-02', '2026-10-03', -4495, "V1234 02/10 DAN MURPHY'S, NEWTOWN", "Dan Murphy's", 'groc');
trap('T4', '2026-10-03', '2026-10-05', -4800, 'V1234 03/10 BROWNES BAKERY NEWTOWN', 'Brownes Bakery', 'kids');
trap('T2', '2026-10-04', '2026-10-06', -4000, 'V1234 04/10 BUNNINGS 6125 ALEXANDRIA', 'Bunnings', 'household');
trap('T9', '2026-10-05', '2026-10-05', -55000, 'ONLINE  T4885391772 Savings top up', 'Transfer to savings', null, { xfer: true, type: 'TRANSFER DEBIT' });
trap('T6', '2026-10-08', '2026-10-08', -15000, 'POS 08/10 AMPOL ST PETERS 4471   ST PETERS', 'Ampol', 'fuel'); // fuel pre-authorisation, still pending
bank = bank.filter((r) => r.posted <= FILE_TO);
bank.sort((a, c) => (a.posted < c.posted ? -1 : a.posted > c.posted ? 1 : a.date < c.date ? -1 : a.date > c.date ? 1 : 0));
// running balance, as NAB shows it
let run = 320000; bank.forEach((r) => { run += r.amt; r.bal = run; });
const keyed = (rows) => E.classifyImport(ACCT, rows.map((r) => ({ date: r.date, posted: r.posted, amt: r.amt, desc: r.desc })), []).map((c, i) => Object.assign({}, rows[i], { ik: c.ik }));

// ---------- what's in the app ----------
const tx = [];
const T = (o) => { const t = Object.assign({ id: id('t'), acct: ACCT, by: 'mock' }, o); tx.push(t); return t; };
const xferPair = (t) => { const p = T({ acct: SAV, date: t.date, payee: t.payee, cat: null, amt: -t.amt, transfer: ACCT, pair: t.id, cleared: t.cleared === 'u' ? 'u' : 'r' }); t.transfer = SAV; t.pair = p.id; t.cat = null; };
T({ date: '2026-04-01', payee: 'Starting balance', cat: '_income', amt: 320000, cleared: 'r' });
T({ acct: SAV, date: '2026-04-01', payee: 'Starting balance', cat: '_income', amt: 800000, cleared: 'r' });
// everything the bank posted up to 25 Sep: imported and reconciled
keyed(bank.filter((r) => r.posted <= RECON)).forEach((r) => {
  const t = T({ date: r.date, posted: r.posted !== r.date ? r.posted : undefined, payee: r.payee, cat: r.cat, amt: r.amt, bank: r.desc, ik: r.ik, bal: r.bal, cleared: 'r' });
  if (r.xfer) xferPair(t);
  if (r.trap === 'T7') t.amt = -2589; // T7: 28.95 became 25.89 after reconciling
});
PEND.forEach((q) => T({ date: q.date, payee: q.payee, cat: q.cat, amt: q.amt, bank: q.desc, ik: keyed([{ date: q.date, posted: q.date, amt: q.amt, desc: q.desc }])[0].ik, cleared: 'r' }));

// since 25 Sep: about two thirds of the ordinary purchases typed in by hand
bank.filter((r) => r.posted > RECON && !r.trap).forEach((r, i) => {
  if (i % 3 === 2) return;
  const t = T({ date: r.date, payee: r.payee, cat: r.cat, amt: r.amt, cleared: 'u' });
  if (r.xfer) xferPair(t);
});
// the trap entries typed by hand
T({ date: '2026-09-27', payee: 'Amazon', cat: 'kids', amt: -8500, memo: 'Books and a lunchbox, one order', cleared: 'u' });           // T1: the bank charged it in two parts
T({ date: '2026-09-27', payee: 'Etsy', cat: 'gifts', amt: -4500, memo: 'Present for Mum', cleared: 'u' });                              // T10: bank says 44.12 + 1.32 fee
T({ date: '2026-10-01', payee: 'Dinner with Jess', cat: 'eatout', amt: -6000, cleared: 'u' });                                           // T5: typed a day late, no shop name
T({ date: '2026-10-01', payee: 'School shoes', cat: 'kids', amt: -6000, cleared: 'u' });                                                 // T5
T({ date: '2026-10-01', payee: 'Acme Logistics (pay)', cat: '_income', amt: 285000, cleared: 'u' });                                     // T8: bank paid 2,912.40
T({ date: '2026-11-01', payee: 'Rebel Sport', cat: 'clothes', amt: -8995, memo: 'Footy boots', cleared: 'u' });                          // T11: month typed as 11
T({ date: '2026-10-02', payee: 'Aldi', cat: 'groc', amt: -4206, cleared: 'u' });                                                         // T3: 42.60 typed as 42.06
T({ date: '2026-10-03', payee: 'Brownes Bakery', cat: 'kids', amt: -4800, memo: "Cake for Mia's party 12/10", cleared: 'u' });          // T4: a date in the note
T({ date: '2026-10-04', payee: 'Bunnings', cat: 'household', amt: -1240, memo: 'Hooks', cleared: 'u' });                                 // T2: one bank charge of 40.00
T({ date: '2026-10-04', payee: 'Bunnings', cat: 'household', amt: -2760, memo: 'Potting mix', cleared: 'u' });                           // T2
xferPair(T({ date: '2026-10-05', payee: 'Transfer to savings', amt: -50000, memo: 'Top up', cleared: 'u' }));                            // T9: actually sent 550
T({ date: '2026-10-08', payee: 'Ampol', cat: 'fuel', amt: -7135, cleared: 'u' });                                                        // T6: the pump took 71.35; the bank holds 150

// ---------- assigned each month ----------
const months = {};
const plan = { mortgage: 210000, phone: 6500, internet: 8500, carins: 9200, power: 14000, rates: 15500, groc: 90000, fuel: 24000, health: 8000, household: 15000, kids: 12000, eatout: 25000, subs: 3500, clothes: 10000, gifts: 5000, holiday: 40000, emerg: 30000 };
const six = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
six.forEach((m) => { months[m] = { assigned: Object.assign({}, plan), moves: {} }; });
months['2026-10'] = { assigned: { mortgage: 210000, groc: 45000, fuel: 12000, rates: 15500 }, moves: {} };
const income = tx.filter((t) => t.cat === '_income').reduce((a, t) => a + t.amt, 0);
let given = 0; for (const mm in months) for (const c0 in months[mm].assigned) given += months[mm].assigned[c0];
let spare = income - given - 35000;
months['2026-04'].assigned.emerg += 800000; spare -= 800000;
const each = Math.floor(spare / 12 / 100) * 100;
six.forEach((m) => { months[m].assigned.holiday += each; months[m].assigned.emerg += each; });

// ---------- documents ----------
const txDocs = {};
tx.forEach((t) => { Object.keys(t).forEach((k) => { if (t[k] === undefined) delete t[k]; }); const m = t.date.slice(0, 7); (txDocs[m] = txDocs[m] || { t: {} }).t[t.id] = t; });
const rules = {};
bank.forEach((r) => { const k = E.descKey(r.desc); if (k && r.cat && !rules[k] && !/^POS /.test(r.desc) && r.posted <= RECON) rules[k] = { payee: r.payee, cat: r.cat }; });
const sumW = (f) => tx.filter(f).reduce((s, t) => s + t.amt, 0);
const recEv = sumW((t) => t.acct === ACCT && t.cleared === 'r') + 2895 - 2589; // what it was when reconciled, before T7's edit
const recSav = sumW((t) => t.acct === SAV && t.cleared === 'r');
const data = {
  meta: {
    cats: { items: cats },
    accounts: { items: { [ACCT]: { id: ACCT, name: 'NAB Everyday', type: 'checking', closed: false, reconciledAt: RECON, reconciledBalance: recEv }, [SAV]: { id: SAV, name: 'NAB Savings', type: 'savings', closed: false, reconciledAt: RECON, reconciledBalance: recSav } } },
    rules: { items: rules }, imports: { items: {} }, settings: { currency: 'AUD' },
  },
  months, tx: txDocs,
};
save('mock-budget-3-backup.json', JSON.stringify({ app: 'zero-line', version: 1, exportedAt: TODAY + 'T09:00:00.000Z', data }, null, 1));

// ---------- the bank file: NAB CSV, 20 Sep to 8 Oct, newest first ----------
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const nabDate = (s) => s.slice(8, 10) + ' ' + MON[+s.slice(5, 7) - 1] + ' ' + s.slice(2, 4);
const q = (s) => (/[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
const catName = (c) => (c === '_income' ? 'Income' : c && cats[c] ? cats[c].name : '');
const lines = ['Date,Amount,Account Number,,Transaction Type,Transaction Details,Balance,Category,Merchant Name,Processed On'];
bank.filter((r) => r.posted >= FILE_FROM).reverse().forEach((r) => {
  lines.push([nabDate(r.posted), (r.amt / 100).toFixed(2), '08-123-4567', '', r.type, q(r.desc), (r.bal / 100).toFixed(2), q(catName(r.cat)), q(r.merchant), nabDate(r.posted)].join(','));
});
save('NAB-Everyday-test-3.csv', lines.join('\r\n') + '\r\n');

const bankNow = bank[bank.length - 1].bal;
const savCorrect = 800000 + bank.filter((r) => r.xfer).reduce((s, r) => s - r.amt, 0);
console.log(JSON.stringify({ tx: tx.length, fileRows: lines.length - 1, bankBalance8Oct: bankNow / 100, reconciledBalance: recEv / 100,
  appEverydayBefore: sumW((t) => t.acct === ACCT) / 100, savingsApp: sumW((t) => t.acct === SAV) / 100, savingsCorrect: savCorrect / 100 }, null, 1));
