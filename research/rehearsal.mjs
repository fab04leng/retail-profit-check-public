#!/usr/bin/env node
// =============================================================================
// Retail Profit Check — Phase 7: SYNTHETIC objection rehearsal
// =============================================================================
//
// !!! THIS IS NOT MARKET VALIDATION !!!
//
// This script invents 200 SYNTHETIC Malaysian retail-owner personas and runs
// them through a hand-written, rule-based scoring model to produce "reactions"
// to three pitches. Every number it outputs is a direct consequence of the
// assumptions typed into this file by the founders' assistant. It contains no
// data from real owners. Its only legitimate use is to rehearse objections and
// prepare questions before the 10 real owner interviews.
//
// Deterministic: a seeded PRNG (mulberry32) is the only source of variation.
// Same seed + same file => byte-identical outputs.
//
// Usage:   node research/rehearsal.mjs
// Outputs: research/personas.json, research/rehearsal-summary.json
//          (plus markdown tables on stdout, used to draft REHEARSAL_REPORT.md)
//
// No external packages. Node 22+, ESM.
// =============================================================================

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SEED = 20261104; // fixed seed (date the rehearsal was written)
const N_PERSONAS = 200;
const MODEL_VERSION = '1.0.0';

// -----------------------------------------------------------------------------
// PRNG
// -----------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Two independent streams so that editing the reaction model does not change
// the personas (and vice versa).
const personaRng = mulberry32(SEED);
const reactionRng = mulberry32(SEED ^ 0x9e3779b9);

const chance = (rng, p) => rng() < p;
const randInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
function gaussian(rng) {
  // Box–Muller; 1 - rng() avoids log(0)
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function pickWeighted(rng, entries) {
  // entries: [[value, weight], ...]
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r < 0) return value;
  }
  return entries[entries.length - 1][0];
}
const round2 = (x) => Math.round(x * 100) / 100;

// -----------------------------------------------------------------------------
// PERSONA ATTRIBUTE ASSUMPTIONS
// All weights below are the assistant's judgement, NOT measured statistics.
// They aim to be plausible for the founders' likely outreach pool (Penang-heavy,
// independent retailers), not representative of Malaysia.
// -----------------------------------------------------------------------------

// Shop types. Fields:
//   w            relative frequency in the synthetic pool
//   pStock       probability the shop is "stock heavy" (lots of slow-moving SKUs/capital in stock)
//   pThin        probability of thin gross margins
//   sup          [min,max] active suppliers for a single outlet
//   skuHeavy     many SKUs -> per-product profit is hard to see by eye
//   seasonal     fashion/model-cycle stock that ages quickly
//   perishable   stock turns fast or spoils (less "trapped cash" in stock)
//   pCash        probability the shop is cash-heavy (more cash than card/e-wallet)
//   pPos         base probability of using a POS system
//   microMult    multiplier on the micro revenue-band weight (e.g. mall rent rules out micro)
//   digitalAdj   adjustment to the digital-comfort latent score
const SHOP_TYPES = [
  { key: 'minimart', label: 'Minimart / kedai runcit', w: 18, pStock: 0.65, pThin: 0.8, sup: [15, 40], skuHeavy: true, seasonal: false, perishable: false, pCash: 0.75, pPos: 0.7, microMult: 1.2, digitalAdj: -0.3 },
  { key: 'pharmacy', label: 'Community pharmacy', w: 8, pStock: 0.75, pThin: 0.4, sup: [10, 30], skuHeavy: true, seasonal: false, perishable: false, pCash: 0.4, pPos: 0.9, microMult: 0.4, digitalAdj: 0.2 },
  { key: 'fashion_mall', label: 'Fashion boutique (mall)', w: 9, pStock: 0.75, pThin: 0.3, sup: [3, 12], skuHeavy: false, seasonal: true, perishable: false, pCash: 0.25, pPos: 0.85, microMult: 0.4, digitalAdj: 0.3 },
  { key: 'phone_acc', label: 'Phone accessories', w: 9, pStock: 0.6, pThin: 0.6, sup: [3, 10], skuHeavy: true, seasonal: true, perishable: false, pCash: 0.55, pPos: 0.65, microMult: 1.1, digitalAdj: 0.5 },
  { key: 'bakery_cafe', label: 'Bakery / café retail', w: 8, pStock: 0.15, pThin: 0.5, sup: [5, 15], skuHeavy: false, seasonal: false, perishable: true, pCash: 0.5, pPos: 0.7, microMult: 1.0, digitalAdj: 0.1 },
  { key: 'hardware', label: 'Hardware shop', w: 8, pStock: 0.85, pThin: 0.5, sup: [10, 35], skuHeavy: true, seasonal: false, perishable: false, pCash: 0.65, pPos: 0.45, microMult: 0.8, digitalAdj: -0.4 },
  { key: 'cosmetics', label: 'Cosmetics / beauty retail', w: 7, pStock: 0.6, pThin: 0.4, sup: [4, 15], skuHeavy: true, seasonal: false, perishable: false, pCash: 0.35, pPos: 0.8, microMult: 0.8, digitalAdj: 0.3 },
  { key: 'hotel_gift', label: 'Hotel gift / souvenir shop', w: 3, pStock: 0.5, pThin: 0.3, sup: [5, 15], skuHeavy: false, seasonal: false, perishable: false, pCash: 0.3, pPos: 0.85, microMult: 0.6, digitalAdj: 0.1 },
  { key: 'books_stationery', label: 'Bookstore / stationery', w: 6, pStock: 0.8, pThin: 0.6, sup: [5, 20], skuHeavy: true, seasonal: true, perishable: false, pCash: 0.5, pPos: 0.7, microMult: 1.0, digitalAdj: 0.0 },
  { key: 'electrical', label: 'Electrical / home appliances', w: 6, pStock: 0.7, pThin: 0.6, sup: [5, 15], skuHeavy: false, seasonal: false, perishable: false, pCash: 0.45, pPos: 0.65, microMult: 0.5, digitalAdj: -0.1 },
  { key: 'sports', label: 'Sports goods', w: 5, pStock: 0.7, pThin: 0.4, sup: [4, 12], skuHeavy: false, seasonal: true, perishable: false, pCash: 0.35, pPos: 0.75, microMult: 0.8, digitalAdj: 0.2 },
  { key: 'kids_toys', label: 'Kids / toys', w: 5, pStock: 0.7, pThin: 0.45, sup: [4, 15], skuHeavy: true, seasonal: true, perishable: false, pCash: 0.4, pPos: 0.7, microMult: 0.9, digitalAdj: 0.1 },
  { key: 'pet_supplies', label: 'Pet supplies', w: 4, pStock: 0.55, pThin: 0.5, sup: [4, 12], skuHeavy: true, seasonal: false, perishable: false, pCash: 0.45, pPos: 0.6, microMult: 1.0, digitalAdj: 0.1 },
  { key: 'optical', label: 'Optical shop', w: 4, pStock: 0.65, pThin: 0.3, sup: [3, 10], skuHeavy: false, seasonal: false, perishable: false, pCash: 0.4, pPos: 0.6, microMult: 0.8, digitalAdj: 0.0 },
];

