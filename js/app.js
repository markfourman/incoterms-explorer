/* Incoterms Explorer - the interface. All numbers come from js/model.js. */
(function (IE) {
  'use strict';
  const M = IE.Model;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = (n) => '$' + Math.round(n).toLocaleString('en-CA');
  const st = { o: 3, d: 0, cargo: 0, code: 'FOB', margin: 0.1 };
  let est = null, terms = [], t0 = performance.now();

  // ---------- pickers ----------
  function chips(el, list, key, label) {
    el.innerHTML = list.map((x, i) => '<button type="button" class="chip" data-i="' + i + '" aria-pressed="' + (st[key] === i) + '">' +
      '<b>' + esc(x.city) + '</b><span>' + esc(x.country) + '</span></button>').join('');
    el.setAttribute('aria-label', label);
    el.onclick = (e) => { const b = e.target.closest('.chip'); if (b) { st[key] = +b.dataset.i; update(); } };
  }
  function cargoTiles() {
    $('cargo').innerHTML = M.CARGO.map((c, i) => '<button type="button" class="tile" data-i="' + i + '" aria-pressed="' + (st.cargo === i) + '">' +
      '<span class="tile-icon" aria-hidden="true">' + c.icon + '</span><b>' + esc(c.name) + '</b><span>' + esc(c.size) + '</span><em>' + esc(c.kind) + '</em></button>').join('');
    $('cargo').onclick = (e) => { const b = e.target.closest('.tile'); if (b) { st.cargo = +b.dataset.i; update(); } };
  }

  // ---------- the slider and term chips ----------
  function termStrip() {
    $('termStrip').innerHTML = M.TERMS.map((t) => {
      const off = !terms.includes(t);
      return '<button type="button" class="term g' + t.group + (t.code === st.code ? ' on' : '') + '" data-code="' + t.code + '"' +
        (off ? ' disabled title="Sea and inland waterway only"' : '') + '>' + t.code + (t.sea ? '<i aria-hidden="true">⚓</i>' : '') + '</button>';
    }).join('');
    const r = $('termRange');
    r.max = String(terms.length - 1);
    r.value = String(terms.findIndex((t) => t.code === st.code));
    r.setAttribute('aria-valuetext', est.term.code + ', ' + est.term.name);
  }

  function termCard() {
    const t = est.term, f = M.fit(t, est.cargo);
    const fitText = { great: 'A good fit for this cargo', ok: 'Works for this cargo', warn: 'Not ideal for containers' }[f];
    $('termCard').className = 'term-card g' + t.group;
    $('termCard').innerHTML = '<p class="term-group">' + esc(M.GROUPS[t.group]) + '</p>' +
      '<h3><span class="code">' + t.code + '</span> ' + esc(t.name) + '</h3>' +
      '<p class="badges"><span class="badge">' + (t.sea ? '⚓ Sea and inland waterway only' : '🌐 Any mode of transport') + '</span>' +
      '<span class="badge fit-' + f + '">' + (f === 'warn' ? '⚠️ ' : '✅ ') + fitText + '</span></p>';
  }

  // ---------- journey ----------
  function journey() {
    const S = M.stages(est.route);
    const owner = {};
    for (const it of est.items) {
      const sid = it.stage || (it.id === 'packing' ? 'seller' : it.id === 'importFee' ? 'import' : null);
      if (sid && !(sid in owner)) owner[sid] = it.payer;
    }
    $('journey').innerHTML = S.map((s, i) => {
      const risk = i <= est.riskAt ? 'seller' : 'buyer', cost = owner[s.id] || (i <= est.costAt ? 'seller' : 'buyer');
      return '<li class="stage' + (i === est.riskAt ? ' is-risk' : '') + (i === est.costAt ? ' is-cost' : '') + '">' +
        '<span class="stage-icon" aria-hidden="true">' + s.icon + '</span><span class="stage-label">' + esc(s.label) + '</span>' +
        (i === est.riskAt ? '<span class="marker m-risk">Risk passes here</span>' : '') +
        (i === est.costAt ? '<span class="marker m-cost">Seller pays to here</span>' : '') +
        '<span class="cell ' + risk + '"><span class="sr-only">Risk: </span>' + (risk === 'seller' ? 'Seller' : 'Buyer') + '</span>' +
        '<span class="cell ' + cost + '"><span class="sr-only">Cost: </span>' + (cost === 'seller' ? 'Seller' : 'Buyer') + '</span></li>';
    }).join('') + '<li class="token" id="token" aria-hidden="true">' + est.cargo.icon + '</li>';
    // On narrow screens, scroll the risk handoff into view.
    const sc = document.querySelector('.journey-scroll'), risk = $('journey').querySelector('.is-risk');
    if (sc && risk && sc.scrollWidth > sc.clientWidth) sc.scrollLeft = risk.offsetLeft - sc.clientWidth / 2 + risk.offsetWidth / 2;
    const duty = est.route.sea && est.term.code === 'DAP' ? ' (the buyer still pays import duties and taxes)' : '';
    $('journeySummary').textContent = est.term.code + ': risk passes to the buyer at “' + S[est.riskAt].label.toLowerCase() +
      '”, and the seller pays up to “' + S[est.costAt].label.toLowerCase() + '”' + duty + '.';
  }

  function moveToken(now) {
    const tok = $('token');
    if (tok) {
      const lis = $('journey').querySelectorAll('.stage');
      const n = lis.length, p = (((now - t0) / 1000) % 9) / 9 * (n - 1);
      const i = Math.floor(p), f = p - i;
      const a = lis[i], b = lis[Math.min(n - 1, i + 1)];
      const x = a.offsetLeft + a.offsetWidth / 2 + (b.offsetLeft - a.offsetLeft) * f;
      tok.style.transform = 'translateX(' + (x - 18) + 'px)';
      tok.classList.toggle('buyer', p > est.riskAt + 0.001);
    }
    requestAnimationFrame(moveToken);
  }

  // ---------- costs ----------
  function costs() {
    const e = est;
    $('kQuote').textContent = money(e.quote);
    $('kBuyer').textContent = money(e.buyerCosts);
    $('kLanded').textContent = money(e.landed);
    $('equation').innerHTML = '<span>Goods ' + money(e.goods) + '</span><b>+</b><span class="seller">Costs the seller arranges ' + money(e.sellerCosts) + '</span><b>+</b>' +
      '<span class="margin">Seller’s margin ' + money(e.sellerMargin) + '</span><b>=</b><span class="total">Seller’s price ' + money(e.quote) + '</span>';
    $('items').innerHTML = e.items.map((it) => '<tr><td>' + esc(it.label) + '</td><td><span class="who ' + it.payer + '">' +
      (it.payer === 'seller' ? 'Seller, in the price' : 'Buyer, separately') + '</span></td><td class="num">' + money(it.amount) + '</td></tr>').join('');
    // Compare every available term: seller-arranged costs (with margin) vs costs the buyer arranges.
    const all = terms.map((t) => M.estimate(st.o, st.d, st.cargo, t.code, st.margin));
    const max = Math.max(...all.map((x) => x.sellerCosts + x.sellerMargin + x.buyerCosts));
    $('bars').innerHTML = all.map((x) => {
      const s = ((x.sellerCosts + x.sellerMargin) / max) * 100, b = (x.buyerCosts / max) * 100;
      return '<button type="button" class="bar' + (x.term.code === st.code ? ' on' : '') + '" data-code="' + x.term.code + '" aria-label="' + x.term.code +
        ': seller arranges ' + money(x.sellerCosts + x.sellerMargin) + ', buyer arranges ' + money(x.buyerCosts) + '">' +
        '<span class="stack"><span class="b" style="height:' + b + '%"></span><span class="s" style="height:' + s + '%"></span></span><span class="bar-code">' + x.term.code + '</span></button>';
    }).join('');
  }

  // ---------- lessons ----------
  function lessons() {
    const e = est, t = e.term.code, c = e.cargo.id, out = [];
    if (!e.route.sea) out.push(['info', 'A domestic move', 'No ocean leg and no customs, so FAS, FOB, CFR and CIF are switched off. They’re for sea and inland waterway only.']);
    if (t === 'EXW') out.push(['warn', 'EXW in real life', 'Under EXW the buyer loads the goods. In practice the seller often loads the truck or container anyway, at the buyer’s risk. If the seller loads, FCA at the seller’s premises fits better.']);
    if (t === 'FCA') out.push(['good', 'The container-friendly F-term', 'Risk passes when the seller hands the goods to the buyer’s carrier. For containers that’s the terminal, which is where control really changes. FCA can also be named at the seller’s own dock.']);
    if (t === 'FOB' && c === 'container') out.push(['warn', 'FOB is often misused', 'A container is handed to the terminal days before it’s loaded, but under FOB the seller carries the risk until it’s on board. FCA moves the handoff to the terminal.']);
    else if (e.term.sea && c === 'container') out.push(['warn', 'Better for containers: FCA, CPT or CIP', 'Sea-only terms were made for cargo the seller places alongside or on board itself, like bulk or oversized goods.']);
    if (e.term.sea && c !== 'container') out.push(['good', 'Made for this cargo', c === 'bulk' ? 'Bulk sugar is loaded straight into the ship’s hold, so the sea-only terms fit naturally.' : 'Oversized cargo is lifted alongside or on board by crane, which is exactly what the sea-only terms describe.']);
    if (['CFR', 'CIF', 'CPT', 'CIP'].includes(t)) out.push(['info', 'Two critical points', 'Risk passes to the buyer near the start, but the seller pays freight all the way to the destination. The buyer carries the risk on a trip the seller booked.']);
    if (t === 'CIF') out.push(['info', 'CIF insurance', 'The seller must buy at least minimum cover (Institute Cargo Clauses C).']);
    if (t === 'CIP') out.push(['info', 'CIP insurance', 'Since Incoterms 2020, the seller must buy higher cover (Institute Cargo Clauses A), so it costs more than CIF cover.']);
    if (t === 'DAP') out.push(['info', 'DAP vs DDP', 'The seller delivers to the buyer’s door, but the buyer still clears import customs and pays duties.']);
    if (t === 'DPU') out.push(['info', 'DPU replaced DAT', 'Incoterms 2020 renamed DAT (Delivered at Terminal) to DPU, and the place can now be anywhere. It’s the only term where the seller unloads.']);
    if (t === 'DDP') out.push(e.route.sea ? ['warn', 'DDP is a big ask', 'The seller clears import customs and pays duties and taxes in the buyer’s country, which can mean registering there for tax. Many sellers add a buffer for that.']
      : ['info', 'DDP at home', 'On a domestic move there’s no import duty, so DDP costs the same as DAP.']);
    out.push(['tip', 'Sellers pass costs on', 'Whatever the seller arranges ends up in its price, usually with a margin on top. Drag the margin slider to see how much.']);
    $('lessons').innerHTML = out.map(([k, h, p]) => '<li class="lesson ' + k + '"><b>' + esc(h) + '</b><p>' + esc(p) + '</p></li>').join('');
  }

  // ---------- quiz ----------
  const QUIZ = [
    ['Risk passes once the goods are on board, but the seller pays the ocean freight. Which term?', ['FOB', 'CFR', 'DAP'], 1, 'CFR (and CIF, which adds insurance). Two critical points: risk at the origin, cost to the destination.'],
    ['Which terms are for sea and inland waterway only?', ['FAS, FOB, CFR and CIF', 'FCA, CPT and CIP', 'EXW and DDP'], 0, 'The other seven work with any mode of transport.'],
    ['You hand a sealed container to the terminal. Which term usually fits better than FOB?', ['EXW', 'FAS', 'FCA'], 2, 'FCA puts the handoff at the terminal, where you actually lose control of the container.'],
    ['Under EXW, who is responsible for loading the goods?', ['The buyer', 'The seller', 'The port'], 0, 'The buyer. If the seller loads anyway, FCA at the seller’s premises describes it better.'],
    ['Which term did DPU replace in Incoterms 2020?', ['DDU', 'DAT', 'DAP'], 1, 'DAT (Delivered at Terminal) became DPU (Delivered at Place Unloaded).'],
    ['Under DDP, who pays the import duties?', ['The buyer', 'The customs broker', 'The seller'], 2, 'The seller. That’s what “duty paid” means.'],
    ['Which term makes the seller buy the higher level of insurance?', ['CIP', 'CIF', 'CPT'], 0, 'CIP needs Institute Cargo Clauses A cover. CIF only needs the minimum, Clauses C.'],
    ['Sliding from EXW to DDP, the seller’s price usually…', ['Goes down', 'Goes up', 'Stays the same'], 1, 'It goes up: the seller arranges more of the trip and builds those costs, plus a margin, into the price.'],
  ];
  const qz = { order: [], i: 0, score: 0, picked: -1 };
  function newQuiz() {
    qz.order = QUIZ.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, 5);
    qz.i = 0; qz.score = 0; qz.picked = -1;
    renderQuiz();
  }
  function renderQuiz() {
    const box = $('quizBox');
    if (qz.i >= qz.order.length) {
      box.innerHTML = '<p class="quiz-score">You got ' + qz.score + ' of ' + qz.order.length + '.</p><button type="button" class="btn go" id="quizAgain">Play again</button>';
      $('quizAgain').onclick = newQuiz;
      return;
    }
    const [q, a, c, why] = QUIZ[qz.order[qz.i]];
    box.innerHTML = '<p class="quiz-count">Question ' + (qz.i + 1) + ' of ' + qz.order.length + '</p><p class="quiz-q">' + esc(q) + '</p><div class="answers">' +
      a.map((x, i) => '<button type="button" class="answer' + (qz.picked < 0 ? '' : i === c ? ' right' : i === qz.picked ? ' wrong' : ' dim') + '" data-i="' + i + '"' +
        (qz.picked >= 0 ? ' disabled' : '') + '>' + esc(x) + '</button>').join('') + '</div>' +
      (qz.picked >= 0 ? '<p class="quiz-why" role="status"><b>' + (qz.picked === c ? 'Correct! ' : 'Not quite. ') + '</b>' + esc(why) + '</p><button type="button" class="btn go" id="quizNext">Next question</button>' : '');
    box.querySelectorAll('.answer').forEach((b) => { b.onclick = () => { qz.picked = +b.dataset.i; if (qz.picked === c) qz.score++; renderQuiz(); }; });
    if ($('quizNext')) $('quizNext').onclick = () => { qz.i++; qz.picked = -1; renderQuiz(); $('quizBox').querySelector('button').focus(); };
  }

  // ---------- update everything ----------
  function update() {
    const r = M.route(st.o, st.d);
    terms = M.termsFor(r);
    if (!terms.some((t) => t.code === st.code)) st.code = 'FCA';
    est = M.estimate(st.o, st.d, st.cargo, st.code, st.margin);
    chips($('origins'), M.ORIGINS, 'o', 'Exporter location');
    chips($('dests'), M.DESTS, 'd', 'Importer location');
    cargoTiles();
    $('routeBadge').className = 'route-badge ' + r.kind;
    $('routeBadge').textContent = r.sea
      ? '🌊 Overseas: ocean freight from ' + r.originPort + ' to ' + r.destPort + ', with export and import customs'
      : '🛣️ Domestic: ' + est.cargo.landMode.toLowerCase() + ' all the way, no customs';
    termStrip(); termCard(); journey(); costs(); lessons();
  }

  function bind() {
    $('termRange').addEventListener('input', (e) => { st.code = terms[+e.target.value].code; update(); });
    $('termStrip').addEventListener('click', (e) => { const b = e.target.closest('.term'); if (b && !b.disabled) { st.code = b.dataset.code; update(); } });
    $('bars').addEventListener('click', (e) => { const b = e.target.closest('.bar'); if (b) { st.code = b.dataset.code; update(); } });
    $('margin').addEventListener('input', (e) => { st.margin = +e.target.value / 100; $('marginVal').textContent = e.target.value + '%'; update(); });
  }

  bind();
  update();
  newQuiz();
  requestAnimationFrame(moveToken);
  IE.App = { state: st, get estimate() { return est; } };
})(globalThis.IE = globalThis.IE || {});
