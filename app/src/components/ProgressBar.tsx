import { useAppState } from "@/lib/context"

export function ProgressBar() {
  const { state } = useAppState()
  if (!state.isProcessing) return null

  const pct = state.progressMax > 0 ? Math.round((state.progress / state.progressMax) * 100) : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Processing records...</span>
        <span>{state.progress} / {state.progressMax}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
