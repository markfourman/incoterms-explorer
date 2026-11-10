// Checks every route, cargo and Incoterm. Run with: node tests/model-test.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'model.js'), 'utf8'), ctx);
const M = ctx.IE.Model;
const fail = [];
const ok = (cond, msg) => { if (!cond) fail.push(msg); };
let n = 0;
for (let o = 0; o < M.ORIGINS.length; o++) for (let d = 0; d < M.DESTS.length; d++) for (let c = 0; c < M.CARGO.length; c++) {
  const r = M.route(o, d), terms = M.termsFor(r);
  ok(terms.length === (r.sea ? 11 : 7), 'wrong number of terms on ' + r.O.city + '>' + r.D.city);
  let prev = -1;
  for (const t of terms) {
    const e = M.estimate(o, d, c, t.code, 0); n++;
    const tag = r.O.city + '>' + r.D.city + ' ' + e.cargo.name + ' ' + t.code;
    ok(e.riskAt >= 0 && e.costAt >= 0, tag + ': missing risk or cost point');
    ok(e.costAt >= e.riskAt, tag + ': seller stops paying before risk passes');
    // Domestic moves have no import duty, so DDP costs the same as DAP (less than DPU). Everything else only goes up.
    if (!(t.code === 'DDP' && !r.sea)) ok(e.quote >= prev, tag + ': quote went down along the slider');
    if (t.code === 'DDP' && !r.sea) ok(e.quote === M.estimate(o, d, c, 'DAP', 0).quote, tag + ': domestic DDP should equal DAP');
    prev = e.quote;
    ok(Math.abs(e.landed - (e.goods + e.items.reduce((a, i) => a + i.amount, 0))) < 1, tag + ': costs do not add up');
    const who = (id) => (e.items.find((i) => i.id === id) || {}).payer;
    if (t.code === 'EXW') { ok(who('loading') === 'buyer', tag + ': EXW buyer loads'); ok(!r.sea || who('export') === 'buyer', tag + ': EXW buyer clears export'); }
    if (t.code === 'FCA') ok(who('loading') === 'seller', tag + ': FCA seller loads');
    if (t.code === 'DDP' && r.sea) ok(who('duty') === 'seller', tag + ': DDP seller pays duties');
    if (t.code === 'DAP' && r.sea) ok(who('duty') === 'buyer', tag + ': DAP buyer pays duties');
    if (t.code === 'DPU') ok(who('unloading') === 'seller', tag + ': DPU seller unloads');
    if (['CFR', 'CIF', 'CPT', 'CIP'].includes(t.code)) ok(e.costAt > e.riskAt, tag + ': C-terms have two critical points');
  }
  if (!r.sea) { let threw = false; try { M.estimate(o, d, c, 'FOB', 0); } catch (e) { threw = true; } ok(threw, 'FOB allowed on a domestic route'); }
}
for (let i = 0; i < M.PRESETS.length; i++) {
  const k = M.presetCase(i), terms = M.termsFor(k.route);
  let prev = -1;
  for (const t of terms) {
    const e = M.estimateCase(k, t.code, 0); n++;
    const tag = 'class example ' + (i + 1) + ' ' + t.code;
    ok(e.quote >= prev, tag + ': quote went down along the slider');
    prev = e.quote;
    ok(e.named.full.includes('Incoterms® 2020'), tag + ': named place missing');
    ok(e.named.side === (['E', 'F'].includes(t.group) ? 'origin' : 'destination'), tag + ': wrong named-place side');
    ok(e.books === (['E', 'F'].includes(t.group) ? 'buyer' : 'seller'), tag + ': wrong party books the main carriage');
    ok(e.insurance.required === (t.code === 'CIF' || t.code === 'CIP'), tag + ': insurance should only be required for CIF and CIP');
    ok(Math.abs(e.landed - (e.goods + e.items.reduce((a, x) => a + x.amount, 0))) < 1, tag + ': costs do not add up');
  }
  const exw = M.estimateCase(k, 'EXW', 0), ddp = M.estimateCase(k, 'DDP', 0);
  ok(exw.landed === ddp.landed, 'class example ' + (i + 1) + ': with no margin, the buyer’s total should be the same for every term');
}
if (fail.length) { console.log(fail.slice(0, 20).join('\n')); console.log('MODEL TEST FAILED: ' + fail.length + ' problem(s)'); process.exit(1); }
console.log('MODEL TEST PASSED: ' + n + ' route, cargo and Incoterm combinations checked.');
