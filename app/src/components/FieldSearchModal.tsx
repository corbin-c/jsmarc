import { useState, useEffect, useRef } from "react"
import { useAppState, type AppMode } from "@/lib/context"
import { searchInWorker } from "@/lib/worker-client"
import { X, Search } from "lucide-react"

interface FieldSearchModalProps {
  open: boolean
  onClose: () => void
}

// Maps the current mode to which field input to populate
const FIELD_TARGET: Record<AppMode, string> = {
  display: "toDisplay",
  extract: "filterField",
  summarize: "toExtract",
}

export function FieldSearchModal({ open, onClose }: FieldSearchModalProps) {
  const { state, dispatch } = useAppState()
  const [format, setFormat] = useState("marc21")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Array<{ code: string; value: string }>>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => {
      setQuery("")
      setResults([])
      inputRef.current?.focus()
    }, 0)
    return () => clearTimeout(id)
  }, [open])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await searchInWorker(query.trim(), format)
      setResults(res)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleResultClick = (code: string) => {
    const target = FIELD_TARGET[state.mode]
    const currentValue = {
      toDisplay: state.toDisplay,
      filterField: state.filterField,
      toExtract: state.toExtract,
    }[target]

    let newValue = code
    if (currentValue && currentValue !== "*" && currentValue !== "") {
      newValue = currentValue + "," + code
    }

    switch (target) {
      case "toDisplay":
        dispatch({ type: "SET_TO_DISPLAY", value: newValue })
        break
      case "filterField":
        dispatch({ type: "SET_FILTER_FIELD", value: newValue })
        break
      case "toExtract":
        dispatch({ type: "SET_TO_EXTRACT", value: newValue })
        break
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 mx-4 w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-lg font-semibold">Search field definitions</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-2 border-b border-border px-5 py-3">
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="marc21">MARC21</option>
            <option value="unimarc">UNIMARC</option>
          </select>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search field definitions..."
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={searching}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50"
          >
            <Search className="size-4" />
            {searching ? "..." : "Search"}
          </button>
        </form>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {results.length > 0 ? (
            <table className="w-full text-sm">
              <tbody>
                {results
                  .sort((a, b) => parseInt(a.code.split("$")[0]) - parseInt(b.code.split("$")[0]))
                  .map((r, i) => (
                    <tr
                      key={i}
                      className="cursor-pointer border-b border-border transition-colors hover:bg-accent"
                      onClick={() => handleResultClick(r.code)}
                    >
                      <td className="px-5 py-3 font-mono font-medium">{r.code}</td>
                      <td className="px-5 py-3 text-muted-foreground">{r.value}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              {searching ? "Searching..." : "Enter a keyword and press Search"}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