// Revenue bands, loosely aligned with SME Corporation Malaysia size bands
// (micro < RM300k; small RM300k–<RM3m; medium RM3m–RM20m for services/other
// sectors). "Small" is split in two because the pitch likely lands differently
// at RM500k vs RM2m. Weights skew small: independent retailers dominate the
// founders' reachable pool (assumption).
const REVENUE_BANDS = [
  { key: 'micro', label: '< RM300k', idx: 0, w: 28, staff: [1, 3] },
  { key: 'small_lo', label: 'RM300k–1M', idx: 1, w: 34, staff: [2, 6] },
  { key: 'small_hi', label: 'RM1M–3M', idx: 2, w: 22, staff: [5, 15] },
  { key: 'medium_lo', label: 'RM3M–10M', idx: 3, w: 12, staff: [12, 35] },
  { key: 'medium_hi', label: 'RM10M–20M', idx: 4, w: 4, staff: [30, 75] },
];

// Outlet count conditional on revenue band (assumption: more revenue -> more outlets).
const OUTLETS_BY_BAND = {
  micro: [[1, 92], [2, 8]],
  small_lo: [[1, 75], [2, 18], [3, 7]],
  small_hi: [[1, 45], [2, 28], [3, 17], [4, 10]],
  medium_lo: [[1, 20], [2, 25], [3, 25], [4, 15], [5, 10], [6, 5]],
  medium_hi: [[2, 10], [3, 25], [4, 25], [5, 20], [6, 20]],
};

// States: Penang over-weighted because the founders are in Penang and will
// most likely interview there first. Not a national distribution.
const STATES = [
  ['Penang', 30], ['KL/Selangor', 24], ['Johor', 11], ['Perak', 8], ['Kedah', 5],
  ['Melaka', 4], ['Negeri Sembilan', 4], ['Pahang', 3], ['Sabah', 5], ['Sarawak', 6],
];

// "Main language" = the language the owner prefers for business conversation.
// It is NOT a proxy for ethnicity. Conditional on state (rough assumptions).
// In Sabah/Sarawak, "Malay" also stands in for local languages and "Mandarin/Hokkien"
// also stands in for Hakka/Foochow speakers (simplification).
const LANG_BY_STATE = {
  Penang: [['Mandarin/Hokkien', 44], ['Malay', 24], ['English', 16], ['Tamil', 9], ['Cantonese', 7]],
  'KL/Selangor': [['Malay', 30], ['English', 24], ['Mandarin/Hokkien', 18], ['Cantonese', 20], ['Tamil', 8]],
  Johor: [['Malay', 38], ['Mandarin/Hokkien', 36], ['English', 15], ['Tamil', 6], ['Cantonese', 5]],
  Perak: [['Cantonese', 30], ['Malay', 34], ['Mandarin/Hokkien', 14], ['Tamil', 13], ['English', 9]],
  Sabah: [['Malay', 45], ['Mandarin/Hokkien', 25], ['English', 25], ['Cantonese', 3], ['Tamil', 2]],
  Sarawak: [['Malay', 42], ['Mandarin/Hokkien', 30], ['English', 24], ['Cantonese', 2], ['Tamil', 2]],
  _default: [['Malay', 55], ['Mandarin/Hokkien', 20], ['English', 10], ['Tamil', 10], ['Cantonese', 5]],
};

const AGE_BANDS = [
  { key: '20s', w: 8, digital: 1.2 },
  { key: '30s', w: 25, digital: 0.8 },
  { key: '40s', w: 30, digital: 0.2 },
  { key: '50s', w: 24, digital: -0.4 },
  { key: '60+', w: 13, digital: -1.0 },
];

// Accounting setup weights by revenue band (assumption: bigger shops have
// in-house clerks / monthly firms; micro shops hand a shoebox to a yearly accountant).
const ACCOUNTING_SETUPS = {
  shoebox_yearly: 'Shoebox of receipts + yearly accountant',
  bookkeeper_parttime: 'Part-time bookkeeper',
  inhouse_clerk: 'In-house accounts clerk',
  firm_monthly: 'Accountant firm, monthly service',
  pos_spreadsheet: 'POS + own spreadsheet',
  cloud_accounting: 'Cloud accounting app',
};
const ACCOUNTING_BY_BAND = {
  micro: { shoebox_yearly: 45, bookkeeper_parttime: 15, inhouse_clerk: 2, firm_monthly: 8, pos_spreadsheet: 22, cloud_accounting: 8 },
  small_lo: { shoebox_yearly: 28, bookkeeper_parttime: 22, inhouse_clerk: 8, firm_monthly: 14, pos_spreadsheet: 18, cloud_accounting: 10 },
  small_hi: { shoebox_yearly: 12, bookkeeper_parttime: 20, inhouse_clerk: 22, firm_monthly: 20, pos_spreadsheet: 12, cloud_accounting: 14 },
  medium_lo: { shoebox_yearly: 4, bookkeeper_parttime: 10, inhouse_clerk: 36, firm_monthly: 26, pos_spreadsheet: 6, cloud_accounting: 18 },
  medium_hi: { shoebox_yearly: 2, bookkeeper_parttime: 5, inhouse_clerk: 40, firm_monthly: 28, pos_spreadsheet: 3, cloud_accounting: 22 },
};
// Digital comfort multipliers on those weights.
const ACCOUNTING_DIGITAL_MULT = {
  low: { shoebox_yearly: 1.6, pos_spreadsheet: 0.6, cloud_accounting: 0.3 },
  medium: {},
  high: { shoebox_yearly: 0.6, pos_spreadsheet: 1.4, cloud_accounting: 2.0 },
};

const POS_USAGE = {
  none: 'No POS (manual / calculator)',
  register: 'Basic cash register only',
  pos_reports: 'POS with built-in reports',
  pos_linked: 'POS linked to accounting',
};

const DECISION = {
  sole: 'Sole owner decides',
  family: 'Family business (spouse/siblings/parents)',
  partners: 'Business partners',
};

