/// <reference lib="webworker" />
import { EngineCore } from './core';
import type { Request, Response } from './protocol';

const engine = new EngineCore();
const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = async (e: MessageEvent<Request>) => {
  const req = e.data;
  let res: Response;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = await (engine[req.op] as (...a: any[]) => Promise<unknown>).apply(engine, req.args);
    res = { id: req.id, ok: true, value };
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'generic';
    res = { id: req.id, ok: false, error: { code, message: String((err as Error).message ?? err) } };
  }
  scope.postMessage(res);
};
