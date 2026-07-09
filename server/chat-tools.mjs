/**
 * Chat Tools — auto-generates AI tool definitions and system prompt
 * from the presets catalog and tile types.
 *
 * To add/remove tiles or presets, edit:
 *   - `server/presets-catalog.mjs`  (preset metadata)
 *   - `src/constants/presets.ts`       (preset grid data)
 *   - `src/constants/tiles.ts`         (tile type definitions)
 *
 * All tool descriptions and system prompts update automatically.
 */

import { PRESETS_CATALOG, PRESET_CATEGORIES } from './presets-catalog.mjs'

// ── Tile type definitions (mirrors src/constants/tiles.ts) ──────────────

/** @type {Record<string, { id: string, name: string, category: string }>} */
export const TILE_CATALOG = {
  wall:       { id: 'wall',       name: 'Wall',       category: 'wall' },
  floor:      { id: 'floor',      name: 'Floor',      category: 'floor' },
  floorAlt:   { id: 'floorAlt',   name: 'Floor Alt',  category: 'floor' },
  door:       { id: 'door',       name: 'Door',       category: 'wall' },
  doorOpen:   { id: 'doorOpen',   name: 'Door Open',  category: 'wall' },
  water:      { id: 'water',      name: 'Water',      category: 'water' },
  deepWater:  { id: 'deepWater',  name: 'Deep Water', category: 'water' },
  lava:       { id: 'lava',       name: 'Lava',       category: 'terrain' },
  tree:       { id: 'tree',       name: 'Tree',       category: 'vegetation' },
  grass:      { id: 'grass',      name: 'Grass',      category: 'vegetation' },
  bridge:     { id: 'bridge',     name: 'Bridge',     category: 'floor' },
  stairsDown: { id: 'stairsDown', name: 'Stairs Down',category: 'special' },
  stairsUp:   { id: 'stairsUp',   name: 'Stairs Up',  category: 'special' },
  altar:      { id: 'altar',      name: 'Altar',      category: 'furniture' },
  fountain:   { id: 'fountain',   name: 'Fountain',   category: 'furniture' },
  grave:      { id: 'grave',      name: 'Grave',      category: 'decoration' },
  trap:       { id: 'trap',       name: 'Trap',       category: 'decoration' },
  pillar:     { id: 'pillar',     name: 'Pillar',     category: 'wall' },
  treasure:   { id: 'treasure',   name: 'Treasure',   category: 'item' },
  shop:       { id: 'shop',       name: 'Shop',       category: 'furniture' },
  table:      { id: 'table',      name: 'Table',      category: 'furniture' },
  throne:     { id: 'throne',     name: 'Throne',     category: 'furniture' },
  cage:       { id: 'cage',       name: 'Cage',       category: 'furniture' },
  blood:      { id: 'blood',      name: 'Blood',      category: 'decoration' },
  bar:        { id: 'bar',        name: 'Bar',        category: 'wall' },
}

// Exclude void — it's not a placeable tile
const PLACEABLE_TILE_IDS = Object.keys(TILE_CATALOG)
const TILE_ID_LIST = PLACEABLE_TILE_IDS.join(', ')

/** Tile categories grouped for human readability. */
const TILE_CATEGORY_GROUPS = [
  { label: 'WALLS',       ids: ['wall', 'door', 'doorOpen', 'pillar', 'bar'] },
  { label: 'FLOORS',      ids: ['floor', 'floorAlt', 'bridge'] },
  { label: 'WATER',       ids: ['water', 'deepWater'] },
  { label: 'TERRAIN',     ids: ['lava'] },
  { label: 'VEGETATION',  ids: ['tree', 'grass'] },
  { label: 'FURNITURE',   ids: ['altar', 'fountain', 'shop', 'table', 'throne', 'cage'] },
  { label: 'DECORATION',  ids: ['grave', 'trap', 'blood'] },
  { label: 'ITEMS',       ids: ['treasure'] },
  { label: 'SPECIAL',     ids: ['stairsDown', 'stairsUp'] },
]

// ── Generator functions ─────────────────────────────────────────────────

/** Comma-separated list of all placeable tile IDs. */
export function tileIdList() {
  return TILE_ID_LIST
}

/**
 * Human-readable tile catalog for the system prompt.
 * @returns {string}
 */
export function buildTileCatalogPrompt() {
  return TILE_CATEGORY_GROUPS
    .map((g) => `- ${g.label}: ${g.ids.join(', ')}`)
    .join('\n')
}

/**
 * Human-readable preset catalog for the system prompt, grouped by category.
 * @returns {string}
 */
