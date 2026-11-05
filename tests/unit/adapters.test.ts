import { describe, expect, it } from 'vitest';
import { detectPreset, PRESETS, presetById, presetMap } from '../../src/core/adapters';
import { validateMapping } from '../../src/core/mapping';

describe('POS / accounting layout presets', () => {
  it('are all labelled unverified and cite where their names come from', () => {
    for (const p of PRESETS) {
      expect(p.verified).toBe(false);
      expect(p.sources.length).toBeGreaterThan(0);
      for (const list of Object.values(p.headers)) for (const h of list ?? []) expect(['documented', 'guess']).toContain(h.confidence);
    }
  });

  it('maps SQL Account style invoice headers', () => {
    const headers = ['DOCNO', 'DOCDATE', 'CODE', 'ITEMCODE', 'DESCRIPTION', 'QTY', 'UNITPRICE', 'AMOUNT'];
    const m = presetMap('invoices', headers, presetById('sqlaccount')!);
    expect(m).toMatchObject({ invoiceNo: 0, date: 1, supplier: 2, sku: 3, description: 4, qty: 5, unitPrice: 6, total: 7 });
    expect(validateMapping('invoices', m)).toEqual([]);
    expect(detectPreset('invoices', headers)?.id).toBe('sqlaccount');
  });

  it('maps a Loyverse-style sales export, preferring Net sales over Gross sales', () => {
    const headers = ['Date', 'Receipt number', 'Category', 'SKU', 'Item', 'Quantity', 'Gross sales', 'Discounts', 'Net sales', 'Store'];
    const m = presetMap('sales', headers, presetById('loyverse')!);
    expect(m.total).toBe(8);
    expect(m.outlet).toBe(9);
    expect(m.receipt).toBe(1);
    expect(detectPreset('sales', headers)?.id).toBe('loyverse');
  });

  it('falls back to normal detection for columns the preset does not know', () => {
    const m = presetMap('products', ['Item Code', 'Description', 'Balance Qty', 'Kos Seunit'], presetById('autocount')!);
    expect(m).toMatchObject({ sku: 0, name: 1, qtyOnHand: 2, unitCost: 3 });
  });

  it('does not guess a system from generic headers', () => {
    expect(detectPreset('sales', ['Date', 'SKU', 'Quantity', 'Total'])).toBeUndefined();
  });
});
