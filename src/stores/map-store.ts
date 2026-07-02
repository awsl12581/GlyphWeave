import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { ToolType, Preset, WorldConfig, Layer } from '@/types'
import { TILE_TYPES } from '@/constants/tiles'

const MAX_HISTORY = 50

export interface MapStore {
  tiles: Record<string, string | null>
  activeTileType: string
  currentTool: ToolType
  activePreset: Preset | null
  layers: Layer[]
  activeLayer: number
  worldName: string
  tileSize: number
  themeId: string
  history: string[]
  historyIndex: number

  setTile: (x: number, y: number, tileTypeId: string | null) => void
  setTiles: (entries: [number, number, string | null][]) => void
  setActiveTileType: (id: string) => void
  setCurrentTool: (tool: ToolType) => void
  setActivePreset: (preset: Preset | null) => void
  placePreset: (preset: Preset, originX: number, originY: number) => void
  undo: () => void
  redo: () => void
  initWorld: (config: WorldConfig) => void
  importMap: (data: { tiles: Record<string, string | null>; worldName?: string; tileSize?: number; themeId?: string }) => void
  exportMap: () => { tiles: Record<string, string | null>; worldName: string; tileSize: number; themeId: string; version: number }
  getTile: (x: number, y: number) => string | null
  floodFill: (x: number, y: number, fillTileTypeId: string) => void
  pushHistory: () => void
}

export const useMapStore = create<MapStore>()(
  immer((set, get) => ({
    tiles: {},
    activeTileType: 'wall',
    currentTool: 'brush',
    activePreset: null,
    layers: [{ id: 'layer-0', name: 'Ground', visible: true, locked: false }],
    activeLayer: 0,
    worldName: 'Untitled',
    tileSize: 24,
    themeId: 'ansi-16',
    history: [],
    historyIndex: -1,

    pushHistory: () => {
      const state = get()
      const snapshot = JSON.stringify(state.tiles)
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(snapshot)
      while (newHistory.length > MAX_HISTORY) newHistory.shift()
      set((draft) => {
        draft.history = newHistory
        draft.historyIndex = newHistory.length - 1
      })
    },

    setTile: (x, y, tileTypeId) => {
      get().pushHistory()
      set((draft) => {
        const key = `${x},${y}`
        if (tileTypeId === null || tileTypeId === 'void') {
          delete draft.tiles[key]
        } else {
          draft.tiles[key] = tileTypeId
        }
      })
    },

    setTiles: (entries) => {
      get().pushHistory()
      set((draft) => {
        for (const [x, y, tileTypeId] of entries) {
          const key = `${x},${y}`
          if (tileTypeId === null || tileTypeId === 'void') {
            delete draft.tiles[key]
          } else {
            draft.tiles[key] = tileTypeId
          }
        }
      })
    },

    setActiveTileType: (id) => set((draft) => { draft.activeTileType = id }),

    setCurrentTool: (tool) => set((draft) => { draft.currentTool = tool; draft.activePreset = null }),

    setActivePreset: (preset) => set((draft) => { draft.activePreset = preset; if (preset) draft.currentTool = 'brush' }),

    placePreset: (preset, originX, originY) => {
      const entries: [number, number, string | null][] = []
      for (let py = 0; py < preset.grid.length; py++) {
        for (let px = 0; px < preset.grid[py].length; px++) {
          const cellType = preset.grid[py][px]
          if (cellType !== 'void' && TILE_TYPES[cellType]) {
            entries.push([originX + px, originY + py, cellType])
          }
        }
      }
      get().setTiles(entries)
    },

    undo: () => {
      const { historyIndex, history } = get()
      if (historyIndex < 0) return
      const snapshot = history[historyIndex]
      set((draft) => {
        draft.tiles = JSON.parse(snapshot)
        draft.historyIndex = historyIndex - 1
      })
    },

    redo: () => {
      const { historyIndex, history } = get()
      if (historyIndex >= history.length - 2) return
      const snapshot = history[historyIndex + 2]
      set((draft) => {
        draft.tiles = JSON.parse(snapshot)
        draft.historyIndex = historyIndex + 1
      })
    },

    initWorld: (config) => set((draft) => {
      draft.worldName = config.worldName
      draft.tileSize = config.tileSize
      draft.themeId = config.themeId
      draft.tiles = config.initialTiles ? { ...config.initialTiles } : {}
      draft.history = []
      draft.historyIndex = -1
      draft.currentTool = 'brush'
      draft.activeTileType = 'wall'
      draft.activePreset = null
    }),

    importMap: (data) => {
      get().pushHistory()
      set((draft) => {
        draft.tiles = { ...data.tiles }
        if (data.worldName) draft.worldName = data.worldName
        if (data.tileSize) draft.tileSize = data.tileSize
        if (data.themeId) draft.themeId = data.themeId
      })
    },

    exportMap: () => {
      const state = get()
      return {
        tiles: { ...state.tiles },
        worldName: state.worldName,
        tileSize: state.tileSize,
        themeId: state.themeId,
        version: 1,
      }
    },

    getTile: (x, y) => {
      const key = `${x},${y}`
      return get().tiles[key] || null
    },

    floodFill: (startX, startY, fillTileTypeId) => {
      const { tiles } = get()
      const key = `${startX},${startY}`
      const targetTileType = tiles[key]
      if (!targetTileType || targetTileType === fillTileTypeId) return

      get().pushHistory()
      const visited = new Set<string>()
      const queue: [number, number][] = [[startX, startY]]
      const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]]
      const entries: [number, number, string | null][] = []

      while (queue.length > 0) {
        const [cx, cy] = queue.shift()!
        const ck = `${cx},${cy}`
        if (visited.has(ck)) continue
        visited.add(ck)

        const currentType = get().tiles[ck]
        if (currentType !== targetTileType) continue

        entries.push([cx, cy, fillTileTypeId])

        for (const [dx, dy] of dirs) {
          const nx = cx + dx
          const ny = cy + dy
          const nk = `${nx},${ny}`
          if (!visited.has(nk)) {
            queue.push([nx, ny])
          }
        }
      }

      if (entries.length > 0) {
        set((draft) => {
          for (const [x, y, tid] of entries) {
            const k = `${x},${y}`
            if (tid === null || tid === 'void') {
              delete draft.tiles[k]
            } else {
              draft.tiles[k] = tid
            }
          }
        })
      }
    },
  }))
)
