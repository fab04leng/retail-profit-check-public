import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { detectPreset, presetById, presetMap } from '../core/adapters';
import { sanitizeMapping, validateMapping, type Mapping } from '../core/mapping';
import { clearAll as clearStorage, loadJSON, saveJSON } from '../core/storage';
import type { FileKind } from '../core/types';
import type { Lang } from '../i18n';
import type { ThresholdKey } from '../rules/rules.config';
import { clampThreshold, defaultCashflowInputs, defaultThresholds, mergeSettings, type CashflowInputs, type Settings } from '../rules/settings';
import { EngineError, getEngine } from '../worker/client';
import type { AnalysisPayload, StagedMeta } from '../worker/protocol';

export type ReviewStatus = 'confirmed' | 'not_issue' | 'needs_info';
export interface Review {
  status: ReviewStatus;
  note: string;
  at: string;
}

interface AppState {
  lang: Lang;
  setLang: (l: Lang) => void;
  reviewMode: boolean;
  setReviewMode: (v: boolean) => void;
  /** Layout preset id for new uploads, or 'auto'. */
  layout: string;
  setLayout: (id: string) => void;
  staged: Partial<Record<FileKind, StagedMeta>>;
  fileErrors: Partial<Record<FileKind, string>>;
  stageFile: (kind: FileKind, file: File) => Promise<void>;
  setMapping: (kind: FileKind, mapping: Mapping) => Promise<void>;
  removeFile: (kind: FileKind) => Promise<void>;
  isDemo: boolean;
  demoShop: string | null;
  loadDemo: () => Promise<boolean>;
  clearEverything: () => Promise<void>;
  settings: Settings;
  setThreshold: (key: ThresholdKey, value: number) => void;
  resetThresholds: () => void;
  setCashflow: (c: CashflowInputs) => void;
  payload: AnalysisPayload | null;
  busy: 'demo' | 'reading' | 'analysing' | null;
  analyse: () => Promise<boolean>;
  error: string | null;
  reviews: Record<string, Review>;
  setReview: (id: string, status: ReviewStatus | null, note?: string) => void;
  getRows: ReturnType<typeof getEngine>['getRows'];
}

const Ctx = createContext<AppState | null>(null);

function datasetKey(staged: Partial<Record<FileKind, StagedMeta>>): string {
  const text = Object.values(staged)
    .map((s) => `${s!.kind}:${s!.signature}:${s!.dataRowCount}:${s!.fileName}`)
    .sort()
    .join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16);
}

const isLang = (v: unknown): v is Lang => v === 'en' || v === 'zh' || v === 'ms';

