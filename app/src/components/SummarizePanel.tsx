import { useState, type FC } from "react"
import { useAppState } from "@/lib/context"
import { parseInWorker } from "@/lib/worker-client"
import type { Field } from "@jsmarc/parser"

function parseSep(raw: string): string {
  try {
    return JSON.parse('"' + raw + '"') as string
  } catch {
    return raw
  }
}

interface SummaryData {
  [fieldCode: string]: string[] | { [value: string]: number }
}

function addToSummary(summary: SummaryData, entry: { code: string; value: string }, cumulate: boolean) {
  if (!summary[entry.code]) {
    summary[entry.code] = cumulate ? {} : []
  }
  if (cumulate) {
    const map = summary[entry.code] as Record<string, number>
    map[entry.value] = (map[entry.value] ?? 0) + 1
  } else {
    ;(summary[entry.code] as string[]).push(entry.value)
  }
}

export const SummarizePanel: FC = () => {
  const { state, dispatch } = useAppState()
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const process = async () => {
    if (!state.fileContent) return
    setError(null)
    setSummary(null)
    dispatch({ type: "SET_PROCESSING", isProcessing: true })

    try {
      const recordSep = parseSep(state.recordSeparator)
      const fieldSep = parseSep(state.fieldSeparator)
      const subfieldSep = parseSep(state.subfieldSeparator)

      if (!state.toExtract || state.toExtract === "*") {
        throw new Error("Some fields have to be selected for extraction")
      }

      const rawRecords = state.fileContent.split(recordSep).filter(r => !["", "\n"].includes(r))
      const total = rawRecords.length
      dispatch({ type: "SET_PROGRESS", progress: 0, progressMax: total })

      const summaryData: SummaryData = {}

      for (let i = 0; i < rawRecords.length; i++) {
        const parsed = await parseInWorker(rawRecords[i], {
          toParse: state.toExtract,
          fields: fieldSep,
          subfields: subfieldSep,
        })

        parsed.fields.forEach((field: Field) => {
          if (field.value !== undefined) {
            addToSummary(summaryData, { code: field.code, value: field.value }, state.cumulateValues)
          } else if (field.subfields) {
            Object.values(field.subfields).forEach((sf) => {
              addToSummary(summaryData, { code: field.code + "$" + sf.code, value: sf.value }, state.cumulateValues)
            })
          }
        })

        dispatch({ type: "SET_PROGRESS", progress: i + 1, progressMax: total })

        if (i % 10 === 0) {
          await new Promise(r => setTimeout(r, 0))
        }
      }

      setSummary(summaryData)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      dispatch({ type: "SET_PROCESSING", isProcessing: false })
    }
  }

  // Expose process to parent component via a module-level static property.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(SummarizePanel as any).__process = process

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        Select extraction fields and click Submit.
      </div>
    )
  }

  // JSON output: trigger download
  if (state.outputFormat === "json") {
    const json = JSON.stringify(summary, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    // Auto-download via hidden link
    setTimeout(() => {
      const a = document.createElement("a")
      a.href = url
      a.download = "summary.json"
      a.click()
    }, 0)
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          JSON downloaded.{" "}
          <a href={url} className="text-primary underline" download="summary.json">
            Download again
          </a>
        </p>
      </div>
    )
  }

  // HTML output
  return (
    <div className="space-y-6">
      {Object.entries(summary).map(([code, data]) => (
        <div key={code} className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-3 py-2 text-left font-mono font-medium" colSpan={state.cumulateValues ? 2 : 1}>
                  {code}
                </th>
              </tr>
              {state.cumulateValues && (
                <tr className="border-t border-border bg-muted/30">
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Value</th>
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Count</th>
                </tr>
              )}
            </thead>
            <tbody>
              {state.cumulateValues
                ? Object.entries(data as Record<string, number>).map(([value, count], i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5 font-mono text-xs break-all">{value}</td>
                      <td className="px-3 py-1.5 text-xs">{count}</td>
                    </tr>
                  ))
                : (data as string[]).map((value, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-1.5 font-mono text-xs break-all">{value}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
