import type { AppState } from "./context"
import { initialState } from "./context"

let appState: AppState = initialState

export function getAppState(): AppState {
  return appState
}

export function setAppStateRef(s: AppState): void {
  appState = s
}
