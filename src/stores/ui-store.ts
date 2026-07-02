import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface UiStore {
  sidePanelTab: string
  sidePanelOpen: boolean
  showGrid: boolean
  showMinimap: boolean

  setSidePanelTab: (tab: string) => void
  setSidePanelOpen: (open: boolean) => void
  toggleSidePanel: () => void
  setShowGrid: (show: boolean) => void
  setShowMinimap: (show: boolean) => void
}

export const useUiStore = create<UiStore>()(
  immer((set) => ({
    sidePanelTab: 'tiles',
    sidePanelOpen: true,
    showGrid: true,
    showMinimap: false,

    setSidePanelTab: (tab) => set((draft) => { draft.sidePanelTab = tab }),
    setSidePanelOpen: (open) => set((draft) => { draft.sidePanelOpen = open }),
    toggleSidePanel: () => set((draft) => { draft.sidePanelOpen = !draft.sidePanelOpen }),
    setShowGrid: (show) => set((draft) => { draft.showGrid = show }),
    setShowMinimap: (show) => set((draft) => { draft.showMinimap = show }),
  }))
)
