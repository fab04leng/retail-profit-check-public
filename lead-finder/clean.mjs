#!/usr/bin/env node
// Turns a gosom/google-maps-scraper results CSV into a short, deduped leads.csv.
// Usage: node clean.mjs [results.csv] [leads.csv]
// No dependencies; needs Node 18+.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const OUTPUT_COLUMNS = [
  'name', 'category', 'area', 'phone', 'website', 'email', 'rating', 'reviews',
  'segment', 'priority', 'brother-knows', 'status',
];

// Checked in order; first match wins.
const AREAS = [
  ['Gurney', /gurney/i],
  ['Bayan Lepas', /bayan lepas|bayan baru|queensbay/i],
  ['Bukit Jambul', /bukit jambul/i],
  ['Batu Kawan', /batu kawan|design village|ikea/i],
  ['Seberang Jaya', /seberang jaya|sunway carnival/i],
  ['Bukit Mertajam', /bukit mertajam/i],
  ['Butterworth', /butterworth/i],
  ['Batu Ferringhi', /batu ferringhi|tanjung bungah/i],
  ['George Town', /george ?town|jelutong|air itam|ayer itam|pulau tikus/i],
];

// Checked in order against the Google category first, then the shop name.
const SEGMENTS = [
  ['hotel-gift', /hotel|resort/i],
  ['pharmacy', /pharmac|farmasi|chemist|drug ?store/i],
  ['hardware', /hardware|perkakasan|home improvement/i],
  ['bakery', /bakery|bakeshop|roti|cake|pastry|confection/i],
  ['convenience', /convenience|7-eleven|family ?mart/i],
  ['minimart', /mini ?mart|mini ?market|grocery|supermarket|kedai runcit|provision/i],
  ['gift', /gift|souvenir|cenderamata/i],
  ['lifestyle', /lifestyle|home ?(decor|goods)|furnish|homeware|boutique|stationery|outlet|department/i],
];

// [minimum reviews, points] — first match wins.
const REVIEW_POINTS = [[200, 3], [50, 2], [10, 1]];
const WEBSITE_POINTS = 2;
const EMAIL_POINTS = 1;
const HIGH_SCORE = 4;
const MEDIUM_SCORE = 2;
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[a-z]{2,}$/i;

/** RFC 4180 CSV parser: handles quotes, escaped quotes, commas and newlines in fields. */
export function parseCsv(text) {
  const src = text.replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((cell) => cell.trim() !== ''));
  if (nonEmpty.length === 0) return [];
  const header = nonEmpty[0].map((h) => h.trim().toLowerCase());
  return nonEmpty.slice(1).map((r) => Object.fromEntries(header.map((h, idx) => [h, (r[idx] ?? '').trim()])));
}

// The scraper has renamed columns between versions, so accept a few spellings.
function pick(row, ...keys) {
  const key = keys.find((k) => row[k]);
  return key ? row[key] : '';
}

/** "+60 4-226 1234" -> "04-226 1234" (local format; also keeps Excel from reading "+" as a formula). */
export function normalizePhone(raw) {
  return raw.replace(/\s+/g, ' ').trim().replace(/^\+?60\s?/, '0');
}