// -----------------------------------------------------------------------------
// PERSONA GENERATION
// -----------------------------------------------------------------------------
function makePersona(i, rng) {
  const id = `P${String(i + 1).padStart(3, '0')}`;
  const shop = pickWeighted(rng, SHOP_TYPES.map((s) => [s, s.w]));
  const band = pickWeighted(
    rng,
    REVENUE_BANDS.map((b) => [b, b.w * (b.key === 'micro' ? shop.microMult : 1)]),
  );
  const outlets = pickWeighted(rng, OUTLETS_BY_BAND[band.key]);
  const staff = Math.min(120, randInt(rng, band.staff[0], band.staff[1]) + (outlets - 1) * 2);
  const state = pickWeighted(rng, STATES);
  const language = pickWeighted(rng, LANG_BY_STATE[state] ?? LANG_BY_STATE._default);
  const age = pickWeighted(rng, AGE_BANDS.map((a) => [a, a.w]));

  // Digital comfort: latent score = age effect + shop-type effect + 0.2 per
  // revenue band step + noise (sd 0.6). Thresholds: < -0.3 low, < 0.8 medium.
  const digitalLatent = age.digital + shop.digitalAdj + 0.2 * band.idx + 0.6 * gaussian(rng);
  const digital = digitalLatent < -0.3 ? 'low' : digitalLatent < 0.8 ? 'medium' : 'high';

  const accWeights = Object.entries(ACCOUNTING_BY_BAND[band.key]).map(([k, w]) => [
    k,
    w * (ACCOUNTING_DIGITAL_MULT[digital][k] ?? 1),
  ]);
  const accounting = pickWeighted(rng, accWeights);

  // POS: base by shop type, -0.2 for low digital comfort, +0.1 for high, +0.05 per band step.
  const pPos = Math.min(0.97, Math.max(0.05,
    shop.pPos + (digital === 'low' ? -0.2 : digital === 'high' ? 0.1 : 0) + 0.05 * band.idx));
  let pos;
  if (chance(rng, pPos)) {
    const pLinked = 0.08 + 0.05 * band.idx + (accounting === 'cloud_accounting' ? 0.45 : 0);
    pos = chance(rng, pLinked) ? 'pos_linked' : 'pos_reports';
  } else {
    pos = chance(rng, 0.6) ? 'register' : 'none';
  }

  // Decision structure: family businesses assumed common in minimart/hardware/bakery.
  const familyBoost = ['minimart', 'hardware', 'bakery_cafe', 'electrical'].includes(shop.key) ? 12 : 0;
  const partnerBoost = ['phone_acc', 'fashion_mall', 'cosmetics'].includes(shop.key) ? 8 : 0;
  const decision = pickWeighted(rng, [['sole', 45], ['family', 33 + familyBoost], ['partners', 17 + partnerBoost]]);

  // Pain attributes
  const stockHeavy = chance(rng, shop.pStock);
  const thinMargins = chance(rng, shop.pThin);
  const supplierCount = Math.round(randInt(rng, shop.sup[0], shop.sup[1]) * (1 + 0.25 * (outlets - 1)));
  const pastCashCrunch = chance(rng, 0.2 + (stockHeavy ? 0.2 : 0) + (thinMargins ? 0.15 : 0) + (band.idx <= 1 ? 0.1 : 0));
  // "Past invoice mistake" = the owner is AWARE of having been hit by a supplier
  // invoice error before. More suppliers -> more chances to have noticed one.
  const pastInvoiceMistake = chance(rng, Math.min(0.65, 0.12 + 0.012 * supplierCount + (accounting === 'shoebox_yearly' ? 0.08 : 0)));
  const cashHeavy = chance(rng, shop.pCash);

  // Derived (deterministic) data readiness
  const dataReadiness =
    pos === 'none' || (pos === 'register' && accounting === 'shoebox_yearly')
      ? 'paper'
      : pos === 'register' || accounting === 'shoebox_yearly'
        ? 'partial'
        : 'digital';

  return {
    id,
    descriptor: '', // filled below
    shopType: shop.key,
    shopTypeLabel: shop.label,
    revenueBand: band.key,
    revenueBandLabel: band.label,
    staff,
    outlets,
    state,
    language,
    ageBand: age.key,
    digitalComfort: digital,
    accountingSetup: accounting,
    accountingSetupLabel: ACCOUNTING_SETUPS[accounting],
    posUsage: pos,
    posUsageLabel: POS_USAGE[pos],
    decisionMaker: decision,
    pain: { stockHeavy, thinMargins, supplierCount, pastCashCrunch, pastInvoiceMistake, cashHeavy },
    dataReadiness,
  };
}

function describe(p) {
  return `${p.state} ${p.shopTypeLabel.toLowerCase()}, ${p.outlets} outlet${p.outlets > 1 ? 's' : ''}, ` +
    `${p.revenueBandLabel}/yr, ${p.staff} staff, owner in ${p.ageBand}, prefers ${p.language}, ` +
    `${p.digitalComfort} digital comfort, ${p.accountingSetupLabel.toLowerCase()}`;
}

// -----------------------------------------------------------------------------
// REACTION MODEL (rule-based)
// -----------------------------------------------------------------------------
// Interest score per persona x pitch:
//   raw = BASE + sum(weights of matching pitch rules) + sum(weights of matching
//         common rules) + NOISE_SD * gaussian()
//   interest = clamp(round(raw), 1, 5)
// Objection per persona x pitch:
//   for every objection in the catalogue, score = sum(weights of its matching
//   rules) + uniform(0, OBJ_NOISE); the highest score is the "top objection",
//   the runner-up is recorded as "second objection".
// Question: chosen deterministically from (top objection, pitch, interest) via
//   QUESTION_RULES below.
// -----------------------------------------------------------------------------

// TUNING NOTE (honesty log): after the first run, the PRICE objection won 40% of
// all reactions purely because its many small rules stack additively. Four
// objection weights were then adjusted once (marked "first draft" below) so
// that a single stacked rule does not mechanically dominate. Interest rules
// were NOT tuned. This tuning is itself an assumption: the real mix of
// objections can only come from the real interviews.
const BASE = 2.6;
const NOISE_SD = 0.5;
const OBJ_NOISE = 0.3;

const PITCHES = {
  A: 'See your real profit by product',
  B: 'Free up cash stuck in stock',
  C: 'Catch costly supplier invoice mistakes',
};

const SEASONAL = (p) => SHOP_TYPES.find((s) => s.key === p.shopType).seasonal;
const PERISHABLE = (p) => SHOP_TYPES.find((s) => s.key === p.shopType).perishable;
const SKU_HEAVY = (p) => SHOP_TYPES.find((s) => s.key === p.shopType).skuHeavy;
const BAND_IDX = (p) => REVENUE_BANDS.find((b) => b.key === p.revenueBand).idx;
const AGE_50PLUS = (p) => p.ageBand === '50s' || p.ageBand === '60+';

