import { useAppState } from "@/lib/context"

function SeparatorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="w-32 shrink-0 text-xs text-muted-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  )
}

export function AdvancedParams() {
  const { state, dispatch } = useAppState()

  return (
    <details className="group rounded-lg border border-border">
      <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-muted-foreground select-none group-open:text-foreground">
        Advanced parameters
      </summary>
      <div className="space-y-2 border-t border-border px-3 py-3">
        <SeparatorInput
          label="Record Separator"
          value={state.recordSeparator}
          onChange={(v) => dispatch({ type: "SET_RECORD_SEPARATOR", value: v })}
        />
        <SeparatorInput
          label="Field Separator"
          value={state.fieldSeparator}
          onChange={(v) => dispatch({ type: "SET_FIELD_SEPARATOR", value: v })}
        />
        <SeparatorInput
          label="Subfield Separator"
          value={state.subfieldSeparator}
          onChange={(v) => dispatch({ type: "SET_SUBFIELD_SEPARATOR", value: v })}
        />
      </div>
    </details>
  )
}
