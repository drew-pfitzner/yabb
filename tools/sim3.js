ObjC.import('Foundation');
var E = this.Engine;
function rd(p) { return $.NSString.stringWithContentsOfFileEncodingError(p, 4, null).js; }
var dir = 'test-data/';
var bk = JSON.parse(rd(dir + 'mock-budget-2-backup.json')).data;
var all = []; for (var m in bk.tx) for (var k in bk.tx[m].t) all.push(bk.tx[m].t[k]);
var ex = all.filter(function (t) { return t.acct === 'acctnab01'; });
var byId = {}; ex.forEach(function (t) { byId[t.id] = t; });
var rows = E.parseQIF(rd(dir + 'NAB-Everyday-test-2.qif')).map(function (r) { var d = E.dateFromDesc(r.desc, r.date, 'dmy'); return Object.assign({}, r, { posted: r.date, date: d || r.date }); });
var c = E.classifyImport('acctnab01', rows, ex);
var out = [], counts = {};
c.forEach(function (r) {
  counts[r.status] = (counts[r.status] || 0) + 1;
  if (r.status === 'dupe') return;
  var o = byId[r.matchId || r.updateId];
  out.push(r.status + (r.amtFrom ? '(amt ' + r.amtFrom + ')' : '') + ' | ' + r.date + ' | ' + r.amt + ' | ' + r.desc.slice(0, 48) + (o ? '  ==> ' + o.date + ' ' + o.payee + ' ' + o.amt + (o.memo ? ' "' + o.memo + '"' : '') : ''));
});
var used = {}; c.forEach(function (r) { if (r.matchId) used[r.matchId] = 1; });
var left = ex.filter(function (t) { return t.cleared === 'u' && !used[t.id]; }).map(function (t) { return 'LEFT | ' + t.date + ' ' + t.payee + ' ' + t.amt; });
// approve everything blindly: updates replace amounts, matches keep, news add
var total = ex.reduce(function (s, t) { return s + t.amt; }, 0);
c.forEach(function (r) { if (r.status === 'new') total += r.amt; if (r.status === 'update') total += r.amt - byId[r.updateId].amt; });
JSON.stringify(counts) + '\n' + out.join('\n') + '\n' + left.join('\n') + '\nNAIVE TOTAL ' + total / 100;
