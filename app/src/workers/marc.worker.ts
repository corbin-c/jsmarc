import { parseRecord, analyzeFieldNotation, type Field } from "@jsmarc/parser"

const defaultParseOptions = {
  fields: "\u001e",
  subfields: "\u001f",
}

type WorkerMessage =
  | { id: string; type: "parse"; record: string; options?: { toParse?: string; fields?: string; subfields?: string } }
  | { id: string; type: "filter"; record: string; notation: string; values: string[]; options?: { fields?: string; subfields?: string } }
  | { id: string; type: "parseBatch"; records: string[]; options?: { toParse?: string; fields?: string; subfields?: string } }
  | { id: string; type: "filterBatch"; records: string[]; notation: string; values: string[]; options?: { fields?: string; subfields?: string } }

type WorkerResponse =
  | { id: string; result: unknown }
  | { id: string; error: string }

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
      case "parseBatch": {
        const { records, options } = e.data
        result = records.map(record =>
          parseRecord(record, {
            ...defaultParseOptions,
            ...options,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
        )
        break
      }
      case "filterBatch": {
        const { records, notation, values, options } = e.data
        result = records.map(record => {
          const parsed = parseRecord(record, {
            ...defaultParseOptions,
            ...options,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
          const matches = parsed.fields.some((field: Field) => {
            const filterFn = analyzeFieldNotation(notation)
            return filterFn.call({ parentCode: field.code }, field) && values.some(v => {
              if (field.value !== undefined) return field.value.includes(v)
              if (field.subfields) return Object.values(field.subfields).some((sf: unknown) => (sf as { value: string }).value.includes(v))
              return false
            })
          })
          return matches
        })
        break
      }
    }
    self.postMessage({ id, result } satisfies WorkerResponse)
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) } satisfies WorkerResponse)
  }
}
