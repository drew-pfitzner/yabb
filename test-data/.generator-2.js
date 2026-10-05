// Mock budget #2: no bank import since the 11 Sep reconcile; a NAB file from 6 Sep to 2 Oct full of tricky cases.
ObjC.import('Foundation');
var E = this.Engine;
var OUT = 'test-data/';
function save(name, s) { $.NSString.alloc.initWithUTF8String(s).writeToFileAtomicallyEncodingError(OUT + name, true, 4, null); }

var seed = 31;
function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
function pick(a) { return a[Math.floor(rnd() * a.length)]; }
function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function D(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function add(s, n) { var d = D(s); d.setDate(d.getDate() + n); return iso(d); }
function ddmm(s) { return s.slice(8, 10) + '/' + s.slice(5, 7); }
var idn = 0; function id(p) { idn++; return p + idn.toString(36).padStart(4, '0'); }

var ACCT = 'acctnab01';
var RECON = '2026-09-11', FILE_FROM = '2026-09-06', FILE_TO = '2026-10-02', TODAY = '2026-10-03';

// ---------- categories ----------
var cats = {}, order = 0;
function cat(cid, name, parent, extra) { cats[cid] = Object.assign({ id: cid, name: name, parent: parent || null, order: ++order }, extra || {}); }
cat('g_bills', 'Bills', null, { kind: 'need' });
cat('mortgage', 'Mortgage', 'g_bills', { kind: 'need', target: { type: 'refill', amount: 210000, day: 1 } });
cat('power', 'Electricity', 'g_bills', { kind: 'need', target: { type: 'due', amount: 42000, due: '2026-11-20', every: 3 } });
cat('phone', 'Phone', 'g_bills', { kind: 'need', target: { type: 'refill', amount: 6500, day: 19 } });
cat('internet', 'Internet', 'g_bills', { kind: 'need', target: { type: 'refill', amount: 8500, day: 12 } });
cat('carins', 'Car insurance', 'g_bills', { kind: 'need', target: { type: 'monthly', amount: 9200 } });
cat('g_every', 'Everyday', null, { kind: 'need' });
cat('groc', 'Groceries', 'g_every', { kind: 'need', target: { type: 'monthly', amount: 90000 } });
cat('fuel', 'Fuel', 'g_every', { kind: 'need', target: { type: 'monthly', amount: 24000 } });
cat('health', 'Pharmacy & health', 'g_every', { kind: 'need', target: { type: 'monthly', amount: 8000 } });
cat('g_fun', 'Fun', null, { kind: 'want' });
cat('eatout', 'Eating out', 'g_fun', { kind: 'want', target: { type: 'monthly', amount: 25000 } });
cat('subs', 'Subscriptions', 'g_fun', { kind: 'want', target: { type: 'refill', amount: 3500, day: 8 } });
cat('clothes', 'Clothing', 'g_fun', { kind: 'want', target: { type: 'monthly', amount: 10000 } });
cat('g_save', 'Savings', null, { kind: 'save' });
cat('holiday', 'Holiday', 'g_save', { kind: 'save', target: { type: 'goal', amount: 1500000, by: '2027-06-30' } });
cat('household', 'Household', 'g_every', { kind: 'need', target: { type: 'monthly', amount: 15000 } });

// ---------- the bank's truth ----------
var bank = [];
function ref(desc) { return /^V1234 /.test(desc) ? desc + ' 7436' + String(Math.floor(rnd() * 1e7)).padStart(7, '0') : desc; }
function b(date, posted, amt, desc, payee, catId, extra) { var r = Object.assign({ date: date, posted: posted, amt: amt, desc: ref(desc), payee: payee, cat: catId, memo: '' }, extra || {}); bank.push(r); return r; }
function trap(code, date, posted, amt, desc, payee, catId, extra) { return b(date, posted, amt, desc, payee, catId, Object.assign({ trap: code }, extra || {})); }

for (var p = '2026-04-02'; p <= FILE_TO; p = add(p, 14)) b(p, p, 285000, 'ACME LOGISTICS PL SALARY 0048211', 'Acme Logistics (pay)', '_income');
var shops = [
  ['WOOLWORTHS 3341 NEWTOWN', 'Woolworths', 'groc', 6000, 18000],
  ['ALDI STORES 241 MARRICKVILLE', 'Aldi', 'groc', 4000, 12000],
  ['AMPOL ST PETERS 4471', 'Ampol', 'fuel', 5500, 8500],
  ['CHEMIST WAREHOUSE NEWTOWN', 'Chemist Warehouse', 'health', 1200, 4500],
  ['BAKERS DELIGHT NEWTOWN', 'Bakers Delight', 'groc', 600, 1600],
  ['CAFE XO SURRY HILLS', 'Cafe XO', 'eatout', 450, 2400],
  ['THAI POTHONG NEWTOWN', 'Thai Pothong', 'eatout', 4500, 9000],
  ['UNIQLO BROADWAY', 'Uniqlo', 'clothes', 3000, 8000],
];
for (var d = '2026-04-01'; d <= FILE_TO; d = add(d, 1)) {
  var day = +d.slice(8, 10);
  if (day === 1) b(d, d, -210000, 'HOME LOAN REPAYMENT 0821 4455 12', 'NAB Home Loan', 'mortgage');
  if (day === 12) b(d, d, -8500, 'AUSSIE BROADBAND DIRECT DEBIT 774120', 'Aussie Broadband', 'internet');
  if (day === 19) b(d, d, -6500, 'TELSTRA DIRECT DEBIT 3301882', 'Telstra', 'phone');
  if (day === 8) { b(d, add(d, 2), -1799, 'V1234 ' + ddmm(d) + ' NETFLIX.COM MELBOURNE', 'Netflix', 'subs'); b(d, add(d, 2), -1399, 'V1234 ' + ddmm(d) + ' SPOTIFY P2B91C SYDNEY', 'Spotify', 'subs'); }
  if (day === 15) b(d, d, -9200, 'AAMI INSURANCE DIRECT DEBIT 55120', 'AAMI', 'carins');
  if (day === 25) b(d, d, -50000, 'ONLINE  T48853' + String(Math.floor(rnd() * 1e5)).padStart(5, '0'), 'Transfer to savings', null, { xfer: true, trap: d === '2026-09-25' ? 'G' : '' });
  if (d === '2026-05-20' || d === '2026-08-20') b(d, d, -41260, 'ORIGIN ENERGY BPAY 1144', 'Origin Energy', 'power');
  if (d > '2026-10-01') continue; // nothing ordinary on the last day: only the pending line
  var n = rnd() < 0.3 ? 0 : 1;
  for (var k = 0; k < n; k++) {
    var s = pick(shops), amt = -Math.round((s[3] + rnd() * (s[4] - s[3])) / 5) * 5 - 3; // ends in 3 or 8 cents: never collides with a trap
    b(d, add(d, pick([1, 1, 2, 3])), amt, 'V1234 ' + ddmm(d) + ' ' + s[0], s[1], s[2]);
  }
}

// ---------- traps ----------
// pending lines imported and reconciled on or before 11 Sep, and how the bank shows them now
var PEND = [
  { code: 'F', date: '2026-09-10', amt: -1895, desc: 'POS 10/09 CHEMIST WAREHOUSE NEWTOWN', payee: 'Chemist Warehouse', cat: 'health' },
  { code: 'K', date: '2026-09-11', amt: -2365, desc: 'POS 11/09 WOOLWORTHS/KING ST & CR   NEWTOWN', payee: 'Woolworths', cat: 'groc' },
  { code: 'P1', date: '2026-09-10', amt: -8000, desc: 'POS 10/09 CHARCOAL CHICKEN   NEWTOWN', payee: 'Charcoal Chicken', cat: 'eatout' },
  { code: 'P2', date: '2026-09-09', amt: -20000, desc: 'POS 09/09 QUEST APARTMENTS   SYDNEY', payee: 'Quest Apartments', cat: 'holiday' },
];
trap('F', '2026-09-10', '2026-09-12', -1895, 'V1234 10/09 CHEMIST WAREHOUSE NEWTOWN', 'Chemist Warehouse', 'health');
trap('K', '2026-09-11', '2026-09-14', -2365, 'V1234 11/09 WOOLWORTHS/KING ST & CRNEWTOWN', 'Woolworths', 'groc');
trap('P1', '2026-09-10', '2026-09-14', -8800, 'V1234 10/09 CHARCOAL CHICKEN NEWTOWN', 'Charcoal Chicken', 'eatout'); // tip added: $80 became $88
// P2: the $200 hotel hold was released, so it never appears again
trap('A', '2026-09-15', '2026-09-16', -6500, 'V1234 15/09 AMPOL ST PETERS 4471', 'Ampol', 'fuel');
trap('A', '2026-09-15', '2026-09-17', -6500, 'V1234 15/09 AMPOL ST PETERS 4472', 'Ampol', 'fuel');
trap('R', '2026-09-18', '2026-09-19', -5999, 'V1234 18/09 JB HI-FI BROADWAY', 'JB Hi-Fi', 'household');
trap('R', '2026-09-18', '2026-09-20', 5999, 'REVERSAL V1234 18/09 JB HI-FI BROADWAY', 'JB Hi-Fi', 'household');
trap('R', '2026-09-18', '2026-09-22', -5999, 'V1234 18/09 JB HI-FI BROADWAY', 'JB Hi-Fi', 'household');
trap('Y', '2026-09-20', '2026-09-21', -3870, 'V1234 20/09 MITRE 10 ENMORE', 'Mitre 10', 'household');
trap('X', '2026-09-21', '2026-09-22', -2000, 'V1234 21/09 TARGET 0147 NEWTOWN', 'Target', 'clothes');
trap('X', '2026-09-21', '2026-09-23', -2000, 'V1234 21/09 KMART 1280 BROADWAY', 'Kmart', 'household');
trap('H', '2026-09-22', '2026-09-23', -17285, 'V1234 22/09 WOOLWORTHS 3341 NEWTOWN', 'Woolworths', 'groc');
trap('M', '2026-09-23', '2026-09-24', 3995, 'V1234 23/09 UNIQLO BROADWAY REFUND', 'Uniqlo', 'clothes');
trap('C', '2026-09-24', '2026-09-25', -550, 'V1234 24/09 CAFE XO SURRY HILLS', 'Cafe XO', 'eatout');
trap('C', '2026-09-24', '2026-09-25', -550, 'V1234 24/09 CAFE XO SURRY HILLS', 'Cafe XO', 'eatout');
trap('C', '2026-09-24', '2026-09-25', -550, 'V1234 24/09 CAFE XO SURRY HILLS', 'Cafe XO', 'eatout');
trap('S', '2026-09-24', '2026-09-25', -3500, 'V1234 24/09 PETBARN ALEXANDRIA', 'Petbarn', 'household');
trap('W', '2026-09-26', '2026-09-28', -6120, 'V1234 26/09 COLES 0712 ENMORE', 'Coles', 'groc');
trap('B', '2026-09-26', '2026-09-30', -4500, 'V1234 26/09 BUNNINGS 6125 ALEXANDRIA', 'Bunnings', 'household');
trap('B', '2026-09-27', '2026-09-29', -4500, 'V1234 27/09 COLES 0712 ENMORE', 'Coles', 'groc');
trap('O', '2026-09-27', '2026-09-27', -41260, 'ORIGIN ENERGY BPAY 1144', 'Origin Energy', 'power');
trap('E', '2026-09-29', '2026-09-29', -2310, 'OFFICEWORKS 0412 ORDER 12/09 PICKUP', 'Officeworks', 'household');
trap('D', '2026-09-30', '2026-10-01', -4260, 'V1234 30/09 ALDI STORES 241 MARRICKVILLE', 'Aldi', 'groc');
trap('J', '2026-09-30', '2026-10-01', -6840, 'V1234 30/09 THAI POTHONG NEWTOWN', 'Thai Pothong', 'eatout');
trap('I', '2026-09-30', '2026-09-30', -85, 'ACCOUNT KEEPING FEE', 'NAB', null);
trap('I', '2026-09-30', '2026-09-30', 12, 'INTEREST PAID', 'NAB', '_income');
trap('U', '2026-10-02', '2026-10-02', -6435, 'POS 02/10 WOOLWORTHS/KING ST & CR   NEWTOWN', 'Woolworths', 'groc'); // still pending on the day of the file
bank = bank.filter(function (r) { return r.posted <= FILE_TO; });
bank.sort(function (a, c) { return a.posted < c.posted ? -1 : a.posted > c.posted ? 1 : a.date < c.date ? -1 : 1; });
function keyed(rows) { return E.classifyImport(ACCT, rows.map(function (r) { return { date: r.date, posted: r.posted, amt: r.amt, desc: r.desc }; }), []).map(function (c, i) { return Object.assign({}, rows[i], { ik: c.ik }); }); }

// ---------- what's in the app ----------
var SAV = 'acctsav01', tx = [];
function T(o) { var t = Object.assign({ id: id('t'), acct: ACCT, by: 'mock' }, o); tx.push(t); return t; }
function xferPair(t) { var p = T({ acct: SAV, date: t.date, payee: t.payee, cat: null, amt: -t.amt, transfer: ACCT, pair: t.id, cleared: t.cleared === 'u' ? 'u' : 'r' }); t.transfer = SAV; t.pair = p.id; t.cat = null; }
T({ date: '2026-04-01', payee: 'Starting balance', cat: '_income', amt: 320000, cleared: 'r' });
T({ acct: SAV, date: '2026-04-01', payee: 'Starting balance', cat: '_income', amt: 800000, cleared: 'r' });
// everything the bank posted up to 11 Sep: imported and reconciled
keyed(bank.filter(function (r) { return r.posted <= RECON; })).forEach(function (r) {
  var t = T({ date: r.date, posted: r.posted !== r.date ? r.posted : undefined, payee: r.payee, cat: r.cat, amt: r.amt, bank: r.desc, ik: r.ik, cleared: 'r' });
  if (r.xfer) xferPair(t);
});
// the pending lines that were imported then (and reconciled)
PEND.forEach(function (q) { T({ date: q.date, payee: q.payee, cat: q.cat, amt: q.amt, bank: q.desc, ik: keyed([{ date: q.date, posted: q.date, amt: q.amt, desc: q.desc }])[0].ik, cleared: 'r' }); });

// since 11 Sep: about two thirds of the ordinary purchases typed in by hand, one a day late
var handTyped = 0;
bank.filter(function (r) { return r.posted > RECON && !r.trap; }).forEach(function (r, i) {
  if (i % 3 === 2) return;
  var t = T({ date: handTyped === 1 ? add(r.date, 1) : r.date, payee: r.payee, cat: r.cat, amt: r.amt, cleared: 'u' });
  handTyped++;
  if (r.xfer) xferPair(t);
});
// the trap entries you typed
T({ date: '2026-09-15', payee: 'Ampol', cat: 'fuel', amt: -6500, cleared: 'u' });                                                   // A: one of the two fills
T({ date: '2026-09-18', payee: 'JB Hi-Fi', cat: 'household', amt: -5999, memo: 'Phone charger', cleared: 'u' });                     // R
T({ date: '2025-09-20', payee: 'Mitre 10', cat: 'household', amt: -3870, memo: 'Paint', cleared: 'u' });                             // Y: typed 2025 by mistake
T({ date: '2026-09-21', payee: 'Target', cat: 'clothes', amt: -2000, memo: 'Socks', cleared: 'u' });                                 // X (typed first)
T({ date: '2026-09-21', payee: 'Kmart', cat: 'household', amt: -2000, memo: 'Storage tubs', cleared: 'u' });                         // X
T({ date: '2026-09-22', payee: 'Woolworths', cat: null, splits: [{ cat: 'groc', amt: -15035 }, { cat: 'health', amt: -2250 }], amt: -17285, cleared: 'u' }); // H
T({ date: '2026-09-17', payee: 'Uniqlo', cat: 'clothes', amt: 3995, memo: 'Returned jeans', cleared: 'u' });                         // M: 6 days early
T({ date: '2026-09-24', payee: 'Cafe XO', cat: 'eatout', amt: -550, memo: 'Coffee with Sam', cleared: 'u' });                        // C
T({ date: '2026-09-24', payee: 'Cafe XO', cat: 'eatout', amt: -550, cleared: 'u' });                                                 // C
T({ date: '2026-09-24', payee: 'Petbarn', cat: 'household', amt: 3500, memo: 'Dog food', cleared: 'u' });                            // S: typed as money in
xferPair(T({ date: '2026-09-25', payee: 'Transfer to savings', amt: -50000, cleared: 'u' }));                                         // G
T({ acct: SAV, date: '2026-09-26', payee: 'Coles', cat: 'groc', amt: -6120, cleared: 'u' });                                         // W: wrong account
T({ date: '2026-09-26', payee: 'Bunnings', cat: 'household', amt: -5400, memo: 'Garden hose and pots', cleared: 'u' });              // B: should be 45.00
T({ date: '2026-09-27', payee: 'Coles', cat: 'groc', amt: -4500, cleared: 'u' });                                                    // B
T({ date: '2026-09-20', payee: 'Origin Energy', cat: 'power', amt: -41260, memo: 'Paid on the due date', cleared: 'u' });           // O: bank took it 7 days later
T({ date: '2026-09-28', payee: 'Grandma birthday', cat: 'clothes', amt: -5000, memo: 'Paid cash', cleared: 'u' });                   // L
T({ date: '2026-09-29', payee: 'Officeworks', cat: 'household', amt: -2310, memo: 'Printing', cleared: 'u' });                       // E
T({ date: '2026-09-30', payee: 'Aldi', cat: 'groc', amt: -4260, cleared: 'u' });                                                     // D
T({ date: '2026-09-30', payee: 'Aldi', cat: 'groc', amt: -4260, cleared: 'u' });                                                     // D (the duplicate)
T({ date: '2026-09-30', payee: 'Thai Pothong', cat: 'eatout', amt: -6840, memo: 'Friday dinner', cleared: 'u' });                    // J
T({ date: '2026-10-02', payee: 'Woolworths', cat: 'groc', amt: -6435, cleared: 'u' });                                               // U: still pending at the bank
T({ date: '2026-10-03', payee: 'Woolworths', cat: 'groc', amt: -8765, cleared: 'u' });                                               // N: today, not in the file

// ---------- assigned each month ----------
var months = {};
var plan = { mortgage: 210000, phone: 6500, internet: 8500, carins: 9200, power: 14000, groc: 90000, fuel: 24000, health: 8000, household: 15000, eatout: 25000, subs: 3500, clothes: 10000, holiday: 40000, emerg: 30000 };
['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'].forEach(function (m) { months[m] = { assigned: Object.assign({}, plan), moves: {} }; });
months['2026-10'] = { assigned: { mortgage: 210000, groc: 45000, fuel: 12000 }, moves: {} };
var income = tx.filter(function (t) { return t.cat === '_income'; }).reduce(function (a, t) { return a + t.amt; }, 0);
var given = 0; for (var mm in months) for (var c0 in months[mm].assigned) given += months[mm].assigned[c0];
var spare = income - given - 35000, six = ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09'];
months['2026-04'].assigned.emerg += 800000; spare -= 800000;
var each = Math.floor(spare / 12 / 100) * 100;
six.forEach(function (m) { months[m].assigned.holiday += each; months[m].assigned.emerg += each; });

// ---------- documents ----------
var txDocs = {};
tx.forEach(function (t) { Object.keys(t).forEach(function (k) { if (t[k] === undefined) delete t[k]; }); var m = t.date.slice(0, 7); (txDocs[m] = txDocs[m] || { t: {} }).t[t.id] = t; });
var rules = {};
bank.forEach(function (r) { var k = E.descKey(r.desc); if (k && r.cat && !rules[k] && !/^POS /.test(r.desc)) rules[k] = { payee: r.payee, cat: r.cat }; });
var sumW = function (f) { return tx.filter(f).reduce(function (s, t) { return s + t.amt; }, 0); };
var recEv = sumW(function (t) { return t.acct === ACCT && t.cleared === 'r'; }), recSav = sumW(function (t) { return t.acct === SAV && t.cleared === 'r'; });
var data = {
  meta: {
    cats: { items: cats },
    accounts: { items: { acctnab01: { id: ACCT, name: 'NAB Everyday', type: 'checking', closed: false, reconciledAt: RECON, reconciledBalance: recEv }, acctsav01: { id: SAV, name: 'NAB Savings', type: 'savings', closed: false, reconciledAt: RECON, reconciledBalance: recSav } } },
    rules: { items: rules }, imports: { items: {} }, settings: { currency: 'AUD' },
  },
  months: months, tx: txDocs,
};
save('mock-budget-2-backup.json', JSON.stringify({ app: 'zero-line', version: 1, exportedAt: '2026-10-03T09:00:00.000Z', data: data }, null, 1));

// ---------- the bank file: 6 Sep to 2 Oct, newest first, like NAB ----------
var file = bank.filter(function (r) { return r.posted >= FILE_FROM && r.posted <= FILE_TO; });
var qif = ['!Type:Bank'];
file.slice().reverse().forEach(function (r) { qif.push('D' + r.posted.slice(8, 10) + '/' + r.posted.slice(5, 7) + '/' + r.posted.slice(2, 4), 'T' + (r.amt / 100).toFixed(2), 'N' + (/^V1234 /.test(r.desc) ? '000000' : ''), 'P' + r.desc, '^'); });
save('NAB-Everyday-test-2.qif', qif.join('\r\n') + '\r\n');

var bankNow = 320000 + bank.reduce(function (s, r) { return s + r.amt; }, 0);
var bankAtRecon = 320000 + bank.filter(function (r) { return r.posted <= RECON; }).reduce(function (s, r) { return s + r.amt; }, 0) + PEND.reduce(function (s, q) { return s + q.amt; }, 0);
var savCorrect = 800000 + bank.filter(function (r) { return r.xfer; }).reduce(function (s, r) { return s - r.amt; }, 0);
JSON.stringify({ tx: tx.length, fileRows: file.length, bankAvailable2Oct: bankNow / 100, reconBal: recEv / 100, bankAtRecon: bankAtRecon / 100,
  appEverydayBefore: sumW(function (t) { return t.acct === ACCT; }) / 100, savingsApp: sumW(function (t) { return t.acct === SAV; }) / 100, savingsCorrect: savCorrect / 100 }, null, 1);
