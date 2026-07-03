import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { ToolType, Preset, WorldConfig, Layer } from '@/types'
import { TILE_TYPES } from '@/constants/tiles'

const MAX_HISTORY = 50

let _layerCounter = 1
function nextLayerId(): string {
  _layerCounter++
  return `layer-${_layerCounter}`
}

export interface MapStore {
  tiles: Record<string, Record<string, string | null>>
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
  importMap: (data: {
    tiles?: Record<string, string | null>
    layerTiles?: Record<string, Record<string, string | null>>
    layers?: Layer[]
    worldName?: string
    tileSize?: number
    themeId?: string
  }) => void
  exportMap: () => {
    tiles: Record<string, string | null>
    layerTiles: Record<string, Record<string, string | null>>
    layers: Layer[]
    worldName: string
    tileSize: number
    themeId: string
    version: number
  }
  getTile: (x: number, y: number) => string | null
  floodFill: (x: number, y: number, fillTileTypeId: string) => void
  pushHistory: () => void

  addLayer: (name?: string) => void
  removeLayer: (index: number) => void
  setActiveLayer: (index: number) => void
  toggleLayerVisibility: (index: number) => void
  toggleLayerLock: (index: number) => void
  renameLayer: (index: number, name: string) => void
  activeLayerLocked: () => boolean
}

export const useMapStore = create<MapStore>()(
  immer((set, get) => ({
    tiles: {},
    activeTileType: 'wall',
    currentTool: 'brush',
    activePreset: null,
    layers: [{ id: 'layer-1', name: 'Ground', visible: true, locked: false }],
    activeLayer: 0,
    worldName: 'Untitled',
    tileSize: 24,
    themeId: 'ansi-16',
    history: [],
    historyIndex: -1,

    activeLayerLocked: () => {
      const state = get()
      return state.layers[state.activeLayer]?.locked ?? false
    },

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
      const state = get()
      const layerId = state.layers[state.activeLayer]?.id
      if (!layerId) return
      get().pushHistory()
      set((draft) => {
        const key = `${x},${y}`
        if (!draft.tiles[layerId]) draft.tiles[layerId] = {}
        if (tileTypeId === null || tileTypeId === 'void') {
          delete draft.tiles[layerId][key]
        } else {
          draft.tiles[layerId][key] = tileTypeId
        }
      })
    },

    setTiles: (entries) => {
      const state = get()
      const layerId = state.layers[state.activeLayer]?.id
      if (!layerId) return
      get().pushHistory()
      set((draft) => {
        if (!draft.tiles[layerId]) draft.tiles[layerId] = {}
        for (const [x, y, tileTypeId] of entries) {
          const key = `${x},${y}`
          if (tileTypeId === null || tileTypeId === 'void') {
            delete draft.tiles[layerId][key]
          } else {
            draft.tiles[layerId][key] = tileTypeId
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

      if (config.initialLayerTiles && config.initialLayers && config.initialLayers.length > 0) {
        draft.tiles = {}
        for (const [id, lt] of Object.entries(config.initialLayerTiles)) {
          draft.tiles[id] = { ...lt }
        }
        draft.layers = config.initialLayers.map((l) => ({ ...l }))
        draft.activeLayer = 0
      } else if (config.initialTiles) {
        const layerId = 'layer-1'
        draft.tiles = { [layerId]: { ...config.initialTiles } }
        draft.layers = [{ id: layerId, name: 'Ground', visible: true, locked: false }]
        draft.activeLayer = 0
      } else {
        const layerId = 'layer-1'
        draft.tiles = { [layerId]: {} }
        draft.layers = [{ id: layerId, name: 'Ground', visible: true, locked: false }]
        draft.activeLayer = 0
      }

      draft.history = []
      draft.historyIndex = -1
      draft.currentTool = 'brush'
      draft.activeTileType = 'wall'
      draft.activePreset = null
    }),

    importMap: (data) => {
      get().pushHistory()
      set((draft) => {
        if (data.layerTiles && data.layers && data.layers.length > 0) {
          draft.tiles = {}
          for (const [id, layerTiles] of Object.entries(data.layerTiles)) {
            draft.tiles[id] = { ...layerTiles }
          }
          draft.layers = data.layers.map((l) => ({ ...l }))
          draft.activeLayer = 0
        } else if (data.tiles) {
          const layerId = 'layer-1'
          draft.tiles = { [layerId]: { ...data.tiles } }
          draft.layers = [{ id: layerId, name: 'Ground', visible: true, locked: false }]
          draft.activeLayer = 0
        }
        if (data.worldName) draft.worldName = data.worldName
        if (data.tileSize) draft.tileSize = data.tileSize
        if (data.themeId) draft.themeId = data.themeId
      })
    },

    exportMap: () => {
      const state = get()
      const flatTiles: Record<string, string | null> = {}
      for (const layer of state.layers) {
        if (state.tiles[layer.id]) {
          Object.assign(flatTiles, state.tiles[layer.id])
        }
      }
      return {
        tiles: flatTiles,
        layerTiles: { ...state.tiles },
        layers: state.layers.map((l) => ({ ...l })),
        worldName: state.worldName,
        tileSize: state.tileSize,
        themeId: state.themeId,
        version: 2,
      }
    },

    getTile: (x, y) => {
      const state = get()
      const key = `${x},${y}`
      for (let i = state.layers.length - 1; i >= 0; i--) {
        const l = state.layers[i]
        if (l.visible && state.tiles[l.id]?.[key]) {
          return state.tiles[l.id][key]
        }
      }
      return null
    },

    floodFill: (startX, startY, fillTileTypeId) => {
      const state = get()
      const layerId = state.layers[state.activeLayer]?.id
      if (!layerId) return
      const layerTiles = state.tiles[layerId] || {}
      const key = `${startX},${startY}`
      const targetTileType = layerTiles[key]
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

        const currentType = get().tiles[layerId]?.[ck]
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
          if (!draft.tiles[layerId]) draft.tiles[layerId] = {}
          for (const [x, y, tid] of entries) {
            const k = `${x},${y}`
            if (tid === null || tid === 'void') {
              delete draft.tiles[layerId][k]
            } else {
              draft.tiles[layerId][k] = tid
            }
          }
        })
      }
    },

    addLayer: (name) => set((draft) => {
      const id = nextLayerId()
      draft.layers.push({ id, name: name || `Layer ${draft.layers.length}`, visible: true, locked: false })
      draft.tiles[id] = {}
    }),

    removeLayer: (index) => set((draft) => {
      if (draft.layers.length <= 1) return
      const layer = draft.layers[index]
      if (!layer) return
      draft.layers.splice(index, 1)
      delete draft.tiles[layer.id]
      if (draft.activeLayer >= draft.layers.length) {
        draft.activeLayer = draft.layers.length - 1
      }
    }),

    setActiveLayer: (index) => set((draft) => {
      if (index >= 0 && index < draft.layers.length) {
        draft.activeLayer = index
      }
    }),

    toggleLayerVisibility: (index) => set((draft) => {
      const layer = draft.layers[index]
      if (layer) layer.visible = !layer.visible
    }),

    toggleLayerLock: (index) => set((draft) => {
      const layer = draft.layers[index]
      if (layer) layer.locked = !layer.locked
    }),

    renameLayer: (index, name) => set((draft) => {
      const layer = draft.layers[index]
      if (layer) layer.name = name
    }),
  }))
)
