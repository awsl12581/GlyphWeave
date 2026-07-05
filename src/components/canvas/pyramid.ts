/**
 * Pyramid consolidation — merges N×N tile blocks into single tiles
 * when zoomed out, reducing the number of rendered Konva nodes.
 */

/**
 * Determine the consolidation block size from the current zoom scale.
 *
 *   zoom ≥ 0.50 → blockSize = 1  (no merge, every tile individually)
 *   zoom ≥ 0.25 → blockSize = 2  (2×2 → 1)
 *   zoom ≥ 0.125 → blockSize = 4  (4×4 → 1)
 *   zoom < 0.125 → blockSize = 8  (8×8 → 1)
 */
export function getPyramidBlockSize(zoomScale: number): number {
  if (zoomScale >= 0.5) return 1
  if (zoomScale >= 0.25) return 2
  if (zoomScale >= 0.125) return 4
  return 8
}

export interface ConsolidatedTile {
  key: string
  gridX: number
  gridY: number
  tileTypeId: string
  blockSize: number
}

/**
 * Consolidate a layer's raw tiles into merged blocks.
 *
 * @param layerTiles   Raw per-coordinate tile data `{ "x,y": "tileId" }`
 * @param blockSize    Pyramid block size (1 = no merge)
 * @param visibleRange Visible tile range for culling
 * @returns            Consolidated tile array, each covering blockSize² cells
 */
export function consolidateTiles(
  layerTiles: Record<string, string | null>,
  blockSize: number,
  visibleRange: { minX: number; minY: number; maxX: number; maxY: number },
): ConsolidatedTile[] {
  if (blockSize <= 1) {
    // Fast path — no merge, just filter by visible range
    const result: ConsolidatedTile[] = []
    for (const [key, tileTypeId] of Object.entries(layerTiles)) {
      if (!tileTypeId) continue
      const [sx, sy] = key.split(',')
      const x = parseInt(sx, 10)
      const y = parseInt(sy, 10)
      if (x >= visibleRange.minX && x <= visibleRange.maxX && y >= visibleRange.minY && y <= visibleRange.maxY) {
        result.push({ key, gridX: x, gridY: y, tileTypeId, blockSize: 1 })
      }
    }
    return result
  }

  // Count tile types per block
  // blockKey "bx,by" → { tileTypeId: count }
  const blockCounts: Record<string, Record<string, number>> = {}

  for (const [key, tileTypeId] of Object.entries(layerTiles)) {
    if (!tileTypeId) continue
    const [sx, sy] = key.split(',')
    const x = parseInt(sx, 10)
    const y = parseInt(sy, 10)

    const bx = Math.floor(x / blockSize)
    const by = Math.floor(y / blockSize)
    const bk = `${bx},${by}`

    let counts = blockCounts[bk]
    if (!counts) {
      counts = {}
      blockCounts[bk] = counts
    }
    counts[tileTypeId] = (counts[tileTypeId] || 0) + 1
  }

  // Build consolidated tiles from majority tile type per block
  const result: ConsolidatedTile[] = []

  for (const [bk, counts] of Object.entries(blockCounts)) {
    let maxCount = 0
    let majorityType = ''
    for (const [type, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count
        majorityType = type
      }
    }
    if (!majorityType) continue

    const [sx, sy] = bk.split(',')
    const bx = parseInt(sx, 10)
    const by = parseInt(sy, 10)

    const gridX = bx * blockSize
    const gridY = by * blockSize

    // Cull: skip blocks outside the visible range
    const blockEndX = gridX + blockSize - 1
    const blockEndY = gridY + blockSize - 1
    if (
      blockEndX < visibleRange.minX ||
      gridX > visibleRange.maxX ||
      blockEndY < visibleRange.minY ||
      gridY > visibleRange.maxY
    ) {
      continue
    }

    result.push({
      key: `pyra:${bk}:${majorityType}`,
      gridX,
      gridY,
      tileTypeId: majorityType,
      blockSize,
    })
  }

  return result
}
