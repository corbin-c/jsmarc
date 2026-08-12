import { useCallback, useRef, useState, type DragEvent } from "react"
import { useAppState } from "@/lib/context"
import { setFileContent } from "@/lib/fileContentHolder"
import { Upload } from "lucide-react"

export function FileUpload() {
  const { state, dispatch } = useAppState()
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setFileContent(content)
      dispatch({ type: "SET_FILE", name: file.name })
    }
    reader.readAsText(file)
  }, [dispatch])

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Load a MARC file</label>
      <div
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors ${
          isDragging
            ? "border-primary bg-primary/10"
            : "border-border hover:border-primary/50 hover:bg-accent/50"
        } ${state.isFileLoaded ? "border-green-500 bg-green-500/5" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <Upload className="size-5 text-muted-foreground" />
        {state.isFileLoaded ? (
          <p className="text-sm font-medium text-green-600 dark:text-green-400">{state.fileName}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Drop a .mrc file here or click to browse
          </p>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".mrc,.iso2709,.dat,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}