const INTEREST_RULES = {
  A: [
    { id: 'A1', desc: 'Thin margins', w: 0.9, when: (p) => p.pain.thinMargins },
    { id: 'A2', desc: 'SKU-heavy shop type (many products, hard to see margins by eye)', w: 0.5, when: SKU_HEAVY },
    { id: 'A3', desc: '2+ outlets (harder to see product profit across outlets)', w: 0.3, when: (p) => p.outlets >= 2 },
    { id: 'A4', desc: 'Past cash crunch ("where did the money go?")', w: 0.2, when: (p) => p.pain.pastCashCrunch },
    { id: 'A5', desc: 'POS already linked to accounting (already sees some margin data)', w: -0.6, when: (p) => p.posUsage === 'pos_linked' },
    { id: 'A6', desc: 'Uses cloud accounting app', w: -0.3, when: (p) => p.accountingSetup === 'cloud_accounting' },
  ],
  B: [
    { id: 'B1', desc: 'Stock heavy', w: 1.1, when: (p) => p.pain.stockHeavy },
    { id: 'B2', desc: 'Past cash crunch', w: 0.7, when: (p) => p.pain.pastCashCrunch },
    { id: 'B3', desc: '3+ outlets (stock spread across locations)', w: 0.3, when: (p) => p.outlets >= 3 },
    { id: 'B4', desc: 'Seasonal / model-cycle stock (fashion, phone, toys, sports, books)', w: 0.3, when: SEASONAL },
    { id: 'B5', desc: 'Perishable / fast-turn stock (bakery/café)', w: -0.9, when: PERISHABLE },
    { id: 'B6', desc: 'Micro revenue band (little stock value to free up)', w: -0.2, when: (p) => p.revenueBand === 'micro' },
  ],
  C: [
    { id: 'C1', desc: 'Has noticed a supplier invoice mistake before', w: 1.0, when: (p) => p.pain.pastInvoiceMistake },
    { id: 'C2', desc: '15+ active suppliers', w: 0.6, when: (p) => p.pain.supplierCount >= 15 },
    { id: 'C3', desc: '8–14 active suppliers', w: 0.3, when: (p) => p.pain.supplierCount >= 8 && p.pain.supplierCount < 15 },
    { id: 'C4', desc: 'Fewer than 6 suppliers', w: -0.5, when: (p) => p.pain.supplierCount < 6 },
    { id: 'C5', desc: 'Thin margins (price jumps hurt more)', w: 0.3, when: (p) => p.pain.thinMargins },
    { id: 'C6', desc: 'In-house clerk (owner believes invoices are already checked)', w: -0.3, when: (p) => p.accountingSetup === 'inhouse_clerk' },
    { id: 'C7', desc: 'Revenue RM1M+ (invoice volume large enough to matter)', w: 0.3, when: (p) => BAND_IDX(p) >= 2 },
  ],
};

const COMMON_RULES = [
  { id: 'G1', desc: 'High digital comfort', w: 0.35, when: (p) => p.digitalComfort === 'high' },
  { id: 'G2', desc: 'Low digital comfort', w: -0.45, when: (p) => p.digitalComfort === 'low' },
  { id: 'G3', desc: 'Owner aged 60+', w: -0.3, when: (p) => p.ageBand === '60+' },
  { id: 'G4', desc: 'Micro revenue band (< RM300k)', w: -0.3, when: (p) => p.revenueBand === 'micro' },
  { id: 'G5', desc: 'Already pays an accountant firm monthly (perceived substitute)', w: -0.25, when: (p) => p.accountingSetup === 'firm_monthly' },
  { id: 'G6', desc: 'Uses cloud accounting (data-ready, used to paying for software)', w: 0.15, when: (p) => p.accountingSetup === 'cloud_accounting' },
  { id: 'G7', desc: 'Records mostly on paper (data readiness = paper)', w: -0.4, when: (p) => p.dataReadiness === 'paper' },
];

