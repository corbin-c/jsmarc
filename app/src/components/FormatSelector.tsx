import { useAppState } from "@/lib/context"

export function FormatSelector() {
  const { state, dispatch } = useAppState()

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Helper format</label>
      <select
        value={state.helperFormat}
        onChange={(e) => dispatch({ type: "SET_HELPER_FORMAT", value: e.target.value })}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="disabled">Disabled</option>
        <option value="marc21">MARC21</option>
        <option value="unimarc">UNIMARC</option>
      </select>
    </div>
  )
}
