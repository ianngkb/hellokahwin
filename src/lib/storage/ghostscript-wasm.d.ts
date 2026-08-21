/**
 * Minimal ambient types for `@jspawn/ghostscript-wasm` (ships no types).
 * The default export of `gs.mjs` is the Emscripten module factory.
 */
declare module '@jspawn/ghostscript-wasm/gs.mjs' {
  interface GhostscriptModule {
    FS: {
      writeFile(path: string, data: Uint8Array): void;
      readFile(path: string): Uint8Array;
    };
    /** Runs gs `main(argv)`; returns the exit code (runtime is not torn down — noExitRuntime). */
    callMain(args: string[]): number;
  }
  interface GhostscriptModuleConfig {
    noInitialRun?: boolean;
    wasmBinary?: Uint8Array;
    instantiateWasm?(
      imports: WebAssembly.Imports,
      receiveInstance: (instance: WebAssembly.Instance) => void,
    ): Record<string, never>;
    print?(line: string): void;
    printErr?(line: string): void;
  }
  const initGhostscript: (config?: GhostscriptModuleConfig) => Promise<GhostscriptModule>;
  export default initGhostscript;
}
