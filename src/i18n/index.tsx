import { createContext, useContext, useMemo, type ReactNode } from 'react';
import en, { type Dict } from './en';
import ms from './ms';
import { ruleTextEn, thresholdLabelsEn } from './rulesText.en';
import zh from './zh';
import { formatDate, formatNum, formatPct, formatRM, interpolate, type Lang, type Params } from './format';

export type { Lang } from './format';

const enFull: Dict = { ...en, ruleText: ruleTextEn, thresholdLabels: thresholdLabelsEn };
export const DICTS: Record<Lang, Dict> = { en: enFull, zh, ms };
export const LANGS: { code: Lang; label: string; htmlLang: string }[] = [
  { code: 'en', label: 'English', htmlLang: 'en' },
  { code: 'zh', label: '中文', htmlLang: 'zh-Hans' },
  { code: 'ms', label: 'Bahasa Melayu', htmlLang: 'ms' },
];

function lookup(dict: unknown, key: string): string | undefined {
  let cur: unknown = dict;
  for (const part of key.split('.')) {
    if (cur === null || typeof cur !== 'object' || !Object.prototype.hasOwnProperty.call(cur, part)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

export function translate(lang: Lang, key: string, params?: Params): string {
  const tpl = lookup(DICTS[lang], key) ?? lookup(enFull, key) ?? key;
  return interpolate(tpl, params, lang);
}

export interface I18n {
  lang: Lang;
  t: (key: string, params?: Params) => string;
  rm: (n: number) => string;
  num: (n: number, digits?: number) => string;
  pct: (n: number) => string;
  date: (iso: string) => string;
}

export function makeI18n(lang: Lang): I18n {
  return {
    lang,
    t: (key, params) => translate(lang, key, params),
    rm: (n) => formatRM(n, lang),
    num: (n, digits = 0) => formatNum(n, lang, digits),
    pct: (n) => formatPct(n, lang),
    date: (iso) => formatDate(iso, lang),
  };
}

const Ctx = createContext<I18n>(makeI18n('en'));

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo(() => makeI18n(lang), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  return useContext(Ctx);
}
