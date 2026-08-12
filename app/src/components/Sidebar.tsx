import { useAppState } from "@/lib/context"
import { FileUpload } from "./FileUpload"
import { ModeSelector } from "./ModeSelector"
import { AdvancedParams } from "./AdvancedParams"
import { FormatSelector } from "./FormatSelector"
import { FieldInput } from "./FieldInput"
import { Button } from "./ui/button"
import { Play } from "lucide-react"

interface SidebarProps {
  onOpenHelp: () => void
  onSubmit: () => void
}

export function Sidebar({ onOpenHelp, onSubmit }: SidebarProps) {
  const { state, dispatch } = useAppState()

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-card p-4">
      <h2 className="text-lg font-semibold">Controls</h2>

      <FileUpload />

      <ModeSelector />

      <AdvancedParams />

      {/* Helper format — shown for Display mode */}
      {state.mode === "display" && <FormatSelector />}

      {/* Display mode */}
      {state.mode === "display" && (
        <FieldInput
          label="Fields to display"
          value={state.toDisplay}
          actionType="SET_TO_DISPLAY"
          showHelp
          onOpenHelp={onOpenHelp}
        />
      )}

      {/* Extract mode */}
      {state.mode === "extract" && (
        <>
          <FieldInput
            label="Field to filter"
            value={state.filterField}
            actionType="SET_FILTER_FIELD"
            showHelp
            onOpenHelp={onOpenHelp}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium">Values to filter</label>
            <textarea
              value={state.filterValues}
              onChange={(e) => dispatch({ type: "SET_FILTER_VALUES", value: e.target.value })}
              placeholder="Line-separated values..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              rows={5}
            />
          </div>
        </>
      )}

      {/* Summarize mode */}
      {state.mode === "summarize" && (
        <>
          <FieldInput
            label="Fields to extract"
            value={state.toExtract}
            actionType="SET_TO_EXTRACT"
            showHelp
            onOpenHelp={onOpenHelp}
          />
          <div className="space-y-2">
            <label className="text-sm font-medium">Output format</label>
            <select
              value={state.outputFormat}
              onChange={(e) => dispatch({ type: "SET_OUTPUT_FORMAT", value: e.target.value as "html" | "json" })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="html">HTML</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.cumulateValues}
              onChange={(e) => dispatch({ type: "SET_CUMULATE_VALUES", value: e.target.checked })}
              className="rounded border-input"
            />
            Cumulate values
          </label>
        </>
      )}

      <Button
        className="mt-auto w-full"
        disabled={!state.isFileLoaded || state.isProcessing}
        onClick={onSubmit}
      >
        <Play className="size-4" />
        {state.isProcessing ? "Processing..." : "Submit"}
      </Button>
    </aside>
  )
}
