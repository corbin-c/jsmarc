import { createContext, useContext, type Dispatch } from "react"

// --- State ---
export type AppMode = "display" | "extract" | "summarize"

export interface AppState {
  // File
  fileName: string
  isFileLoaded: boolean

  // Mode
  mode: AppMode

  // Separators (escape sequences stored as literal chars)
  recordSeparator: string
  fieldSeparator: string
  subfieldSeparator: string

  // Helper
  helperFormat: string // "disabled" | "marc21" | "unimarc"

  // Display params
  toDisplay: string

  // Extract params
  filterField: string
  filterValues: string // line-separated

  // Summarize params
  toExtract: string
  outputFormat: "html" | "json"
  cumulateValues: boolean

  // Processing
  isProcessing: boolean
  progress: number
  progressMax: number
}

// --- Actions ---
export type AppAction =
  | { type: "SET_FILE"; name: string }
  | { type: "SET_MODE"; mode: AppMode }
  | { type: "SET_RECORD_SEPARATOR"; value: string }
  | { type: "SET_FIELD_SEPARATOR"; value: string }
  | { type: "SET_SUBFIELD_SEPARATOR"; value: string }
  | { type: "SET_HELPER_FORMAT"; value: string }
  | { type: "SET_TO_DISPLAY"; value: string }
  | { type: "SET_FILTER_FIELD"; value: string }
  | { type: "SET_FILTER_VALUES"; value: string }
  | { type: "SET_TO_EXTRACT"; value: string }
  | { type: "SET_OUTPUT_FORMAT"; value: "html" | "json" }
  | { type: "SET_CUMULATE_VALUES"; value: boolean }
  | { type: "SET_PROCESSING"; isProcessing: boolean }
  | { type: "SET_PROGRESS"; progress: number; progressMax: number }
  | { type: "RESET" }

// --- Initial State ---
export const initialState: AppState = {
  fileName: "",
  isFileLoaded: false,
  mode: "display",
  recordSeparator: "\\u001d",
  fieldSeparator: "\\u001e",
  subfieldSeparator: "\\u001f",
  helperFormat: "disabled",
  toDisplay: "*",
  filterField: "010$a",
  filterValues: "",
  toExtract: "010$a",
  outputFormat: "html",
  cumulateValues: false,
  isProcessing: false,
  progress: 0,
  progressMax: 100,
}

// --- Reducer ---
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_FILE":
      return { ...state, fileName: action.name, isFileLoaded: true }
    case "SET_MODE":
      return { ...state, mode: action.mode }
    case "SET_RECORD_SEPARATOR":
      return { ...state, recordSeparator: action.value }
    case "SET_FIELD_SEPARATOR":
      return { ...state, fieldSeparator: action.value }
    case "SET_SUBFIELD_SEPARATOR":
      return { ...state, subfieldSeparator: action.value }
    case "SET_HELPER_FORMAT":
      return { ...state, helperFormat: action.value }
    case "SET_TO_DISPLAY":
      return { ...state, toDisplay: action.value }
    case "SET_FILTER_FIELD":
      return { ...state, filterField: action.value }
    case "SET_FILTER_VALUES":
      return { ...state, filterValues: action.value }
    case "SET_TO_EXTRACT":
      return { ...state, toExtract: action.value }
    case "SET_OUTPUT_FORMAT":
      return { ...state, outputFormat: action.value }
    case "SET_CUMULATE_VALUES":
      return { ...state, cumulateValues: action.value }
    case "SET_PROCESSING":
      return { ...state, isProcessing: action.isProcessing }
    case "SET_PROGRESS":
      return { ...state, progress: action.progress, progressMax: action.progressMax }
    case "RESET":
      return { ...initialState, fileName: state.fileName, isFileLoaded: state.isFileLoaded }
    default:
      return state
  }
}

// --- Context ---
export const AppContext = createContext<{
  state: AppState
  dispatch: Dispatch<AppAction>
} | null>(null)

export function useAppState() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useAppState must be used within AppContext.Provider")
  return ctx
}
