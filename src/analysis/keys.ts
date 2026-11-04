/** Matching keys: case-, space- and punctuation-insensitive. */
export function skuKey(sku: string): string {
  return sku.trim().toUpperCase().replace(/\s+/g, '');
}

export function textKey(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
