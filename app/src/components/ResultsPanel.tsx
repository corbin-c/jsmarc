import { useRef, useCallback } from "react"
import { useAppState } from "@/lib/context"
import { ProgressBar } from "./ProgressBar"
import { DisplayPanel } from "./DisplayPanel"
import { ExtractPanel } from "./ExtractPanel"
import { SummarizePanel } from "./SummarizePanel"

export function ResultsPanel() {
  const { state } = useAppState()
  const displayRef = useRef<HTMLDivElement>(null)
  const extractRef = useRef<HTMLDivElement>(null)
  const summarizeRef = useRef<HTMLDivElement>(null)

  // Called by App when Submit is clicked
  const handleSubmit = useCallback(() => {
    let processFn: (() => Promise<void>) | undefined
    switch (state.mode) {
      case "display":
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        processFn = (DisplayPanel as any).__process
        break
      case "extract":
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        processFn = (ExtractPanel as any).__process
        break
      case "summarize":
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        processFn = (SummarizePanel as any).__process
        break
    }
    processFn?.()
  }, [state.mode])

  // Expose handleSubmit to parent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, react-hooks/immutability
  ;(ResultsPanel as any).__handleSubmit = handleSubmit

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* Progress bar area */}
      {state.isProcessing && (
        <div className="border-b border-border bg-card px-6 py-3">
          <ProgressBar />
        </div>
      )}

      {/* Results area */}
      <div className="flex-1 overflow-y-auto p-6">
        {!state.isFileLoaded ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Load a MARC file to get started.
          </div>
        ) : state.mode === "display" ? (
          <div ref={displayRef}>
            <DisplayPanel />
          </div>
        ) : state.mode === "extract" ? (
          <div ref={extractRef}>
            <ExtractPanel />
          </div>
        ) : (
          <div ref={summarizeRef}>
            <SummarizePanel />
          </div>
        )}
      </div>
    </main>
  )
}
