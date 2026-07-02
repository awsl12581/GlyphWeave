import type { TileType } from '@/types'

export const TILE_TYPES: Record<string, TileType> = {
  void: { id: 'void', name: 'Void', char: ' ', category: 'terrain', sortOrder: 0 },
  wall: { id: 'wall', name: 'Wall', char: '#', category: 'wall', sortOrder: 1 },
  floor: { id: 'floor', name: 'Floor', char: '.', category: 'floor', sortOrder: 2 },
  floorAlt: { id: 'floorAlt', name: 'Floor Alt', char: ',', category: 'floor', sortOrder: 3 },
  door: { id: 'door', name: 'Door', char: '+', category: 'wall', sortOrder: 4 },
  doorOpen: { id: 'doorOpen', name: 'Door Open', char: "'", category: 'wall', sortOrder: 5 },
  water: { id: 'water', name: 'Water', char: '~', category: 'water', sortOrder: 6 },
  deepWater: { id: 'deepWater', name: 'Deep Water', char: '≈', category: 'water', sortOrder: 7 },
  lava: { id: 'lava', name: 'Lava', char: '~', category: 'terrain', sortOrder: 8 },
  tree: { id: 'tree', name: 'Tree', char: '♣', category: 'vegetation', sortOrder: 9 },
  grass: { id: 'grass', name: 'Grass', char: '"', category: 'vegetation', sortOrder: 10 },
  bridge: { id: 'bridge', name: 'Bridge', char: '═', category: 'floor', sortOrder: 11 },
  stairsDown: { id: 'stairsDown', name: 'Stairs Down', char: '>', category: 'special', sortOrder: 12 },
  stairsUp: { id: 'stairsUp', name: 'Stairs Up', char: '<', category: 'special', sortOrder: 13 },
  altar: { id: 'altar', name: 'Altar', char: '≡', category: 'furniture', sortOrder: 14 },
  fountain: { id: 'fountain', name: 'Fountain', char: '♦', category: 'furniture', sortOrder: 15 },
  grave: { id: 'grave', name: 'Grave', char: '☠', category: 'decoration', sortOrder: 16 },
  trap: { id: 'trap', name: 'Trap', char: '^', category: 'decoration', sortOrder: 17 },
  pillar: { id: 'pillar', name: 'Pillar', char: '0', category: 'wall', sortOrder: 18 },
  treasure: { id: 'treasure', name: 'Treasure', char: '$', category: 'item', sortOrder: 19 },
  shop: { id: 'shop', name: 'Shop', char: 'Σ', category: 'furniture', sortOrder: 20 },
  table: { id: 'table', name: 'Table', char: '▤', category: 'furniture', sortOrder: 21 },
  throne: { id: 'throne', name: 'Throne', char: 'Ψ', category: 'furniture', sortOrder: 22 },
  cage: { id: 'cage', name: 'Cage', char: '█', category: 'furniture', sortOrder: 23 },
  blood: { id: 'blood', name: 'Blood', char: ';', category: 'decoration', sortOrder: 24 },
  bar: { id: 'bar', name: 'Bar', char: '│', category: 'wall', sortOrder: 25 },
}

export const TILE_TYPE_LIST = Object.values(TILE_TYPES).sort((a, b) => a.sortOrder - b.sortOrder)

export const TILE_CATEGORIES: { key: TileType['category']; label: string }[] = [
  { key: 'wall', label: 'Walls' },
  { key: 'floor', label: 'Floors' },
  { key: 'water', label: 'Water' },
  { key: 'terrain', label: 'Terrain' },
  { key: 'vegetation', label: 'Vegetation' },
  { key: 'furniture', label: 'Furniture' },
  { key: 'item', label: 'Items' },
  { key: 'decoration', label: 'Decorations' },
  { key: 'special', label: 'Special' },
]