// Objection catalogue. `when(p, pitch, interest)`.
const OBJECTIONS = [
  { key: 'PRICE', label: 'Price / no budget ("RM300 is a lot")', rules: [
    { desc: 'Base', w: 0.4, when: () => true }, // v1.0 first draft used 0.6; see TUNING NOTE
    { desc: 'Micro revenue band', w: 0.9, when: (p) => p.revenueBand === 'micro' },
    { desc: 'RM300k–1M band', w: 0.4, when: (p) => p.revenueBand === 'small_lo' },
    { desc: 'Thin margins', w: 0.3, when: (p) => p.pain.thinMargins },
    { desc: 'Past cash crunch', w: 0.2, when: (p) => p.pain.pastCashCrunch }, // first draft 0.3
    { desc: 'Revenue RM3M+', w: -0.6, when: (p) => BAND_IDX(p) >= 3 },
    { desc: 'Interested (4–5): objection shifts to cost', w: 0.3, when: (p, k, s) => s >= 4 },
  ] },
  { key: 'ACCOUNTANT', label: '"My accountant already does this"', rules: [
    { desc: 'Accountant firm monthly', w: 1.5, when: (p) => p.accountingSetup === 'firm_monthly' },
    { desc: 'Part-time bookkeeper', w: 0.9, when: (p) => p.accountingSetup === 'bookkeeper_parttime' },
    { desc: 'In-house clerk', w: 0.8, when: (p) => p.accountingSetup === 'inhouse_clerk' },
    { desc: 'Yearly accountant (shoebox)', w: 0.4, when: (p) => p.accountingSetup === 'shoebox_yearly' },
    { desc: 'Pitch C + in-house clerk ("my clerk checks invoices")', w: 0.3, when: (p, k) => k === 'C' && p.accountingSetup === 'inhouse_clerk' },
    { desc: 'Low interest (1–2): dismissive', w: 0.3, when: (p, k, s) => s <= 2 },
  ] },
  { key: 'PRIVACY', label: 'Data privacy / sharing files', rules: [
    { desc: 'Base', w: 0.3, when: () => true },
    { desc: 'Revenue RM1M+ (more to protect)', w: 0.4, when: (p) => BAND_IDX(p) >= 2 },
    { desc: 'Medium/high digital comfort (aware of scams and breaches)', w: 0.2, when: (p) => p.digitalComfort !== 'low' },
    { desc: 'Pitch C (supplier prices are commercially sensitive)', w: 0.3, when: (p, k) => k === 'C' },
    { desc: 'Pharmacy (sales may touch patient records)', w: 0.3, when: (p) => p.shopType === 'pharmacy' },
    { desc: 'Interested (4–5): practical concern before saying yes', w: 0.3, when: (p, k, s) => s >= 4 },
  ] },
  { key: 'AI_DISTRUST', label: 'Distrust of software/"AI" getting numbers right', rules: [
    { desc: 'Low digital comfort', w: 0.8, when: (p) => p.digitalComfort === 'low' },
    { desc: 'Owner 50+', w: 0.4, when: AGE_50PLUS },
    { desc: 'Shoebox setup', w: 0.3, when: (p) => p.accountingSetup === 'shoebox_yearly' },
  ] },
  { key: 'NO_TIME', label: 'No time', rules: [
    { desc: 'Base', w: 0.4, when: () => true },
    { desc: '≤3 staff (owner runs the counter)', w: 0.5, when: (p) => p.staff <= 3 },
    { desc: '3+ outlets (owner stretched)', w: 0.4, when: (p) => p.outlets >= 3 },
    { desc: 'Low digital comfort (exporting files is a chore)', w: 0.3, when: (p) => p.digitalComfort === 'low' },
    { desc: 'Bakery/café (owner on production line)', w: 0.3, when: PERISHABLE },
  ] },
  { key: 'POS_REPORTS', label: '"My POS already shows reports"', rules: [
    { desc: 'POS with reports', w: 1.0, when: (p) => p.posUsage === 'pos_reports' },
    { desc: 'POS linked to accounting', w: 1.3, when: (p) => p.posUsage === 'pos_linked' },
    { desc: 'Pitch A + has POS (POS sales reports look like "profit by product")', w: 0.4, when: (p, k) => k === 'A' && p.posUsage.startsWith('pos') },
    { desc: 'Pitch C (POS does not see supplier invoices)', w: -0.9, when: (p, k) => k === 'C' },
    { desc: 'Low interest (1–2): dismissive', w: 0.2, when: (p, k, s) => s <= 2 },
  ] },
  { key: 'MESSY_DATA', label: 'Data is messy / not digital', rules: [
    { desc: 'No POS', w: 1.3, when: (p) => p.posUsage === 'none' },
    { desc: 'Cash register only', w: 0.6, when: (p) => p.posUsage === 'register' },
    { desc: 'Shoebox setup', w: 0.6, when: (p) => p.accountingSetup === 'shoebox_yearly' },
    { desc: 'Low digital comfort', w: 0.4, when: (p) => p.digitalComfort === 'low' },
    { desc: 'Pitch C + shoebox (supplier invoices on paper)', w: 0.3, when: (p, k) => k === 'C' && p.accountingSetup === 'shoebox_yearly' },
  ] },
  { key: 'TOO_SMALL', label: '"Too small to need it"', rules: [
    { desc: 'Micro revenue band', w: 1.0, when: (p) => p.revenueBand === 'micro' },
    { desc: 'Single outlet', w: 0.3, when: (p) => p.outlets === 1 },
    { desc: 'Pitch C + fewer than 6 suppliers', w: 0.6, when: (p, k) => k === 'C' && p.pain.supplierCount < 6 },
    { desc: 'Low interest (1–2)', w: 0.4, when: (p, k, s) => s <= 2 },
    { desc: 'Revenue RM1M+', w: -0.8, when: (p) => BAND_IDX(p) >= 2 },
  ] },
  { key: 'RESULTS_FIRST', label: 'Prefers to see results first', rules: [
    { desc: 'Base', w: 0.8, when: () => true },
    { desc: 'High digital comfort (used to free trials)', w: 0.3, when: (p) => p.digitalComfort === 'high' },
    { desc: 'Interest 3–4 (curious but cautious)', w: 0.4, when: (p, k, s) => s === 3 || s === 4 },
  ] },
  { key: 'LANGUAGE', label: 'Language barrier', rules: [
    // Assumption: demo UI is English + Chinese; Bahasa Malaysia is planned, Tamil is not.
    { desc: 'Prefers Tamil (no Tamil UI or report planned)', w: 1.4, when: (p) => p.language === 'Tamil' }, // first draft 1.2
    { desc: 'Prefers Malay (BM UI not built yet)', w: 0.4, when: (p) => p.language === 'Malay' },
    { desc: 'Prefers Malay + low digital comfort', w: 0.4, when: (p) => p.language === 'Malay' && p.digitalComfort === 'low' },
    { desc: 'Prefers Cantonese + aged 60+ (spoken explanation needed)', w: 0.3, when: (p) => p.language === 'Cantonese' && p.ageBand === '60+' },
    { desc: 'Non-English speaker aged 60+', w: 0.2, when: (p) => p.language !== 'English' && p.ageBand === '60+' },
  ] },
  { key: 'TAX_FEAR', label: 'Fear of tax/authorities seeing data', rules: [
    { desc: 'Shoebox setup', w: 0.6, when: (p) => p.accountingSetup === 'shoebox_yearly' },
    { desc: 'Cash-heavy shop', w: 0.5, when: (p) => p.pain.cashHeavy },
    { desc: 'Revenue < RM1M', w: 0.2, when: (p) => BAND_IDX(p) <= 1 },
    { desc: 'Pitch A ("real profit" sounds like a tax number)', w: 0.3, when: (p, k) => k === 'A' },
  ] },
  { key: 'PARTNER', label: 'Partner/family decision', rules: [
    { desc: 'Family business', w: 0.9, when: (p) => p.decisionMaker === 'family' },
    { desc: 'Business partners', w: 1.0, when: (p) => p.decisionMaker === 'partners' },
    { desc: 'Revenue RM1M+', w: 0.2, when: (p) => BAND_IDX(p) >= 2 },
    { desc: 'Interest 3+ (decision is real enough to consult)', w: 0.2, when: (p, k, s) => s >= 3 },
  ] },
  { key: 'ALREADY_KNOW', label: '"I already know my shop by feel"', rules: [
    { desc: 'Owner 50+', w: 0.5, when: AGE_50PLUS },
    { desc: 'Single outlet', w: 0.3, when: (p) => p.outlets === 1 },
    { desc: '≤3 staff', w: 0.3, when: (p) => p.staff <= 3 },
    { desc: 'Pitch B (owners believe they know their slow stock)', w: 0.3, when: (p, k) => k === 'B' },
    { desc: 'Low interest (1–2)', w: 0.3, when: (p, k, s) => s <= 2 },
  ] },
  { key: 'SUPPLIER_TRUST', label: '"My suppliers are long-time, they won\'t overcharge"', rules: [
    { desc: 'Pitch C only', w: 0.8, when: (p, k) => k === 'C' }, // first draft 0.6
    { desc: 'Pitch C + owner 50+', w: 0.4, when: (p, k) => k === 'C' && AGE_50PLUS(p) },
    { desc: 'Pitch C + family business', w: 0.3, when: (p, k) => k === 'C' && p.decisionMaker === 'family' },
    { desc: 'Pitch C + has noticed an invoice mistake before', w: -0.8, when: (p, k) => k === 'C' && p.pain.pastInvoiceMistake },
  ] },
];

