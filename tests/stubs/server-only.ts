// Test-only stub for the `server-only` package. The real package is a Next.js
// bundler hint with no runtime; tests run in plain Node so we map imports of
// `server-only` to this empty module via vitest.config.ts.
export {};
