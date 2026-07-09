/**
 * Client-side tool execution functions for the AI chat assistant.
 *
 * These functions are called when the AI model requests a tool invocation via
 * the `onToolCall` callback in `useChat`. They directly operate on the Zustand
 * map store, bridging the AI ↔ editor gap.
 */

import { useMapStore } from '@/stores/map-store'
import { TILE_TYPES, TILE_CATEGORIES } from '@/constants/tiles'
import { PRESETS } from '@/constants/presets'

export interface ToolResult {
  success: boolean
  message: string
  data?: unknown
}

function ok(message: string, data?: unknown): ToolResult {
  return { success: true, message, data }
}

function fail(message: string): ToolResult {
  return { success: false, message }
}

/** Get a high-level summary of the current map state for the AI. */
export function getMapState(): ToolResult {
  const state = useMapStore.getState()
  const layers = state.layers
  const tileCounts: Record<string, number> = {}

  for (const layer of layers) {
    const layerTiles = state.tiles[layer.id]
    tileCounts[layer.name] = layerTiles ? Object.keys(layerTiles).length : 0
  }

  return ok('Current map state retrieved.', {
    worldName: state.worldName,
    tileSize: state.tileSize,
    themeId: state.themeId,
    activeLayer: state.layers[state.activeLayer]?.name ?? 'unknown',
    layers: layers.map((l) => ({
      name: l.name,
      visible: l.visible,
      locked: l.locked,
      tileCount: tileCounts[l.name] ?? 0,
    })),
    activeTool: state.currentTool,
    activeTileType: state.activeTileType,
  })
}

/** List all available tile types grouped by category. */
export function getTileTypes(): ToolResult {
  const categoryMap: Record<string, { id: string; name: string }[]> = {}

  for (const cat of TILE_CATEGORIES) {
    categoryMap[cat.key] = []
  }

  for (const tile of Object.values(TILE_TYPES)) {
    if (tile.id === 'void') continue // skip void — not placeable
    if (categoryMap[tile.category]) {
      categoryMap[tile.category].push({ id: tile.id, name: tile.name })
    }
  }

  // Remove empty categories
  for (const key of Object.keys(categoryMap)) {
    if (categoryMap[key].length === 0) delete categoryMap[key]
  }

  return ok('Available tile types retrieved.', categoryMap)
}

/** List all available presets grouped by category. */
export function getPresets(): ToolResult {
  const grouped: Record<string, { id: string; name: string; description: string; width: number; height: number }[]> = {}

  for (const preset of PRESETS) {
    if (!grouped[preset.category]) grouped[preset.category] = []
    grouped[preset.category].push({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      width: preset.grid[0]?.length ?? 0,
      height: preset.grid.length,
    })
  }

  return ok('Available presets retrieved.', grouped)
}

/** Place a single tile at the given coordinates. */
export function placeTile(args: { x: number; y: number; tileId: string }): ToolResult {
  const { x, y, tileId } = args

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return fail('Invalid coordinates: x and y must be numbers')
  }

  const tileType = TILE_TYPES[tileId]
  if (!tileType) {
    const available = Object.keys(TILE_TYPES).filter((k) => k !== 'void').join(', ')
    return fail(`Unknown tile type "${tileId}". Available types: ${available}`)
  }

  if (tileId === 'void') {
    return fail('Cannot place void tiles directly. Use the eraser tool to remove tiles.')
  }

  const store = useMapStore.getState()
  const layer = store.layers[store.activeLayer]
  if (layer?.locked) {
    return fail(`Layer "${layer.name}" is locked. Unlock it first.`)
  }

  store.setTile(x, y, tileId)
  return ok(`Placed "${tileType.name}" at (${x}, ${y}).`)
}