function sanitizeReviews(v: unknown): Record<string, Review> {
  const out: Record<string, Review> = {};
  if (!v || typeof v !== 'object') return out;
  for (const [k, r] of Object.entries(v as Record<string, unknown>)) {
    if (!r || typeof r !== 'object') continue;
    const s = (r as Review).status;
    if (s !== 'confirmed' && s !== 'not_issue' && s !== 'needs_info') continue;
    out[k] = { status: s, note: String((r as Review).note ?? '').slice(0, 2000), at: String((r as Review).at ?? '').slice(0, 10) };
  }
  return out;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const engine = useMemo(() => getEngine(), []);
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = loadJSON('lang');
    return isLang(stored) ? stored : 'en';
  });
  const [reviewMode, setReviewModeState] = useState<boolean>(() => loadJSON('reviewMode') === true);
  const [layout, setLayoutState] = useState<string>(() => {
    const v = loadJSON('layout');
    return typeof v === 'string' && (v === 'auto' || presetById(v)) ? v : 'auto';
  });
  const setLayout = useCallback((id: string) => {
    setLayoutState(id);
    saveJSON('layout', id);
  }, []);
  const [staged, setStaged] = useState<Partial<Record<FileKind, StagedMeta>>>({});
  const [fileErrors, setFileErrors] = useState<Partial<Record<FileKind, string>>>({});
  const [isDemo, setIsDemo] = useState(false);
  const [demoShop, setDemoShop] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(() => mergeSettings({ thresholds: loadJSON('thresholds'), cashflow: loadJSON('cashflow.files') }));
  const [payload, setPayload] = useState<AnalysisPayload | null>(null);
  const [busy, setBusy] = useState<AppState['busy']>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const reviewKey = useRef<string | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  /** Bumped by every change to the loaded data; results from older analyses are dropped. */
  const runId = useRef(0);
  const skipSave = useRef(false);
  const bump = () => ++runId.current;

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    saveJSON('lang', l);
  }, []);
  const setReviewMode = useCallback((v: boolean) => {
    setReviewModeState(v);
    saveJSON('reviewMode', v);
  }, []);

  const runAnalysis = useCallback(
    async (s: Settings) => {
      const id = bump();
      setBusy('analysing');
      setError(null);
      try {
        const p = await engine.analyse(s);
        if (id !== runId.current) return false; // something changed while this ran
        setPayload(p);
        return true;
      } catch (e) {
        if (id === runId.current) setError(e instanceof EngineError ? e.code : 'generic');
        return false;
      } finally {
        if (id === runId.current) setBusy(null);
      }
    },
    [engine],
  );

  const loadReviewsFor = useCallback((key: string) => {
    reviewKey.current = key;
    setReviews(sanitizeReviews(loadJSON(`reviews.${key}`)));
  }, []);

  const stageFile = useCallback(
    async (kind: FileKind, file: File) => {
      bump();
      setBusy('reading');
      setFileErrors((e) => ({ ...e, [kind]: undefined }));
      try {
        if (isDemo) {
          await engine.clear();
          setStaged({});
          setIsDemo(false);
          setDemoShop(null);
          setPayload(null);
          setSettings((s) => mergeSettings({ thresholds: s.thresholds, cashflow: loadJSON('cashflow.files') }));
        }
        const buffer = await file.arrayBuffer();
        // Look up a remembered mapping for this layout after reading headers.
        let meta = await engine.stageFile(kind, file.name.slice(0, 120), buffer);
        const remembered = sanitizeMapping(kind, loadJSON(`mapping.${meta.signature}`), meta.headers.length);
        if (remembered && Object.keys(remembered).length) {
          const m = await engine.setMapping(kind, remembered);
          if (m.problems.length <= meta.problems.length) meta = { ...m, remembered: true };
          else await engine.setMapping(kind, meta.mapping); // keep engine and screen in step
        } else {
          // No remembered mapping: try the chosen (or detected) POS/accounting layout preset.
          const preset = layout === 'auto' ? detectPreset(kind, meta.headers) : presetById(layout);
          if (preset) {
            const pm = presetMap(kind, meta.headers, preset);
            if (validateMapping(kind, pm).length <= meta.problems.length && Object.keys(pm).length >= Object.keys(meta.mapping).length) {
              meta = await engine.setMapping(kind, pm);
            }
          }
        }
        setStaged((s) => ({ ...s, [kind]: meta }));
        setPayload(null);
      } catch (e) {
        setFileErrors((x) => ({ ...x, [kind]: e instanceof EngineError ? e.code : 'generic' }));
      } finally {
        setBusy(null);
      }
    },
    [engine, isDemo, layout],
  );

  const setMapping = useCallback(
    async (kind: FileKind, mapping: Mapping) => {
      bump();
      try {
        const meta = await engine.setMapping(kind, mapping);
        saveJSON(`mapping.${meta.signature}`, mapping);
        setStaged((s) => ({ ...s, [kind]: meta }));
        setPayload(null);
      } catch (e) {
        setFileErrors((x) => ({ ...x, [kind]: e instanceof EngineError ? e.code : 'generic' }));
      }
    },
    [engine],
  );

  const removeFile = useCallback(
    async (kind: FileKind) => {
      bump();
      await engine.remove(kind).catch(() => undefined);
      setStaged((s) => {
        const n = { ...s };
        delete n[kind];
        return n;
      });
      setFileErrors((e) => ({ ...e, [kind]: undefined }));
      setPayload(null);
    },
    [engine],
  );

  const loadDemo = useCallback(async () => {
    bump();
    setBusy('demo');
    setError(null);
    try {
      const { staged: metas, demo } = await engine.loadDemo();
      const st: Partial<Record<FileKind, StagedMeta>> = {};
      for (const m of metas) st[m.kind] = m;
      setStaged(st);
      setFileErrors({});
      setIsDemo(true);
      setDemoShop(demo.shopName);
      const stored = loadJSON('cashflow.demo');
      const s = mergeSettings({ thresholds: settingsRef.current.thresholds, cashflow: stored ?? { ...defaultCashflowInputs(), ...demo.cashflow } });
      skipSave.current = true; // runAnalysis below already uses these settings
      setSettings(s);
      loadReviewsFor('demo');
      return await runAnalysis(s);
    } catch (e) {
      setError(e instanceof EngineError ? e.code : 'generic');
      setBusy(null);
      return false;
    }
  }, [engine, runAnalysis, loadReviewsFor]);

  const analyse = useCallback(async () => {
    if (!isDemo) loadReviewsFor(`files.${datasetKey(staged)}`);
    return runAnalysis(settingsRef.current);
  }, [isDemo, staged, runAnalysis, loadReviewsFor]);

  const clearEverything = useCallback(async () => {
    bump();
    setBusy(null);
    await engine.clear().catch(() => undefined);
    clearStorage();
    skipSave.current = true;
    setStaged({});
    setFileErrors({});
    setIsDemo(false);
    setDemoShop(null);
    setPayload(null);
    setReviews({});
    reviewKey.current = null;
    setSettings(mergeSettings(null));
  }, [engine]);

  // Re-run the analysis shortly after thresholds or cash-flow inputs change.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    saveJSON('thresholds', settings.thresholds);
    saveJSON(isDemo ? 'cashflow.demo' : 'cashflow.files', settings.cashflow);
    if (!payload) return;
    const id = setTimeout(() => void runAnalysis(settings), 250);
    return () => clearTimeout(id);
    // Only settings changes should trigger this; payload/isDemo are read at that moment on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const setThreshold = useCallback((key: ThresholdKey, value: number) => {
    setSettings((s) => ({ ...s, thresholds: { ...s.thresholds, [key]: clampThreshold(key, value) } }));
  }, []);
  const resetThresholds = useCallback(() => setSettings((s) => ({ ...s, thresholds: defaultThresholds() })), []);
  const setCashflow = useCallback((c: CashflowInputs) => setSettings((s) => ({ ...s, cashflow: c })), []);

  const setReview = useCallback((id: string, status: ReviewStatus | null, note?: string) => {
    setReviews((r) => {
      const next = { ...r };
      if (status === null) delete next[id];
      else next[id] = { status, note: (note ?? r[id]?.note ?? '').slice(0, 2000), at: new Date().toISOString().slice(0, 10) };
      return next;
    });
    reviewsDirty.current = true;
  }, []);
  const reviewsDirty = useRef(false);
  useEffect(() => {
    if (!reviewsDirty.current || !reviewKey.current) return;
    reviewsDirty.current = false;
    saveJSON(`reviews.${reviewKey.current}`, reviews);
  }, [reviews]);

  const getRows = useMemo(() => engine.getRows.bind(engine), [engine]);
  const value = useMemo<AppState>(
    () => ({
      lang, setLang, reviewMode, setReviewMode, layout, setLayout, staged, fileErrors, stageFile, setMapping, removeFile,
      isDemo, demoShop, loadDemo, clearEverything, settings, setThreshold, resetThresholds, setCashflow,
      payload, busy, analyse, error, reviews, setReview, getRows,
    }),
    [lang, setLang, reviewMode, setReviewMode, layout, setLayout, staged, fileErrors, stageFile, setMapping, removeFile, isDemo, demoShop, loadDemo, clearEverything, settings, setThreshold, resetThresholds, setCashflow, payload, busy, analyse, error, reviews, setReview, getRows],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
}