// Question catalogue with suggested HONEST answers. Answers deliberately avoid
// claims the founders cannot yet back up (no pilot results exist).
const QUESTIONS = {
  Q_PRICE_WORTH: {
    q: 'Why RM300? What exactly do I get for it?',
    a: 'One health check on your own files: profit by product, below-cost items, slow/dead stock value, possible duplicate or overpaid supplier invoices, price jumps and an 8-week cash outlook, with the findings reviewed by an ACCA accountant. We cannot promise it will find more than RM300 of issues; if it finds little, you will see that too. (Founders: decide and state the refund/"no findings" policy before interviews.)',
  },
  Q_MONTHLY: {
    q: 'After the pilot, how much is it per month, and can I stop any time?',
    a: 'We have not fixed the monthly price yet; we are testing it with pilot shops. The pilot itself has no lock-in. Ask back: "What would it need to show you each month to be worth paying for?" Do not quote a number you have not decided.',
  },
  Q_ACCOUNTANT_DIFF: {
    q: 'My accountant already handles my accounts. What is different?',
    a: 'Most accountants prepare statutory accounts and tax from summaries. This looks at transaction rows: margin per product, stock age, duplicate/overpaid supplier invoices. It is meant to complement your accountant, not replace them, and you can share the findings with them. If your accountant already does product-level and invoice checks, this may add little - say so.',
  },
  Q_CLERK_CHECKS: {
    q: 'My clerk already checks every invoice. What would you find that she misses?',
    a: 'Possibly nothing. The checks look for patterns that are hard to see by hand at volume: the same invoice number twice months apart, the same amount twice within 7 days, unit price rises over 5% against the previous price, payments that match no invoice. If nothing is found, that is useful confirmation of her work.',
  },
  Q_DATA_WHERE: {
    q: 'Where does my data go? Who can see it?',
    a: 'The tool runs in your web browser on your own computer; files are not uploaded and the page makes no network connections. The accountant only sees the findings you choose to show or share. (Founders: describe the exact review hand-over and put it in the pilot agreement, in line with PDPA.)',
  },
  Q_SUPPLIER_CONFIDENTIAL: {
    q: 'Will my supplier prices end up with other shops or my competitors?',
    a: 'No. Your files are not uploaded or pooled with other shops’ data, and nothing is compared across clients. Put a confidentiality clause in the pilot agreement so this is in writing.',
  },
  Q_ACCURACY: {
    q: 'How do I know the computer got my numbers right?',
    a: 'It is not AI: each check is a written rule, and every finding shows which rule fired and the exact rows in your file, so you can check it yourself. Findings are worded as "possible" or "needs review", and an accountant reviews them before you act. It can still be wrong if the input files are wrong.',
  },
  Q_TIME: {
    q: 'How much of my time will this take?',
    a: 'Give an honest range, not a promise: exporting sales, stock and supplier files, a session to map columns, then a walkthrough of findings. We can sit with you to do the export. (Founders: time the first pilots and update this answer with real numbers.)',
  },
  Q_POS_DIFF: {
    q: 'My POS already gives me sales reports. What is extra?',
    a: 'A POS usually shows what sold. This combines sales with stock cost and supplier invoices to show margin after cost, cash tied up in aging stock, and invoice problems the POS never sees. If your POS already shows margins by product with correct costs, the profit part may add little - ask them to show you what their POS report contains.',
  },
  Q_NO_DATA: {
    q: 'My records are mostly on paper / quite messy. Can it still work?',
    a: 'It needs at least a digital sales export and a stock list. If records are mostly paper, this is probably not a fit right now; say so rather than oversell. Partial use (e.g. only supplier invoices typed into a sheet) is possible but takes effort.',
  },
  Q_TOO_SMALL: {
    q: 'Is this only for bigger shops?',
    a: 'Smaller shops have fewer rows, so issues may be smaller in ringgit, and the RM300 may not pay back. Ask about their stock value and supplier count before deciding together whether it is worth it.',
  },
  Q_SEE_EXAMPLE: {
    q: 'Can you show me what it found for a shop like mine first?',
    a: 'Show the demo on clearly labelled synthetic data (a made-up Penang minimart). Say plainly that there are no real client results yet - you are looking for the first pilot shops. Do not present demo findings as typical.',
  },
  Q_SAVINGS: {
    q: 'How much money will I save?',
    a: 'We cannot promise a figure, and we have no real pilot results yet. The report shows RM amounts calculated from your own rows (e.g. value of stock unsold for 90+ days); what you recover depends on what you do with it.',
  },
  Q_LANGUAGE: {
    q: 'Can the report be in my language, or can someone explain it to me in it?',
    a: 'The tool is currently in English and Chinese; Bahasa Malaysia is planned; Tamil is not available. Say which languages the team can explain findings in, and do not promise translations you do not have.',
  },
  Q_TAX: {
    q: 'Will LHDN see this? Will it make my tax go up?',
    a: 'The tool does not send anything to anyone and it is not a tax filing. It is a management check for your own decisions. Your tax obligations are unchanged and remain between you and your tax agent. Do not imply it can help reduce or hide tax.',
  },
  Q_PARTNER: {
    q: 'Can you give me something to show my partner / family?',
    a: 'Yes: a one-page summary of what the check covers, the price, how data is handled, and the demo report (labelled as demo). Offer a short session with the partner too.',
  },
  Q_KNOW_SHOP: {
    q: 'I already know which items do not sell. What will you tell me that I do not know?',
    a: 'Maybe not much on the items themselves. What it adds is the ringgit value tied up in them and any items you did not expect. Offer a quick test: they name their 5 slowest items, then compare with the data.',
  },
  Q_DEAD_STOCK_ACTION: {
    q: 'If you find dead stock, what am I supposed to do with it?',
    a: 'The tool only identifies it and its value; options (clearance, bundling, return to supplier, stop reordering) are the owner’s decision, and the accountant can talk through the cash effect. No guarantee of recovering the cash.',
  },
  Q_SUPPLIER_TRUST: {
    q: 'My suppliers are long-time partners. Why would they overcharge me?',
    a: 'Most issues are honest errors: re-sent invoices, old price lists, paying the same invoice twice. The checks catch errors, they do not accuse anyone, and a finding is a polite question to raise with the supplier.',
  },
};

