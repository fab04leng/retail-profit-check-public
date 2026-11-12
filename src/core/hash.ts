/** Hashes used to tie accountant reviews to the exact data they were made on. */

/** Hex SHA-256 of raw file bytes. Falls back to a 64-bit FNV-1a pair where Web Crypto is unavailable. */
export async function contentHash(buffer: ArrayBuffer): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const digest = await subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  const bytes = new Uint8Array(buffer);
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ bytes.length;
  for (let i = 0; i < bytes.length; i++) {
    a = Math.imul(a ^ bytes[i]!, 0x01000193) >>> 0;
    b = Math.imul(b ^ bytes[i]!, 0x5bd1e995) >>> 0;
  }
  return `fnv-${a.toString(16)}${b.toString(16)}-${bytes.length}`;
}

/** Synchronous 64-bit FNV-1a pair over a string (not for security; for change detection). */
export function textHash(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x84222325;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x5bd1e995) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

/** JSON with object keys sorted, so equal values always give equal text. */
export function stableJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableJson).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableJson(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v) ?? 'null';
}
