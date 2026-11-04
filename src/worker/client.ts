import type { Mapping } from '../core/mapping';
import type { FileKind } from '../core/types';
import type { Settings } from '../rules/settings';
import { EngineCore } from './core';
import type { AnalysisPayload, DemoInfo, Engine, Request, Response, SourceRows, StagedMeta } from './protocol';

export class EngineError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

type Pending = { resolve: (v: unknown) => void; reject: (e: unknown) => void };
type Op = Request['op'];

/** Talks to the analysis Web Worker; falls back to running on the page. */
class WorkerEngine implements Engine {
  private nextId = 1;
  private pending = new Map<number, Pending>();
  constructor(private worker: Worker) {
    worker.onmessage = (e: MessageEvent<Response>) => {
      const p = this.pending.get(e.data.id);
      if (!p) return;
      this.pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data.value);
      else p.reject(new EngineError(e.data.error.code, e.data.error.message));
    };
    worker.onerror = () => {
      for (const p of this.pending.values()) p.reject(new EngineError('generic', 'worker error'));
      this.pending.clear();
    };
  }
  private call<T>(op: Op, args: unknown[], transfer: Transferable[] = []): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.worker.postMessage({ id, op, args } as Request, transfer);
    });
  }
  stageFile(kind: FileKind, fileName: string, buffer: ArrayBuffer, remembered?: unknown) {
    return this.call<StagedMeta>('stageFile', [kind, fileName, buffer, remembered], [buffer]);
  }
  loadDemo() {
    return this.call<{ staged: StagedMeta[]; demo: DemoInfo }>('loadDemo', []);
  }
  setMapping(kind: FileKind, mapping: Mapping) {
    return this.call<StagedMeta>('setMapping', [kind, mapping]);
  }
  remove(kind: FileKind) {
    return this.call<void>('remove', [kind]);
  }
  clear() {
    return this.call<void>('clear', []);
  }
  analyse(settings: Settings) {
    return this.call<AnalysisPayload>('analyse', [settings]);
  }
  getRows(kind: FileKind, rows: number[]) {
    return this.call<SourceRows>('getRows', [kind, rows]);
  }
}

/** Wrap the in-page engine so its errors look the same as worker errors. */
class InlineEngine implements Engine {
  private core = new EngineCore();
  private wrap<T>(p: Promise<T>): Promise<T> {
    return p.catch((err) => {
      throw new EngineError((err as { code?: string }).code ?? 'generic', String((err as Error).message ?? err));
    });
  }
  stageFile(kind: FileKind, fileName: string, buffer: ArrayBuffer, remembered?: unknown) {
    return this.wrap(this.core.stageFile(kind, fileName, buffer, remembered));
  }
  loadDemo() {
    return this.wrap(this.core.loadDemo());
  }
  setMapping(kind: FileKind, mapping: Mapping) {
    return this.wrap(this.core.setMapping(kind, mapping));
  }
  remove(kind: FileKind) {
    return this.wrap(this.core.remove(kind));
  }
  clear() {
    return this.wrap(this.core.clear());
  }
  analyse(settings: Settings) {
    return this.wrap(this.core.analyse(settings));
  }
  getRows(kind: FileKind, rows: number[]) {
    return this.wrap(this.core.getRows(kind, rows));
  }
}

/** Picks the worker if it starts and answers within 4 s; otherwise runs on the page. */
class AutoEngine implements Engine {
  private ready: Promise<Engine>;
  constructor() {
    this.ready = (async () => {
      try {
        if (typeof Worker === 'undefined') throw new Error('no worker');
        const w = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
        const engine = new WorkerEngine(w);
        await Promise.race([engine.clear(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
        return engine;
      } catch {
        return new InlineEngine();
      }
    })();
  }
  async stageFile(kind: FileKind, fileName: string, buffer: ArrayBuffer, remembered?: unknown) {
    return (await this.ready).stageFile(kind, fileName, buffer, remembered);
  }
  async loadDemo() {
    return (await this.ready).loadDemo();
  }
  async setMapping(kind: FileKind, mapping: Mapping) {
    return (await this.ready).setMapping(kind, mapping);
  }
  async remove(kind: FileKind) {
    return (await this.ready).remove(kind);
  }
  async clear() {
    return (await this.ready).clear();
  }
  async analyse(settings: Settings) {
    return (await this.ready).analyse(settings);
  }
  async getRows(kind: FileKind, rows: number[]) {
    return (await this.ready).getRows(kind, rows);
  }
}

let instance: Engine | null = null;

export function getEngine(): Engine {
  instance ??= new AutoEngine();
  return instance;
}