// Question choice rules (first match wins).
function chooseQuestion(objKey, pitch, interest, p) {
  switch (objKey) {
    case 'PRICE': return interest >= 4 ? 'Q_MONTHLY' : 'Q_PRICE_WORTH';
    case 'ACCOUNTANT': return pitch === 'C' && p.accountingSetup === 'inhouse_clerk' ? 'Q_CLERK_CHECKS' : 'Q_ACCOUNTANT_DIFF';
    case 'PRIVACY': return pitch === 'C' ? 'Q_SUPPLIER_CONFIDENTIAL' : 'Q_DATA_WHERE';
    case 'AI_DISTRUST': return 'Q_ACCURACY';
    case 'NO_TIME': return 'Q_TIME';
    case 'POS_REPORTS': return 'Q_POS_DIFF';
    case 'MESSY_DATA': return 'Q_NO_DATA';
    case 'TOO_SMALL': return 'Q_TOO_SMALL';
    case 'RESULTS_FIRST': return interest >= 4 ? 'Q_SAVINGS' : 'Q_SEE_EXAMPLE';
    case 'LANGUAGE': return 'Q_LANGUAGE';
    case 'TAX_FEAR': return 'Q_TAX';
    case 'PARTNER': return 'Q_PARTNER';
    case 'ALREADY_KNOW': return pitch === 'B' && interest >= 3 ? 'Q_DEAD_STOCK_ACTION' : 'Q_KNOW_SHOP';
    case 'SUPPLIER_TRUST': return 'Q_SUPPLIER_TRUST';
    default: throw new Error(`No question rule for ${objKey}`);
  }
}

function react(p, pitch, rng) {
  const matched = [];
  let raw = BASE;
  for (const r of [...INTEREST_RULES[pitch], ...COMMON_RULES]) {
    if (r.when(p)) {
      raw += r.w;
      matched.push(r.id);
    }
  }
  const noise = NOISE_SD * gaussian(rng);
  raw += noise;
  const interest = Math.min(5, Math.max(1, Math.round(raw)));

  const scored = OBJECTIONS.map((o) => {
    let s = 0;
    for (const r of o.rules) if (r.when(p, pitch, interest)) s += r.w;
    return { key: o.key, score: s + OBJ_NOISE * rng() };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0].key;
  const questionId = chooseQuestion(top, pitch, interest, p);
  return {
    pitch,
    interest,
    rawScore: round2(raw),
    matchedInterestRules: matched,
    topObjection: top,
    topObjectionLabel: OBJECTIONS.find((o) => o.key === top).label,
    secondObjection: scored[1].key,
    likelyQuestionId: questionId,
    likelyQuestion: QUESTIONS[questionId].q,
  };
}

// -----------------------------------------------------------------------------
// RUN
// -----------------------------------------------------------------------------
const personas = [];
for (let i = 0; i < N_PERSONAS; i++) {
  const p = makePersona(i, personaRng);
  p.descriptor = describe(p);
  personas.push(p);
}
for (const p of personas) {
  p.reactions = {};
  for (const k of Object.keys(PITCHES)) p.reactions[k] = react(p, k, reactionRng);
}

// -----------------------------------------------------------------------------
// AGGREGATES
// -----------------------------------------------------------------------------
const PK = Object.keys(PITCHES);
const countBy = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const sortDesc = (obj) => Object.fromEntries(Object.entries(obj).sort((a, b) => b[1] - a[1]));
const mean = (xs) => (xs.length ? round2(xs.reduce((s, x) => s + x, 0) / xs.length) : null);

function segmentTable(keyFn) {
  const groups = {};
  for (const p of personas) (groups[keyFn(p)] ??= []).push(p);
  const out = {};
  for (const [g, ps] of Object.entries(groups)) {
    const row = { n: ps.length };
    for (const k of PK) {
      row[`avg${k}`] = mean(ps.map((p) => p.reactions[k].interest));
      row[`share4plus${k}`] = round2(ps.filter((p) => p.reactions[k].interest >= 4).length / ps.length);
    }
    const best = [...PK].sort((a, b) => row[`avg${b}`] - row[`avg${a}`]);
    row.bestPitch = row[`avg${best[0]}`] - row[`avg${best[1]}`] < 0.15 ? `${best[0]}≈${best[1]}` : best[0];
    const objs = sortDesc(countBy(ps.flatMap((p) => PK.map((k) => p.reactions[k])), (r) => r.topObjection));
    row.topObjection = Object.keys(objs)[0];
    row.lowN = ps.length < 10;
    out[g] = row;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1].n - a[1].n));
}

const outletGroup = (p) => (p.outlets === 1 ? '1' : p.outlets <= 3 ? '2-3' : '4-6');
const allReactions = personas.flatMap((p) => PK.map((k) => p.reactions[k]));

const summary = {
  _warning:
    'SYNTHETIC SIMULATION. 200 invented personas scored by a hand-written rule-based model. ' +
    'Results reflect the assumptions coded in research/rehearsal.mjs, NOT real owners. ' +
    'Not evidence of demand or willingness to pay. Use only to rehearse objections and prepare interview questions.',
  modelVersion: MODEL_VERSION,
  seed: SEED,
  nPersonas: N_PERSONAS,
  pitches: PITCHES,
  personaDistributions: {
    shopType: sortDesc(countBy(personas, (p) => p.shopType)),
    revenueBand: countBy(personas, (p) => p.revenueBand),
    outlets: countBy(personas, (p) => p.outlets),
    state: sortDesc(countBy(personas, (p) => p.state)),
    language: sortDesc(countBy(personas, (p) => p.language)),
    ageBand: countBy(personas, (p) => p.ageBand),
    digitalComfort: countBy(personas, (p) => p.digitalComfort),
    accountingSetup: sortDesc(countBy(personas, (p) => p.accountingSetup)),
    posUsage: sortDesc(countBy(personas, (p) => p.posUsage)),
    decisionMaker: sortDesc(countBy(personas, (p) => p.decisionMaker)),
    dataReadiness: countBy(personas, (p) => p.dataReadiness),
    pain: {
      stockHeavy: personas.filter((p) => p.pain.stockHeavy).length,
      thinMargins: personas.filter((p) => p.pain.thinMargins).length,
      pastCashCrunch: personas.filter((p) => p.pain.pastCashCrunch).length,
      pastInvoiceMistake: personas.filter((p) => p.pain.pastInvoiceMistake).length,
      cashHeavy: personas.filter((p) => p.pain.cashHeavy).length,
      supplierCountMedian: [...personas.map((p) => p.pain.supplierCount)].sort((a, b) => a - b)[N_PERSONAS / 2],
    },
  },
  interestByPitch: Object.fromEntries(PK.map((k) => {
    const xs = personas.map((p) => p.reactions[k].interest);
    return [k, {
      mean: mean(xs),
      distribution: Object.fromEntries([1, 2, 3, 4, 5].map((s) => [s, xs.filter((x) => x === s).length])),
      share4plus: round2(xs.filter((x) => x >= 4).length / xs.length),
    }];
  })),
  bestPitchPerPersona: countBy(personas, (p) => {
    const max = Math.max(...PK.map((k) => p.reactions[k].interest));
    const winners = PK.filter((k) => p.reactions[k].interest === max);
    return winners.length === 1 ? winners[0] : 'tie';
  }),
  topObjections: {
    overall: sortDesc(countBy(allReactions, (r) => r.topObjection)),
    byPitch: Object.fromEntries(PK.map((k) => [k, sortDesc(countBy(personas, (p) => p.reactions[k].topObjection))])),
    amongInterested4plus: sortDesc(countBy(allReactions.filter((r) => r.interest >= 4), (r) => r.topObjection)),
    // How often each objection is the top OR runner-up objection (less sensitive
    // to one rule narrowly beating another).
    inTop2: sortDesc(countBy(allReactions.flatMap((r) => [r.topObjection, r.secondObjection]), (k) => k)),
  },
  objectionLabels: Object.fromEntries(OBJECTIONS.map((o) => [o.key, o.label])),
  likelyQuestions: {
    overall: sortDesc(countBy(allReactions, (r) => r.likelyQuestionId)),
    byPitch: Object.fromEntries(PK.map((k) => [k, sortDesc(countBy(personas, (p) => p.reactions[k].likelyQuestionId))])),
  },
  questionCatalogue: QUESTIONS,
  segments: {
    shopType: segmentTable((p) => p.shopType),
    revenueBand: segmentTable((p) => p.revenueBand),
    outlets: segmentTable(outletGroup),
    digitalComfort: segmentTable((p) => p.digitalComfort),
    accountingSetup: segmentTable((p) => p.accountingSetup),
    language: segmentTable((p) => p.language),
    posUsage: segmentTable((p) => p.posUsage),
    ageBand: segmentTable((p) => p.ageBand),
  },
  model: {
    formula: 'interest = clamp(round(BASE + Σ pitch rules + Σ common rules + NOISE_SD·N(0,1)), 1, 5); ' +
      'top objection = argmax over catalogue of (Σ matching objection rule weights + U(0, OBJ_NOISE))',
    BASE, NOISE_SD, OBJ_NOISE,
    interestRules: Object.fromEntries(PK.map((k) => [k, INTEREST_RULES[k].map(({ id, desc, w }) => ({ id, desc, w }))])),
    commonRules: COMMON_RULES.map(({ id, desc, w }) => ({ id, desc, w })),
    objectionRules: Object.fromEntries(OBJECTIONS.map((o) => [o.key, o.rules.map(({ desc, w }) => ({ desc, w }))])),
  },
};

