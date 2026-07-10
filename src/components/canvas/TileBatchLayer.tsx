'use client'
import { useCallback, useMemo } from 'react'
import { Shape } from 'react-konva'
import type { Context } from 'konva/lib/Context'
import type { VisibleTile } from '@/lib/map-core'
import type { TileColors } from '@/types'
import { useUiStore } from '@/stores/ui-store'
import { getSurface } from '@/lib/surfaces'

type TileBatchLayerProps = {
  tiles: readonly VisibleTile[]
  tileSize: number
  colorsByTileId: Record<string, TileColors>
}

export function TileBatchLayer({ tiles, tileSize, colorsByTileId }: TileBatchLayerProps) {
  const surfaceStyle = useUiStore((s) => s.surfaceStyle)

  /** Build a position→tileTypeId index for neighbor lookups. */
  const tileIndex = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of tiles) {
      map.set(`${t.gridX},${t.gridY}`, t.tileTypeId)
    }
    return map
  }, [tiles])

  const getTile = useCallback(
    (gx: number, gy: number): string | null => tileIndex.get(`${gx},${gy}`) ?? null,
    [tileIndex],
  )

  const sceneFunc = useCallback((context: Context): void => {
    const ctx = context as unknown as CanvasRenderingContext2D
    const surface = getSurface(surfaceStyle)

    if (surface.renderBatch) {
      surface.renderBatch({ ctx, tiles, tileSize, colorsByTileId, getTile })
    } else {
      // Fall back to per-tile rendering
      for (const tile of tiles) {
        const colors = colorsByTileId[tile.tileTypeId]
        surface.renderTile({
          ctx,
          tileTypeId: tile.tileTypeId,
          x: tile.gridX * tileSize,
          y: tile.gridY * tileSize,
          tileSize,
          colors: colors || { fgColor: '#ffffff', bgColor: '#000000' },
        })
      }
    }
  }, [colorsByTileId, getTile, surfaceStyle, tileSize, tiles])

  return <Shape listening={false} perfectDrawEnabled={false} sceneFunc={sceneFunc} />
}
