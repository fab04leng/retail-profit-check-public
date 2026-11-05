import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  parseCsv, cleanRows, toCsv, OUTPUT_COLUMNS, normalizePhone, pickEmails, detectArea, detectSegment, scoreLead, priorityLabel,
} from '../clean.mjs';

const samplePath = fileURLToPath(new URL('./sample-results.csv', import.meta.url));
const rows = parseCsv(readFileSync(samplePath, 'utf8'));
const leads = cleanRows(rows);
const byName = (fragment) => leads.find((l) => l.name.includes(fragment));

test('parses quoted fields containing commas, quotes and newlines', () => {
  assert.equal(rows.length, 9);
  assert.equal(rows[3].title, 'Demo Hardware & Tools, Sdn Bhd');
  assert.match(rows[3].address, /7 Jalan Demo\n13700 Seberang Jaya/);
  assert.equal(rows[0].open_hours, '{"Monday":["8am-10pm"]}');
});

test('drops permanently closed shops and dedupes by place id and by phone', () => {
  assert.equal(byName('Closed Pharmacy'), undefined);
  assert.equal(leads.filter((l) => l.name === 'Kedai Contoh Mini Mart').length, 1);
  const pharmacies = leads.filter((l) => l.segment === 'pharmacy');
  assert.equal(pharmacies.length, 1, 'two listings sharing one phone collapse into one lead');
  assert.equal(pharmacies[0].name, 'Example Pharmacy Queensbay', 'keeps the listing with more reviews');
  assert.equal(pharmacies[0].website, 'https://example-pharmacy.example', 'borrows the website from the duplicate');
  assert.equal(leads.length, 6);
});

test('fills area, segment, phone, email and the extra columns', () => {
  const mart = byName('Kedai Contoh');
  assert.deepEqual(
    { area: mart.area, segment: mart.segment, phone: mart.phone, email: mart.email, priority: mart.priority, status: mart.status, bk: mart['brother-knows'] },
    { area: 'George Town', segment: 'minimart', phone: '04-000 0001', email: 'hello@contoh-minimart.example', priority: 'High', status: 'new', bk: '' },
  );
  assert.equal(byName('Gift Corner').area, 'Gurney');
  assert.equal(byName('Demo Hardware').email, 'sales@demo-hardware.example');
  assert.equal(byName('Demo Hardware').area, 'Seberang Jaya');
  assert.equal(byName('Example Bakery').segment, 'bakery');
  assert.equal(byName('Example Lifestyle').segment, 'lifestyle');
  assert.equal(byName('Example Lifestyle').area, 'Batu Kawan');
});

test('sorts best leads first: more reviews + website = higher priority', () => {
  assert.equal(leads[0].name, 'Kedai Contoh Mini Mart');
  assert.equal(leads.at(-1).priority, 'Low');
  assert.ok(scoreLead({ reviews: 300, website: 'x', email: '' }) > scoreLead({ reviews: 300, website: '', email: '' }));
  assert.ok(scoreLead({ reviews: 300, website: '', email: '' }) > scoreLead({ reviews: 5, website: '', email: '' }));
  assert.equal(priorityLabel(0), 'Low');
});

test('writes Excel-friendly CSV with the agreed columns and no formula injection', () => {
  const csv = toCsv(leads);
  assert.ok(csv.startsWith('﻿'));
  assert.equal(csv.split('\r\n')[0], `﻿${OUTPUT_COLUMNS.join(',')}`);
  assert.match(csv, /,'=HYPERLINK Example Lifestyle|^'=HYPERLINK/m);
  const roundTrip = parseCsv(csv);
  assert.equal(roundTrip.length, leads.length);
  assert.equal(roundTrip.find((r) => r.name.includes('Demo Hardware')).name, 'Demo Hardware & Tools, Sdn Bhd');
});

test('helpers handle edge cases', () => {
  assert.equal(normalizePhone('+6045550003'), '045550003');
  assert.equal(normalizePhone('04-111 2222'), '04-111 2222');
  assert.equal(pickEmails('["A@Shop.example","a@shop.example"] junk@'), 'a@shop.example');
  assert.equal(detectArea('somewhere in Ipoh'), 'Other');
  assert.equal(detectSegment('Store', 'Ah Seng Kedai Runcit'), 'minimart');
  assert.deepEqual(parseCsv(''), []);
});