const personasOut = {
  _warning: summary._warning,
  modelVersion: MODEL_VERSION,
  seed: SEED,
  pitches: PITCHES,
  personas,
};

writeFileSync(join(HERE, 'personas.json'), JSON.stringify(personasOut, null, 2) + '\n');
writeFileSync(join(HERE, 'rehearsal-summary.json'), JSON.stringify(summary, null, 2) + '\n');

// -----------------------------------------------------------------------------
// STDOUT: markdown tables (convenience for drafting the report)
// -----------------------------------------------------------------------------
const pct = (n, d) => `${Math.round((100 * n) / d)}%`;
const L = (k) => summary.objectionLabels[k];
const lines = [];
lines.push('SYNTHETIC SIMULATION — not real owners. Wrote research/personas.json and research/rehearsal-summary.json');
lines.push('');
lines.push('## Interest by pitch');
lines.push('| Pitch | Mean | 1 | 2 | 3 | 4 | 5 | Share 4–5 |');
lines.push('|---|---|---|---|---|---|---|---|');
for (const k of PK) {
  const s = summary.interestByPitch[k];
  lines.push(`| ${k}. ${PITCHES[k]} | ${s.mean.toFixed(2)} | ${[1, 2, 3, 4, 5].map((x) => s.distribution[x]).join(' | ')} | ${Math.round(s.share4plus * 100)}% |`);
}
lines.push('');
lines.push(`Best pitch per persona: ${JSON.stringify(summary.bestPitchPerPersona)}`);
lines.push('');
lines.push('## Objections overall (600 persona×pitch reactions)');
lines.push('| # | Objection | Count | Share | A | B | C |');
lines.push('|---|---|---|---|---|---|---|');
Object.entries(summary.topObjections.overall).forEach(([k, n], i) => {
  const bp = PK.map((pk) => summary.topObjections.byPitch[pk][k] ?? 0);
  lines.push(`| ${i + 1} | ${L(k)} | ${n} | ${pct(n, allReactions.length)} | ${bp.join(' | ')} |`);
});
lines.push('');
lines.push('### Objection appears as top or runner-up (600 reactions)');
lines.push('| Objection | Count | Share of reactions |');
lines.push('|---|---|---|');
for (const [o, n] of Object.entries(summary.topObjections.inTop2)) lines.push(`| ${L(o)} | ${n} | ${pct(n, allReactions.length)} |`);
lines.push('');
for (const k of PK) {
  lines.push(`### Pitch ${k} top objections`);
  lines.push('| Objection | Count | Share |');
  lines.push('|---|---|---|');
  for (const [o, n] of Object.entries(summary.topObjections.byPitch[k]).slice(0, 6)) lines.push(`| ${L(o)} | ${n} | ${pct(n, N_PERSONAS)} |`);
  lines.push('');
}
lines.push('### Among interested reactions (4–5)');
const nInt = allReactions.filter((r) => r.interest >= 4).length;
lines.push('| Objection | Count | Share |');
lines.push('|---|---|---|');
for (const [o, n] of Object.entries(summary.topObjections.amongInterested4plus)) lines.push(`| ${L(o)} | ${n} | ${pct(n, nInt)} |`);
lines.push('');
for (const [seg, table] of Object.entries(summary.segments)) {
  lines.push(`## Segment: ${seg}`);
  lines.push('| Segment | n | Avg A | Avg B | Avg C | 4–5 A | 4–5 B | 4–5 C | Highest | Most common objection |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const [g, r] of Object.entries(table)) {
    lines.push(`| ${g}${r.lowN ? ' *' : ''} | ${r.n} | ${r.avgA.toFixed(2)} | ${r.avgB.toFixed(2)} | ${r.avgC.toFixed(2)} | ${Math.round(r.share4plusA * 100)}% | ${Math.round(r.share4plusB * 100)}% | ${Math.round(r.share4plusC * 100)}% | ${r.bestPitch} | ${L(r.topObjection)} |`);
  }
  lines.push('');
}
lines.push('## Likely questions overall');
lines.push('| # | Question | Count |');
lines.push('|---|---|---|');
Object.entries(summary.likelyQuestions.overall).forEach(([q, n], i) => lines.push(`| ${i + 1} | ${q}: ${QUESTIONS[q].q} | ${n} |`));
lines.push('');
lines.push('## Distributions');
for (const [k, v] of Object.entries(summary.personaDistributions)) lines.push(`- ${k}: ${JSON.stringify(v)}`);
console.log(lines.join('\n'));
