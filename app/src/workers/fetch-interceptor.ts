// Side-effect module: monkey-patches globalThis.fetch BEFORE any other
// module runs, so that @jsmarc/helper's format-loading IIFE resolves
// relative paths (formats.json, definitions/) against the app root
// instead of the worker script's subdirectory.

const _origFetch = globalThis.fetch.bind(globalThis)

// Worker URL is e.g. .../app/src/workers/marc.worker.ts (Vite dev)
// or .../assets/marc.worker.xxxxxx.js (production build).
// Going up one level from the worker reaches the app root directory.
const _location = (globalThis as Record<string, unknown>).location as
  | Location
  | undefined
const _appBase = new URL(
  "..",
  _location?.href || (import.meta as ImportMeta).url,
).href

globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (
    typeof input === "string" &&
    !input.startsWith("http") &&
    !input.startsWith("/")
  ) {
    return _origFetch(new URL(input, _appBase).href, init)
  }
  return _origFetch(input, init)
}) as typeof globalThis.fetch
