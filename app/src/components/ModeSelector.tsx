import { useAppState, type AppMode } from "@/lib/context"
import { Eye, Filter, Table } from "lucide-react"

const MODES: { value: AppMode; label: string; icon: typeof Eye }[] = [
  { value: "display", label: "Display", icon: Eye },
  { value: "extract", label: "Extract", icon: Filter },
  { value: "summarize", label: "Summarize", icon: Table },
]

export function ModeSelector() {
  const { state, dispatch } = useAppState()

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Mode</label>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {MODES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all ${
              state.mode === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => dispatch({ type: "SET_MODE", mode: value })}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
