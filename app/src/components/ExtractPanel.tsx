import { useState } from "react"
import { useAppState } from "@/lib/context"
import { getFileContent } from "@/lib/fileContentHolder"
import { filterBatchInWorker } from "@/lib/worker-client"
import { Button } from "./ui/button"
import { Download } from "lucide-react"

function parseSep(raw: string): string {
  return raw.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  )
}

export const ExtractPanel = () => {
  const { state, dispatch } = useAppState()
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [matchCount, setMatchCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const process = async () => {
    const fileContent = getFileContent()
    if (!fileContent) return
    setError(null)
    setDownloadUrl(null)
    setMatchCount(null)
    dispatch({ type: "SET_PROCESSING", isProcessing: true })

    try {
      const recordSep = parseSep(state.recordSeparator)
      const fieldSep = parseSep(state.fieldSeparator)
      const subfieldSep = parseSep(state.subfieldSeparator)
      const values = state.filterValues.split("\n").filter(v => v.trim() !== "")

      if (!state.filterField || state.filterField === "*") {
        throw new Error("A field to filter has to be selected")
      }
      if (values.length === 0) {
        throw new Error("No values to filter provided")
      }

      const rawRecords = fileContent.split(recordSep).filter(r => !["", "\n"].includes(r))
      const total = rawRecords.length
      dispatch({ type: "SET_PROGRESS", progress: 0, progressMax: total })

      const matches: string[] = []
      const BATCH_SIZE = 50

      for (let i = 0; i < rawRecords.length; i += BATCH_SIZE) {
        const batch = rawRecords.slice(i, i + BATCH_SIZE)
        const filterResults = await filterBatchInWorker(batch, state.filterField, values, {
          fields: fieldSep,
          subfields: subfieldSep,
        })
        for (let j = 0; j < filterResults.length; j++) {
          if (filterResults[j]) {
            matches.push(batch[j])
          }
        }

        const batchEnd = Math.min(i + BATCH_SIZE, total)
        dispatch({ type: "SET_PROGRESS", progress: batchEnd, progressMax: total })
        setMatchCount(matches.length)

        // Yield every batch
        await new Promise(r => setTimeout(r, 0))
      }

      setMatchCount(matches.length)

      const blob = new Blob([matches.join(recordSep)], { type: "text/iso2709" })
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      dispatch({ type: "SET_PROCESSING", isProcessing: false })
    }
  }

  // Expose process to parent component via a module-level static property.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(ExtractPanel as any).__process = process

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (!downloadUrl) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        Configure filter field and values, then click Submit.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="text-2xl font-bold text-primary">{matchCount}</p>
        <p className="text-sm text-muted-foreground">
          matching record{matchCount !== 1 ? "s" : ""} found
        </p>
      </div>
      <a href={downloadUrl} download="records.mrc">
        <Button className="w-full">
          <Download className="size-4" />
          Download matching records (.mrc)
        </Button>
      </a>
    </div>
  )
}
