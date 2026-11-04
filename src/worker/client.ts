import type { Mapping } from '../core/mapping';
import type { FileKind } from '../core/types';
import type { Settings } from '../rules/settings';
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
  private dead = false;
  constructor(private worker: Worker) {
    worker.onmessage = (e: MessageEvent<Response>) => {
      const p = this.pending.get(e.data.id);
      if (!p) return;
      this.pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data.value);
      else p.reject(new EngineError(e.data.error.code, e.data.error.message));
    };
    const fail = () => {
      // A crashed worker (e.g. out of memory on a huge file) is not reused.
      this.dead = true;
      worker.terminate();
      for (const p of this.pending.values()) p.reject(new EngineError('workerCrashed', 'worker error'));
      this.pending.clear();
    };
    worker.onerror = fail;
    worker.onmessageerror = fail;
  }
  terminate(): void {
    this.dead = true;
    this.worker.terminate();
  }
  private call<T>(op: Op, args: unknown[], transfer: Transferable[] = []): Promise<T> {
    if (this.dead) return Promise.reject(new EngineError('workerCrashed', 'worker stopped'));
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
  // Loaded only when the worker is unavailable, so the normal page download stays small.
  private core = import('./core').then((m) => new m.EngineCore());
  private async run<T>(f: (c: Engine) => Promise<T>): Promise<T> {
    try {
      return await f(await this.core);
    } catch (err) {
      throw new EngineError((err as { code?: string }).code ?? 'generic', String((err as Error).message ?? err));
    }
  }
  stageFile(kind: FileKind, fileName: string, buffer: ArrayBuffer, remembered?: unknown) {
    return this.run((c) => c.stageFile(kind, fileName, buffer, remembered));
  }
  loadDemo() {
    return this.run((c) => c.loadDemo());
  }
  setMapping(kind: FileKind, mapping: Mapping) {
    return this.run((c) => c.setMapping(kind, mapping));
  }
  remove(kind: FileKind) {
    return this.run((c) => c.remove(kind));
  }
  clear() {
    return this.run((c) => c.clear());
  }
  analyse(settings: Settings) {
    return this.run((c) => c.analyse(settings));
  }
  getRows(kind: FileKind, rows: number[]) {
    return this.run((c) => c.getRows(kind, rows));
  }
}

/** Picks the worker if it starts and answers within 4 s; otherwise runs on the page. */
class AutoEngine implements Engine {
  private ready: Promise<Engine>;
  constructor() {
    this.ready = (async () => {
      try {
        if (typeof Worker === 'undefined' || import.meta.env.RPC_LOCAL || location.protocol === 'file:') throw new Error('no worker');
        const w = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
        const engine = new WorkerEngine(w);
        try {
          await Promise.race([engine.clear(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
        } catch (e) {
          engine.terminate();
          throw e;
        }
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