/** Place a preset structure at the given origin. */
export function placePreset(args: { presetId: string; x: number; y: number }): ToolResult {
  const { presetId, x, y } = args

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return fail('Invalid coordinates: x and y must be numbers')
  }

  const preset = PRESETS.find((p) => p.id === presetId)
  if (!preset) {
    const available = PRESETS.map((p) => `${p.id} (${p.name})`).join(', ')
    return fail(`Unknown preset "${presetId}". Available: ${available}`)
  }

  const store = useMapStore.getState()
  const layer = store.layers[store.activeLayer]
  if (layer?.locked) {
    return fail(`Layer "${layer.name}" is locked. Unlock it first.`)
  }

  store.placePreset(preset, x, y)
  const w = preset.grid[0]?.length ?? 0
  const h = preset.grid.length
  return ok(`Placed preset "${preset.name}" (${w}×${h}) at (${x}, ${y}).`)
}

/** Flood-fill an area starting from (x, y). */
export function fillArea(args: { x: number; y: number; tileId: string }): ToolResult {
  const { x, y, tileId } = args

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return fail('Invalid coordinates: x and y must be numbers')
  }

  const tileType = TILE_TYPES[tileId]
  if (!tileType || tileId === 'void') {
    const available = Object.keys(TILE_TYPES).filter((k) => k !== 'void').join(', ')
    return fail(`Invalid tile type "${tileId}" for fill. Available: ${available}`)
  }

  const store = useMapStore.getState()
  const layer = store.layers[store.activeLayer]
  if (layer?.locked) {
    return fail(`Layer "${layer.name}" is locked. Unlock it first.`)
  }

  store.floodFill(x, y, tileId)
  return ok(`Flood-filled area starting at (${x}, ${y}) with "${tileType.name}".`)
}

/** Place multiple tiles in a batch. */
export function placeMultipleTiles(args: { tiles: { x: number; y: number; tileId: string }[] }): ToolResult {
  if (!args.tiles || !Array.isArray(args.tiles) || args.tiles.length === 0) {
    return fail('No tiles provided')
  }

  const store = useMapStore.getState()
  const layer = store.layers[store.activeLayer]
  if (layer?.locked) {
    return fail(`Layer "${layer.name}" is locked. Unlock it first.`)
  }

  const validTiles: [number, number, string | null][] = []
  const invalid: string[] = []

  for (const t of args.tiles) {
    if (!Number.isFinite(t.x) || !Number.isFinite(t.y)) {
      invalid.push(`(${t.x},${t.y}): invalid coordinates`)
      continue
    }
    const tileType = TILE_TYPES[t.tileId]
    if (!tileType || t.tileId === 'void') {
      invalid.push(`(${t.x},${t.y}): unknown tile "${t.tileId}"`)
      continue
    }
    validTiles.push([t.x, t.y, t.tileId])
  }

  if (validTiles.length === 0) {
    return fail(`No valid tiles to place. Errors: ${invalid.join('; ')}`)
  }

  store.setTiles(validTiles)

  let msg = `Placed ${validTiles.length} tile(s).`
  if (invalid.length > 0) {
    msg += ` Skipped ${invalid.length}: ${invalid.join('; ')}`
  }
  return ok(msg)
}

/** Undo the last change. */
export function undoLastChange(): ToolResult {
  const store = useMapStore.getState()
  if (store.historyIndex < 0) {
    return fail('Nothing to undo')
  }
  store.undo()
  return ok('Last change undone.')
}

/** Dispatch table — maps tool names to their execution functions. */
export const TOOL_EXECUTORS: Record<string, (args: Record<string, unknown>) => ToolResult> = {
  getMapState: () => getMapState(),
  getTileTypes: () => getTileTypes(),
  getPresets: () => getPresets(),
  placeTile: (args) => placeTile(args as unknown as { x: number; y: number; tileId: string }),
  placePreset: (args) => placePreset(args as unknown as { presetId: string; x: number; y: number }),
  fillArea: (args) => fillArea(args as unknown as { x: number; y: number; tileId: string }),
  placeMultipleTiles: (args) => placeMultipleTiles(args as unknown as { tiles: { x: number; y: number; tileId: string }[] }),
  undoLastChange: () => undoLastChange(),
}