/** Keeps only well-formed addresses, lower-cased and de-duplicated, joined with "; ". */
export function pickEmails(raw) {
  const found = raw
    .split(/[\s,;|[\]"']+/)
    .map((e) => e.replace(/^mailto:/i, '').toLowerCase())
    .filter((e) => EMAIL_RE.test(e));
  return [...new Set(found)].join('; ');
}

export function detectArea(text) {
  const hit = AREAS.find(([, re]) => re.test(text));
  return hit ? hit[0] : 'Other';
}

export function detectSegment(category, name) {
  const hit = SEGMENTS.find(([, re]) => re.test(category)) ?? SEGMENTS.find(([, re]) => re.test(name));
  return hit ? hit[0] : 'other';
}

export function scoreLead({ reviews, website, email }) {
  const reviewPoints = REVIEW_POINTS.find(([min]) => reviews >= min)?.[1] ?? 0;
  return reviewPoints + (website ? WEBSITE_POINTS : 0) + (email ? EMAIL_POINTS : 0);
}

export function priorityLabel(score) {
  if (score >= HIGH_SCORE) return 'High';
  if (score >= MEDIUM_SCORE) return 'Medium';
  return 'Low';
}

function toNumber(raw) {
  const n = Number.parseFloat(String(raw).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function isClosed(row) {
  // Only the status column: review text can mention "closed" without the shop being closed.
  return /permanent|closed permanently/i.test(pick(row, 'status', 'business_status'));
}

/** Maps one scraper row to a lead, or null if it has no name or is permanently closed. */
export function toLead(row) {
  const name = pick(row, 'title', 'name');
  if (!name || isClosed(row)) return null;
  const category = pick(row, 'category', 'categories');
  const website = pick(row, 'website', 'web_site');
  const email = pickEmails(pick(row, 'emails', 'email'));
  const reviews = toNumber(pick(row, 'review_count', 'reviews_count', 'reviews'));
  const rating = toNumber(pick(row, 'review_rating', 'rating'));
  const score = scoreLead({ reviews, website, email });
  const where = [pick(row, 'address'), pick(row, 'complete_address'), pick(row, 'input_id', 'query')].join(' ');
  return {
    id: pick(row, 'place_id', 'data_id', 'cid'),
    score,
    name,
    category,
    area: detectArea(where),
    phone: normalizePhone(pick(row, 'phone', 'phone_number')),
    website,
    email,
    rating: rating ? String(rating) : '',
    reviews: String(reviews),
    segment: detectSegment(category, name),
    priority: priorityLabel(score),
    'brother-knows': '',
    status: 'new',
  };
}

function dedupeKeys(lead) {
  const nameKey = lead.name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const keys = [`name:${nameKey}|${lead.area}`];
  if (lead.id) keys.push(`id:${lead.id}`);
  const digits = lead.phone.replace(/\D/g, '');
  if (digits) keys.push(`phone:${digits}`);
  return keys;
}

/** Dedupes by place id, phone, or name+area; keeps the richer copy. Sorted best first. */
export function cleanRows(rows) {
  const byKey = new Map();
  const kept = [];
  for (const lead of rows.map(toLead).filter(Boolean)) {
    const keys = dedupeKeys(lead);
    const existing = keys.map((k) => byKey.get(k)).find(Boolean);
    if (!existing) {
      kept.push(lead);
      keys.forEach((k) => byKey.set(k, lead));
      continue;
    }
    // The listing with more reviews is the "real" one; borrow missing contact details from the other.
    const [best, other] = Number(lead.reviews) > Number(existing.reviews) ? [lead, existing] : [existing, lead];
    const website = best.website || other.website;
    const email = best.email || other.email;
    const score = scoreLead({ reviews: Number(best.reviews), website, email });
    const final = { ...best, website, email, score, priority: priorityLabel(score) };
    kept[kept.indexOf(existing)] = final;
    byKey.forEach((v, k) => { if (v === existing) byKey.set(k, final); });
    keys.forEach((k) => byKey.set(k, final));
  }
  return [...kept].sort((a, b) => b.score - a.score || Number(b.reviews) - Number(a.reviews) || a.name.localeCompare(b.name));
}

function csvCell(value) {
  const raw = String(value ?? '');
  const text = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw; // block spreadsheet formula injection
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(leads) {
  const lines = [OUTPUT_COLUMNS.join(','), ...leads.map((lead) => OUTPUT_COLUMNS.map((c) => csvCell(lead[c])).join(','))];
  return `﻿${lines.join('\r\n')}\r\n`; // BOM so Excel shows Chinese/Malay text correctly
}

function main([input = 'results.csv', output = 'leads.csv']) {
  let text;
  try {
    text = readFileSync(input, 'utf8');
  } catch (err) {
    console.error(`Could not read ${input}: ${err.message}`);
    process.exit(1);
  }
  const rows = parseCsv(text);
  const leads = cleanRows(rows);
  writeFileSync(output, toCsv(leads));
  const counts = leads.reduce((acc, l) => ({ ...acc, [l.priority]: (acc[l.priority] ?? 0) + 1 }), {});
  console.log(`${rows.length} scraped rows -> ${leads.length} leads in ${output}`, counts);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2));
}
