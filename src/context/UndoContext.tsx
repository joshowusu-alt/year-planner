import { createContext, useContext } from 'react'
import type { UndoAction } from '../hooks/useUndoToast'

interface UndoContextValue {
  pushUndo: (action: UndoAction) => void
}

export const UndoContext = createContext<UndoContextValue>({ pushUndo: () => {} })

export function useUndo(): UndoContextValue {
  return useContext(UndoContext)
}
