import { useState, useMemo } from "react"
import { useAppState } from "@/lib/context"
import { getFileContent } from "@/lib/fileContentHolder"
import { explainInWorker, parseBatchInWorker } from "@/lib/worker-client"
import type { MarcRecord } from "@jsmarc/parser"
import type { ExplainedRecord } from "@jsmarc/helper"

function parseSep(raw: string): string {
  return raw.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  )
}

interface DisplayedField {
  code: string
  indicator: string
  label?: string
  indicatorsLabel?: string
  subfields: Array<{ code: string; value: string; label?: string }>
  value?: string
}

function flattenFields(record: MarcRecord | ExplainedRecord): DisplayedField[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (record.fields as any[]).map((f: any) => ({
    code: f.code ?? "",
    indicator: (f.indicator ?? "").replace(/ /g, "_"),
    label: f.label,
    indicatorsLabel: f.indicators_label,
    subfields: f.subfields
      ? Object.values(f.subfields as Record<string, any>).map((sf: any) => ({
          code: sf.code ?? "",
          value: sf.value ?? "",
          label: sf.label,
        }))
      : [],
    value: f.value,
  }))
}

export const DisplayPanel = () => {
  const { state, dispatch } = useAppState()
  const [records, setRecords] = useState<DisplayedField[][]>([])
  const [error, setError] = useState<string | null>(null)

  const process = async () => {
    const fileContent = getFileContent()
    if (!fileContent) return
    setError(null)
    setRecords([])
    dispatch({ type: "SET_PROCESSING", isProcessing: true })

    try {
      const recordSep = parseSep(state.recordSeparator)
      const fieldSep = parseSep(state.fieldSeparator)
      const subfieldSep = parseSep(state.subfieldSeparator)

      const rawRecords = fileContent.split(recordSep).filter(r => !["", "\n"].includes(r))
      const total = rawRecords.length
      dispatch({ type: "SET_PROGRESS", progress: 0, progressMax: total })

      const BATCH_SIZE = 50

      for (let i = 0; i < rawRecords.length; i += BATCH_SIZE) {
        const batch = rawRecords.slice(i, i + BATCH_SIZE)
        const parsedBatch = await parseBatchInWorker(batch, {
          toParse: state.toDisplay,
          fields: fieldSep,
          subfields: subfieldSep,
        })
        const batchResults: DisplayedField[][] = []
        for (let j = 0; j < parsedBatch.length; j++) {
          let parsed = parsedBatch[j]
          if (state.helperFormat !== "disabled") {
            parsed = await explainInWorker(batch[j], state.helperFormat, {
              fields: fieldSep,
              subfields: subfieldSep,
            })
          }
          batchResults.push(flattenFields(parsed))
        }

        const batchEnd = Math.min(i + BATCH_SIZE, total)
        dispatch({ type: "SET_PROGRESS", progress: batchEnd, progressMax: total })
        setRecords(prev => [...prev, ...batchResults])

        // Yield to UI every batch
        await new Promise(r => setTimeout(r, 0))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      dispatch({ type: "SET_PROCESSING", isProcessing: false })
    }
  }

  // Expose process to parent component via a module-level static property.
  // The App component wires this to the Submit button callback.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(DisplayPanel as any).__process = process

  const renderedRecords = useMemo(() => {
    if (records.length === 0) return null
    return records.map((fields, ri) => (
      <div key={ri} className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-3 py-2 text-left font-medium">Field</th>
              <th className="px-3 py-2 text-left font-medium">Indicators</th>
              <th className="px-3 py-2 text-left font-medium">Subfields</th>
              <th className="px-3 py-2 text-left font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f, fi) => {
              const hasSubfields = f.subfields.length > 0
              return hasSubfields ? (
                f.subfields.map((sf, si) => (
                  <tr key={`${fi}-${si}`} className="border-t border-border">
                    {si === 0 && (
                      <>
                        <td className="px-3 py-1.5 align-top font-mono" rowSpan={f.subfields.length}>
                          <div>{f.code}</div>
                          {f.label && <div className="text-xs text-muted-foreground">{f.label}</div>}
                        </td>
                        <td className="px-3 py-1.5 align-top font-mono" rowSpan={f.subfields.length}>
                          <div>{f.indicator}</div>
                          {f.indicatorsLabel && (
                            <div className="text-xs text-muted-foreground">{f.indicatorsLabel}</div>
                          )}
                        </td>
                      </>
                    )}
                    <td className="px-3 py-1.5 font-mono">
                      <span>{sf.code}</span>
                      {sf.label && <div className="text-xs text-muted-foreground">{sf.label}</div>}
                    </td>
                    <td className="px-3 py-1.5">{sf.value}</td>
                  </tr>
                ))
              ) : (
                <tr key={fi} className="border-t border-border">
                  <td className="px-3 py-1.5 font-mono">
                    <div>{f.code}</div>
                    {f.label && <div className="text-xs text-muted-foreground">{f.label}</div>}
                  </td>
                  <td className="px-3 py-1.5 font-mono">{f.indicator}</td>
                  <td className="px-3 py-1.5" />
                  <td className="px-3 py-1.5 font-mono break-all">{f.value}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    ))
  }, [records])

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {records.length === 0 ? (
        <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
          Select a MARC file and click Submit to view records.
        </div>
      ) : (
        renderedRecords
      )}
    </div>
  )
}
