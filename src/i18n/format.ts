export type Lang = 'en' | 'zh' | 'ms';

const LOCALE: Record<Lang, string> = { en: 'en-MY', zh: 'zh-MY', ms: 'ms-MY' };

const nf = new Map<string, Intl.NumberFormat>();
function numberFormat(lang: Lang, digits: number): Intl.NumberFormat {
  const key = `${lang}|${digits}`;
  let f = nf.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE[lang], { minimumFractionDigits: digits, maximumFractionDigits: digits });
    nf.set(key, f);
  }
  return f;
}

/** "RM 1,234.50"; negatives as "−RM 1,234.50". */
export function formatRM(n: number, lang: Lang = 'en', digits = 2): string {
  if (!Number.isFinite(n)) return '—';
  const s = numberFormat(lang, digits).format(Math.abs(n));
  return `${n < -0.0049 ? '−' : ''}RM ${s}`;
}

export function formatNum(n: number, lang: Lang = 'en', digits = 0): string {
  if (!Number.isFinite(n)) return '—';
  return numberFormat(lang, digits).format(n);
}

export function formatPct(n: number, lang: Lang = 'en'): string {
  if (!Number.isFinite(n)) return '—';
  return `${numberFormat(lang, 1).format(n)}%`;
}

/** ISO date → "16 Nov 2026" / "2026年11月16日" / "16 Nov 2026". */
export function formatDate(iso: string, lang: Lang = 'en'): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  if (lang === 'zh') return `${y}年${m}月${d}日`;
  const months = lang === 'ms' ? ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'] : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[m - 1]} ${y}`;
}

export type Params = Record<string, string | number | undefined | null>;

/** Replace {name} / {name:rm|pct|num|date} placeholders. Unknown values render as "—". */
export function interpolate(template: string, params: Params | undefined, lang: Lang): string {
  return template.replace(/\{(\w+)(?::(rm|pct|num|date))?\}/g, (_, name: string, type?: string) => {
    const v = params?.[name];
    if (v === undefined || v === null || v === '') return '—';
    if (type === 'rm') return formatRM(Number(v), lang);
    if (type === 'pct') return formatPct(Number(v), lang);
    if (type === 'num') return formatNum(Number(v), lang, Number(v) % 1 === 0 ? 0 : 1);
    if (type === 'date') return formatDate(String(v), lang);
    return String(v);
  });
}
