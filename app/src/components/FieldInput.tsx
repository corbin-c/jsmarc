import type { AppAction } from "@/lib/context"
import { useAppState } from "@/lib/context"
import { HelpCircle } from "lucide-react"

interface FieldInputProps {
  label: string
  value: string
  actionType: AppAction["type"]
  showHelp?: boolean
  onOpenHelp?: () => void
}

export function FieldInput({ label, value, actionType, showHelp = false, onOpenHelp }: FieldInputProps) {
  const { dispatch } = useAppState()

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        {showHelp && (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={onOpenHelp}
          >
            <HelpCircle className="size-3.5" />
            Help
          </button>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => dispatch({ type: actionType, value: e.target.value } as AppAction)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  )
}
