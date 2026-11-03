/* Incoterms Explorer - the model: terms, journey stages, cargo, routes and the cost estimate.
   No browser code here, so tests/model-test.js can check every combination with Node. */
(function (IE) {
  'use strict';

  // Ordered from the least to the most the seller does. risk = where risk passes to the buyer,
  // cost = the last point the seller pays to. ins = seller pays insurance, duty = seller pays import duties.
  const TERMS = [
    { code: 'EXW', name: 'Ex Works', group: 'E', sea: false, risk: 'seller', cost: 'seller' },
    { code: 'FCA', name: 'Free Carrier', group: 'F', sea: false, risk: 'carrier', cost: 'carrier' },
    { code: 'FAS', name: 'Free Alongside Ship', group: 'F', sea: true, risk: 'alongside', cost: 'alongside' },
    { code: 'FOB', name: 'Free On Board', group: 'F', sea: true, risk: 'onboard', cost: 'onboard' },
    { code: 'CPT', name: 'Carriage Paid To', group: 'C', sea: false, risk: 'carrier', cost: 'arrived' },
    { code: 'CFR', name: 'Cost and Freight', group: 'C', sea: true, risk: 'onboard', cost: 'arrived' },
    { code: 'CIF', name: 'Cost, Insurance and Freight', group: 'C', sea: true, risk: 'onboard', cost: 'arrived', ins: 'basic' },
    { code: 'CIP', name: 'Carriage and Insurance Paid To', group: 'C', sea: false, risk: 'carrier', cost: 'arrived', ins: 'full' },
    { code: 'DAP', name: 'Delivered at Place', group: 'D', sea: false, risk: 'atplace', cost: 'atplace', ins: 'basic' },
    { code: 'DPU', name: 'Delivered at Place Unloaded', group: 'D', sea: false, risk: 'unloaded', cost: 'unloaded', ins: 'basic' },
    { code: 'DDP', name: 'Delivered Duty Paid', group: 'D', sea: false, risk: 'atplace', cost: 'atplace', ins: 'basic', duty: true },
  ];

  const GROUPS = {
    E: 'Group E: the buyer collects',
    F: 'Group F: main carriage not paid by the seller',
    C: 'Group C: main carriage paid by the seller',
    D: 'Group D: the seller delivers to the destination',
  };

  const STAGES = {
    sea: [
      ['seller', 'Seller’s warehouse', '🏭'],
      ['loaded', 'Loaded on the truck', '🚚'],
      ['export', 'Export cleared', '📄'],
      ['carrier', 'Handed to the carrier at the port', '🤝'],
      ['alongside', 'Alongside the ship', '⚓'],
      ['onboard', 'On board the ship', '🚢'],
      ['arrived', 'Arrived at the destination port', '🌊'],
      ['portout', 'Unloaded at the port', '🏗️'],
      ['import', 'Import cleared', '🛃'],
      ['atplace', 'At the buyer’s door', '🚛'],
      ['unloaded', 'Unloaded at the buyer', '📦'],
    ],
    land: [
      ['seller', 'Seller’s warehouse', '🏭'],
      ['loaded', 'Loaded on the truck', '🚚'],
      ['carrier', 'Handed to the first carrier', '🤝'],
      ['arrived', 'Arrived at the destination terminal', '🏁'],
      ['atplace', 'At the buyer’s door', '🚛'],
      ['unloaded', 'Unloaded at the buyer', '📦'],
    ],
  };

  // Illustrative numbers in Canadian dollars. Real quotes depend on the lane, the season and the carrier.
  const CARGO = [
    {
      id: 'container', name: 'Laptops', icon: '💻', size: 'One 40-foot container', kind: 'Fits in a container', value: 250000,
      sea: { packing: 800, loading: 350, export: 250, toCarrier: 900, originHandling: 450, shipLoad: 300, main: 3200, destHandling: 500, importFee: 350, onCarriage: 1000, unloading: 300 },
      land: { packing: 800, loading: 350, toCarrier: 300, main: 2400, final: 450, unloading: 300 },
      insRate: 0.003, seaShip: 'Container ship', landMode: 'Truck',
    },
    {
      id: 'oversized', name: 'Power transformer', icon: '⚡', size: 'One 90-tonne unit', kind: 'Too big for a container', value: 1200000,
      sea: { packing: 6000, loading: 8000, export: 450, toCarrier: 15000, originHandling: 9000, shipLoad: 12000, main: 70000, destHandling: 9000, importFee: 800, onCarriage: 16000, unloading: 9000 },
      land: { packing: 6000, loading: 8000, toCarrier: 4000, main: 38000, final: 6000, unloading: 9000 },
      insRate: 0.005, seaShip: 'Heavy-lift ship', landMode: 'Heavy-haul truck',
    },
    {
      id: 'bulk', name: 'Raw sugar', icon: '🍬', size: '25,000 tonnes, loose', kind: 'A bulk commodity', value: 12500000,
      sea: { packing: 0, loading: 25000, export: 600, toCarrier: 250000, originHandling: 100000, shipLoad: 125000, main: 625000, destHandling: 150000, importFee: 1500, onCarriage: 280000, unloading: 40000 },
      land: { packing: 0, loading: 25000, toCarrier: 15000, main: 450000, final: 120000, unloading: 40000 },
      insRate: 0.002, seaShip: 'Bulk carrier', landMode: 'Rail hopper cars',
    },
  ];

  const ORIGINS = [
    { city: 'Toronto', country: 'Canada' },
    { city: 'Calgary', country: 'Canada' },
    { city: 'Shanghai', country: 'China' },
    { city: 'São Paulo', country: 'Brazil' },
  ];
  const DESTS = [
    { city: 'Montreal', country: 'Canada', tax: 0.05, port: 'Port of Montreal' },
    { city: 'Vancouver', country: 'Canada', tax: 0.05, port: 'Port of Vancouver' },
    { city: 'Hamburg', country: 'Germany', tax: 0.19, port: 'Port of Hamburg' },
    { city: 'Busan', country: 'South Korea', tax: 0.10, port: 'Port of Busan' },
  ];
  const ORIGIN_PORT = { Shanghai: 'Port of Shanghai', 'São Paulo': 'Port of Santos', Calgary: 'Port of Vancouver' };

  // How far the main leg is, compared with a typical lane (1.0).
  const FACTOR = {
    'Toronto>Hamburg': 1.0, 'Toronto>Busan': 1.3, 'Calgary>Hamburg': 1.4, 'Calgary>Busan': 0.9,
    'Shanghai>Montreal': 1.4, 'Shanghai>Vancouver': 0.9, 'Shanghai>Hamburg': 1.3, 'Shanghai>Busan': 0.4,
    'São Paulo>Montreal': 1.0, 'São Paulo>Vancouver': 1.4, 'São Paulo>Hamburg': 1.0, 'São Paulo>Busan': 1.6,
    'Toronto>Montreal': 0.5, 'Toronto>Vancouver': 1.6, 'Calgary>Montreal': 1.5, 'Calgary>Vancouver': 0.7,
  };

  function route(o, d) {
    const O = ORIGINS[o], D = DESTS[d];
    const sea = O.country !== D.country;
    const originPort = ORIGIN_PORT[O.city] || (D.city === 'Busan' ? 'Port of Vancouver' : 'Port of Montreal');
    return { O, D, sea, kind: sea ? 'sea' : 'land', factor: FACTOR[O.city + '>' + D.city] || 1, originPort, destPort: D.port };
  }

  function stages(r) { return STAGES[r.kind].map(([id, label, icon]) => ({ id, label, icon })); }
  function termsFor(r) { return TERMS.filter((t) => r.sea || !t.sea); }

  // Sea-only terms were made for cargo the seller can place alongside or on board itself.
  function fit(term, cargo) {
    if (term.sea && cargo.id === 'container') return 'warn';
    if (term.sea) return 'great';
    if (cargo.id === 'container' && ['FCA', 'CPT', 'CIP'].includes(term.code)) return 'great';
    return 'ok';
  }

  function costItems(r, cargo) {
    const c = cargo[r.kind], f = r.factor;
    const ins = { id: 'insurance', label: 'Cargo insurance', special: 'ins', amount: Math.round(cargo.value * cargo.insRate) };
    if (r.sea) {
      return [
        { id: 'packing', label: 'Packing and labels', special: 'always', amount: c.packing },
        { id: 'loading', label: 'Loading at the seller', stage: 'loaded', amount: c.loading },
        { id: 'export', label: 'Export clearance', stage: 'export', amount: c.export },
        { id: 'toCarrier', label: 'Truck or rail to ' + r.originPort, stage: 'carrier', amount: c.toCarrier },
        { id: 'originHandling', label: 'Port terminal handling', stage: 'alongside', amount: c.originHandling },
        { id: 'shipLoad', label: 'Loading onto the ship', stage: 'onboard', amount: c.shipLoad },
        { id: 'main', label: 'Ocean freight (' + cargo.seaShip.toLowerCase() + ')', stage: 'arrived', amount: Math.round(c.main * f) },
        ins,
        { id: 'destHandling', label: 'Unloading at ' + r.destPort, stage: 'portout', amount: c.destHandling },
        { id: 'importFee', label: 'Import clearance (customs broker)', special: 'import', amount: c.importFee },
        { id: 'duty', label: 'Import duties and taxes (estimate)', special: 'duty', amount: Math.round(cargo.value * r.D.tax) },
        { id: 'onCarriage', label: 'Delivery to the buyer', stage: 'atplace', amount: c.onCarriage },
        { id: 'unloading', label: 'Unloading at the buyer', stage: 'unloaded', amount: c.unloading },
      ];
    }
    return [
      { id: 'packing', label: 'Packing and labels', special: 'always', amount: c.packing },
      { id: 'loading', label: 'Loading at the seller', stage: 'loaded', amount: c.loading },
      { id: 'toCarrier', label: 'Pickup by the carrier', stage: 'carrier', amount: c.toCarrier },
      { id: 'main', label: cargo.landMode + ' freight', stage: 'arrived', amount: Math.round(c.main * f) },
      ins,
      { id: 'final', label: 'Delivery to the buyer', stage: 'atplace', amount: c.final },
      { id: 'unloading', label: 'Unloading at the buyer', stage: 'unloaded', amount: c.unloading },
    ];
  }

  function payer(item, term, order) {
    if (item.special === 'always') return 'seller';
    if (item.special === 'ins') return term.ins ? 'seller' : 'buyer';
    if (item.special === 'import' || item.special === 'duty') return term.duty ? 'seller' : 'buyer';
    return order.indexOf(item.stage) <= order.indexOf(term.cost) ? 'seller' : 'buyer';
  }

  // The estimate. margin = the extra a seller adds when it arranges freight and services for the buyer.
  function estimate(o, d, cargoIdx, code, margin) {
    const r = route(o, d), cargo = CARGO[cargoIdx];
    const term = TERMS.find((t) => t.code === code);
    if (!term) throw new Error('Unknown term ' + code);
    if (term.sea && !r.sea) throw new Error(code + ' is for sea and inland waterway only');
    const order = stages(r).map((s) => s.id);
    const items = costItems(r, cargo).map((it) => {
      let amount = it.amount;
      if (it.special === 'ins' && term.ins === 'full') amount = Math.round(amount * 1.3);
      return Object.assign({}, it, { amount, payer: payer(it, term, order) });
    });
    const sellerCosts = items.filter((i) => i.payer === 'seller').reduce((a, i) => a + i.amount, 0);
    const buyerCosts = items.filter((i) => i.payer === 'buyer').reduce((a, i) => a + i.amount, 0);
    const sellerMargin = Math.round(sellerCosts * margin);
    const quote = cargo.value + sellerCosts + sellerMargin;
    return {
      route: r, cargo, term, items, order,
      riskAt: order.indexOf(term.risk), costAt: order.indexOf(term.cost),
      goods: cargo.value, sellerCosts, sellerMargin, quote, buyerCosts, landed: quote + buyerCosts,
    };
  }

  IE.Model = { TERMS, GROUPS, STAGES, CARGO, ORIGINS, DESTS, route, stages, termsFor, fit, estimate };
})(globalThis.IE = globalThis.IE || {});
