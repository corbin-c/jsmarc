import { useState, type FC } from "react"
import { useAppState } from "@/lib/context"
import { parseInWorker, explainInWorker } from "@/lib/worker-client"
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

export const DisplayPanel: FC = () => {
  const { state, dispatch } = useAppState()
  const [records, setRecords] = useState<DisplayedField[][]>([])
  const [error, setError] = useState<string | null>(null)

  const process = async () => {
    if (!state.fileContent) return
    setError(null)
    setRecords([])
    dispatch({ type: "SET_PROCESSING", isProcessing: true })

    try {
      const recordSep = parseSep(state.recordSeparator)
      const fieldSep = parseSep(state.fieldSeparator)
      const subfieldSep = parseSep(state.subfieldSeparator)

      const rawRecords = state.fileContent.split(recordSep).filter(r => !["", "\n"].includes(r))
      const total = rawRecords.length
      dispatch({ type: "SET_PROGRESS", progress: 0, progressMax: total })

      const results: DisplayedField[][] = []

      for (let i = 0; i < rawRecords.length; i++) {
        let parsed = await parseInWorker(rawRecords[i], {
          toParse: state.toDisplay,
          fields: fieldSep,
          subfields: subfieldSep,
        })

        if (state.helperFormat !== "disabled") {
          parsed = await explainInWorker(rawRecords[i], state.helperFormat, {
            fields: fieldSep,
            subfields: subfieldSep,
          })
        }

        results.push(flattenFields(parsed))
        dispatch({ type: "SET_PROGRESS", progress: i + 1, progressMax: total })

        // Yield to the UI every 5 records
        if (i % 5 === 0) {
          await new Promise(r => setTimeout(r, 0))
        }
      }

      setRecords(results)
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

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        Select a MARC file and click Submit to view records.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {records.map((fields, ri) => (
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
      ))}
    </div>
  )
}