export function buildPresetCatalogPrompt() {
  const lines = []
  for (const cat of PRESET_CATEGORIES) {
    const items = PRESETS_CATALOG.filter((p) => p.category === cat.key)
    if (items.length === 0) continue
    const summary = items
      .map((p) => `${p.id}(${p.width}×${p.height})`)
      .join(', ')
    lines.push(`${cat.label}: ${summary}`)
  }
  return lines.join('\n')
}

/**
 * One-line summary of all preset IDs (for tool parameter descriptions).
 * @returns {string}
 */
export function presetIdList() {
  return PRESETS_CATALOG.map((p) => p.id).join(', ')
}

/**
 * Build the complete system prompt.
 * @returns {string}
 */
export function buildSystemPrompt() {
  const tileCatalog = buildTileCatalogPrompt()
  const presetCatalog = buildPresetCatalogPrompt()

  return [
    'You are an expert map designer for GlyphWeave, an ASCII roguelike tilemap editor.',
    'You have direct access to the editor canvas — you can place tiles and structures immediately.',
    '',
    '═══ TILE TYPES ═══',
    tileCatalog,
    '',
    '═══ PRESETS ═══',
    presetCatalog,
    '',
    '═══ RULES ═══',
    '1. ALWAYS use tools to make changes — never just describe what you will do.',
    "2. You do NOT need to call getTileTypes/getPresets first — the tile/preset IDs above are always current. Only call these tools if the user asks what's available.",
    "3. For placing rooms/corridors/structures, prefer placePreset — it's the most efficient.",
    '4. For drawing walls or filling floors, use placeMultipleTiles to batch many tiles at once.',
    '5. For filling enclosed areas with floor/water/grass, use fillArea.',
    '6. (0,0) = top-left, x→right, y→down.',
    '7. Be concise — confirm what you placed in 1 sentence after the tool completes.',
  ].join('\n')
}

/**
 * Tile ID validation string (for tool parameter descriptions).
 */
function tileIdConstraint() {
  return `Tile type ID. Must be one of: ${TILE_ID_LIST}`
}

/**
 * Build all tool definitions for the AI model.
 * @returns {Record<string, object>}
 */
export function buildToolDefinitions() {
  const presetIds = presetIdList()

  return {
    getMapState: {
      description:
        'Get a summary of the current map state: world name, tile size, theme, ' +
        'number of layers, and tile count per layer.',
      parameters: { type: 'object', properties: {}, required: [] },
    },

    getTileTypes: {
      description:
        'Get the full list of available tile types with their categories and names.',
      parameters: { type: 'object', properties: {}, required: [] },
    },

    getPresets: {
      description:
        'Get the full list of available presets (rooms, corridors, features, dungeons, traps) ' +
        'with names, descriptions, categories, and dimensions.',
      parameters: { type: 'object', properties: {}, required: [] },
    },

    placeTile: {
      description:
        'Place a single tile at the specified coordinates. ' +
        `Valid tile IDs: ${TILE_ID_LIST}.`,
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X coordinate (column)' },
          y: { type: 'number', description: 'Y coordinate (row)' },
          tileId: { type: 'string', description: tileIdConstraint() },
        },
        required: ['x', 'y', 'tileId'],
      },
    },

    placePreset: {
      description:
        'Place a preset structure at the specified origin (top-left corner). ' +
        `Available presets: ${presetIds}.`,
      parameters: {
        type: 'object',
        properties: {
          presetId: {
            type: 'string',
            description: `Preset ID. Must be one of: ${presetIds}`,
          },
          x: { type: 'number', description: 'X coordinate for the top-left corner' },
          y: { type: 'number', description: 'Y coordinate for the top-left corner' },
        },
        required: ['presetId', 'x', 'y'],
      },
    },

    fillArea: {
      description:
        'Flood-fill an enclosed area with the given tile type. Useful for ' +
        'filling rooms with floor tiles or creating water/lava pools.',
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X coordinate to start filling from' },
          y: { type: 'number', description: 'Y coordinate to start filling from' },
          tileId: { type: 'string', description: tileIdConstraint() },
        },
        required: ['x', 'y', 'tileId'],
      },
    },

    placeMultipleTiles: {
      description:
        'Batch-place many tiles at once. Use this for drawing walls, floors, ' +
        'or any pattern that needs many tiles. Much faster than calling placeTile repeatedly.',
      parameters: {
        type: 'object',
        properties: {
          tiles: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                tileId: { type: 'string', description: tileIdConstraint() },
              },
              required: ['x', 'y', 'tileId'],
            },
            description: 'Array of tile placements {x, y, tileId}',
          },
        },
        required: ['tiles'],
      },
    },

    undoLastChange: {
      description:
        'Undo the most recent change. Use when the user asks to revert an action.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  }
}
