import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface UiStore {
  sidePanelTab: string
  sidePanelOpen: boolean
  showGrid: boolean
  showMinimap: boolean
  viewDistance: number
  zoomScale: number

  setSidePanelTab: (tab: string) => void
  setSidePanelOpen: (open: boolean) => void
  toggleSidePanel: () => void
  setShowGrid: (show: boolean) => void
  setShowMinimap: (show: boolean) => void
  setViewDistance: (d: number) => void
  setZoomScale: (scale: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  zoomToFit: (mapBounds: { w: number; h: number }, containerSize: { w: number; h: number }) => void
}

export const useUiStore = create<UiStore>()(
  immer((set, get) => ({
    sidePanelTab: 'tiles',
    sidePanelOpen: true,
    showGrid: true,
    showMinimap: true,
    viewDistance: 5,
    zoomScale: 1,

    setSidePanelTab: (tab) => set((draft) => { draft.sidePanelTab = tab }),
    setSidePanelOpen: (open) => set((draft) => { draft.sidePanelOpen = open }),
    toggleSidePanel: () => set((draft) => { draft.sidePanelOpen = !draft.sidePanelOpen }),
    setShowGrid: (show) => set((draft) => { draft.showGrid = show }),
    setShowMinimap: (show) => set((draft) => { draft.showMinimap = show }),
    setViewDistance: (d) => set((draft) => { draft.viewDistance = Math.max(1, Math.min(100, d)) }),
    setZoomScale: (scale) => set((draft) => { draft.zoomScale = Math.max(0.0625, Math.min(16, scale)) }),

    zoomIn: () => {
      const { zoomScale } = get()
      set((draft) => { draft.zoomScale = Math.min(16, zoomScale * 1.5) })
    },

    zoomOut: () => {
      const { zoomScale } = get()
      set((draft) => { draft.zoomScale = Math.max(0.0625, zoomScale / 1.5) })
    },

    resetZoom: () => set((draft) => { draft.zoomScale = 1 }),

    zoomToFit: (mapBounds, containerSize) => {
      if (mapBounds.w <= 0 || mapBounds.h <= 0 || containerSize.w <= 0 || containerSize.h <= 0) return
      const scaleX = containerSize.w / (mapBounds.w * 24)
      const scaleY = containerSize.h / (mapBounds.h * 24)
      const rawScale = Math.min(scaleX, scaleY) * 0.85
      set((draft) => { draft.zoomScale = Math.max(0.0625, Math.min(16, rawScale)) })
    },
  }))
)
