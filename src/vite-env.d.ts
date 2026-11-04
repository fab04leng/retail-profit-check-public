/// <reference types="vite/client" />
interface ImportMetaEnv {
  /** True in the double-click "offline" build (no Web Worker). */
  readonly RPC_LOCAL: boolean;
}
