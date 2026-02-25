import { useState, useReducer, useCallback } from "react"
import { AppContext, appReducer, initialState } from "@/lib/context"
import { useTheme } from "@/components/theme-provider"
import { Sidebar } from "@/components/Sidebar"
import { ResultsPanel } from "@/components/ResultsPanel"
import { FieldSearchModal } from "@/components/FieldSearchModal"
import { Sun, Moon } from "lucide-react"

export function App() {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const { theme, setTheme } = useTheme()
  const [helpOpen, setHelpOpen] = useState(false)

  const handleSubmit = useCallback(() => {
    const submitFn = (ResultsPanel as any).__handleSubmit as (() => void) | undefined
    submitFn?.()
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <div className="flex h-screen flex-col bg-background">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-3">
          <h1 className="text-xl font-semibold tracking-tight">JsMarc</h1>
          <button
            onClick={toggleTheme}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
        </header>

        {/* Body: split panel */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar onOpenHelp={() => setHelpOpen(true)} onSubmit={handleSubmit} />
          <ResultsPanel />
        </div>

        {/* Field search modal */}
        <FieldSearchModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      </div>
    </AppContext.Provider>
  )
}

export default App
