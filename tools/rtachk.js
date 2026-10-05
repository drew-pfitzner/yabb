ObjC.import('Foundation');
function rd(p) { return $.NSString.stringWithContentsOfFileEncodingError(p, 4, null).js; }
var self = this; var window = this;
eval(rd('app/engine.js'));
var E = this.Engine || window.Engine;
var base = 'scratch/real7/';
var fm = $.NSFileManager.defaultManager;
function ls(d) { return ObjC.deepUnwrap(fm.contentsOfDirectoryAtPathError(base + d, null)).filter(function (f) { return /\.json$/.test(f); }); }
var tx = []; ls('tx').forEach(function (f) { var t = JSON.parse(rd(base + 'tx/' + f)).t; for (var k in t) if (t[k]) tx.push(t[k]); });
var assigned = {}; ls('months').forEach(function (f) { assigned[f.slice(0, 7)] = JSON.parse(rd(base + 'months/' + f)).assigned || {}; });
var cats = JSON.parse(rd(base + 'meta/cats.json')).items || {};
var accts = JSON.parse(rd(base + 'meta/accounts.json')).items || {};
var debt = {}; for (var a in accts) if (accts[a] && accts[a].payCat) debt[a] = accts[a].payCat;
var out = [];
['2025-12','2026-03','2026-06','2026-09','2026-10','2026-11'].forEach(function (m) { var r = E.computeMonth({ cats: cats, tx: tx, assigned: assigned, debt: debt }, m); out.push(m + ' RTA ' + r.rta / 100); });
out.join('\n');
