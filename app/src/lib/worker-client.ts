import type { MarcRecord } from "@jsmarc/parser"
import type { ExplainedRecord, SearchResult } from "@jsmarc/helper"

let worker: Worker | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pending = new Map<string, { resolve: (value: any) => void; reject: (error: Error) => void }>()

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("../workers/marc.worker.ts", import.meta.url), { type: "module" })
    worker.onmessage = (e: MessageEvent<{ id: string; result?: unknown; error?: string }>) => {
      const { id, result, error } = e.data
      const handlers = pending.get(id)
      if (!handlers) return
      pending.delete(id)
      if (error) {
        handlers.reject(new Error(error))
      } else {
        handlers.resolve(result)
      }
    }
  }
  return worker
}

function send<T>(message: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID()
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, ...message })
  })
}

export function parseInWorker(record: string, options?: { toParse?: string; fields?: string; subfields?: string }): Promise<MarcRecord> {
  return send({ type: "parse", record, options })
}

export function filterInWorker(record: string, notation: string, values: string[], options?: { fields?: string; subfields?: string }): Promise<boolean> {
  return send({ type: "filter", record, notation, values, options })
}

export function explainInWorker(record: string, format: string, options?: { fields?: string; subfields?: string }): Promise<ExplainedRecord> {
  return send({ type: "explain", record, format, options })
}

export function searchInWorker(query: string, format: string): Promise<SearchResult[]> {
  return send({ type: "search", query, format })
}

export function terminateWorker(): void {
  if (worker) {
    worker.terminate()
    worker = null
    pending.clear()
  }
}
