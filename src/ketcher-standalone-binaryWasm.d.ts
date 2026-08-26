// ketcher-standalone declares "./dist/binaryWasm" in package.json "exports" with
// import/require conditions but no "types", so TypeScript cannot reach the
// index.d.ts sitting right beside that entry (TS7016).
//
// Both entries' declaration files are the same single line —
// `export * from './infrastructure/services'` — so the two differ only in how the
// wasm is loaded at runtime, never in type surface. Re-exporting the root package
// is therefore exact rather than an approximation, and cannot drift from the
// subpath the way a hand-written signature would.
declare module 'ketcher-standalone/dist/binaryWasm' {
  export * from 'ketcher-standalone';
}
