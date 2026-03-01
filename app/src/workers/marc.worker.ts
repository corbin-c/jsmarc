// Fix relative fetch paths: the worker script is in assets/ but data files are in the app root.
// Compute the app base URL from the worker's own URL (go up one directory from assets/).
const _origFetch = globalThis.fetch.bind(globalThis)
const _appBase = new URL("..", (globalThis as any).location?.href || import.meta.url).href
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === "string" && !input.startsWith("http") && !input.startsWith("/")) {
    return _origFetch(new URL(input, _appBase).href, init)
  }
  return _origFetch(input, init)
}) as typeof globalThis.fetch

import { parseRecord, analyzeFieldNotation, type Field } from "@jsmarc/parser"
import { explainRecord, searchField, formats } from "@jsmarc/helper"

const defaultParseOptions = {
  fields: "\u001e",
  subfields: "\u001f",
}

type WorkerMessage =
  | { id: string; type: "parse"; record: string; options?: { toParse?: string; fields?: string; subfields?: string } }
  | { id: string; type: "filter"; record: string; notation: string; values: string[]; options?: { fields?: string; subfields?: string } }
  | { id: string; type: "explain"; record: string; format: string; options?: { fields?: string; subfields?: string } }
  | { id: string; type: "search"; query: string; format: string }

type WorkerResponse =
  | { id: string; result: unknown }
  | { id: string; error: string }

let formatsReady = false

async function ensureFormats(): Promise<void> {
  if (!formatsReady) {
    await formats
    formatsReady = true
  }
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { id, type } = e.data
  try {
    let result: unknown
    switch (type) {
      case "parse": {
        const { record, options } = e.data
        result = parseRecord(record, {
          ...defaultParseOptions,
          ...options,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        break
      }
      case "filter": {
        const { record, notation, values, options } = e.data
        const parsed = parseRecord(record, {
          ...defaultParseOptions,
          ...options,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        result = parsed.fields.some((field: Field) => {
          const filterFn = analyzeFieldNotation(notation)
          return filterFn.call({ parentCode: field.code }, field) && values.some(v => {
            if (field.value !== undefined) return field.value.includes(v)
            if (field.subfields) return Object.values(field.subfields).some((sf: unknown) => (sf as { value: string }).value.includes(v))
            return false
          })
        })
        if (!result) result = false
        break
      }
      case "explain": {
        await ensureFormats()
        const { record, format, options } = e.data
        const parsed = parseRecord(record, {
          ...defaultParseOptions,
          ...options,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        result = await explainRecord(parsed, format)
        break
      }
      case "search": {
        await ensureFormats()
        const { query, format } = e.data
        result = await searchField(query, format)
        break
      }
    }
    self.postMessage({ id, result } satisfies WorkerResponse)
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) } satisfies WorkerResponse)
  }
}
