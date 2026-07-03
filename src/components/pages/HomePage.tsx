import { useState } from 'react'
import type { WorldConfig } from '@/types'
import { THEME_LIST } from '@/constants/themes'
import { TILE_TYPES } from '@/constants/tiles'
import { generateDemoMap } from '@/constants/demo-map'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

import { MapIcon } from 'lucide-react'

const TILE_SIZES = [16, 20, 24, 32]

interface HomePageProps {
  onStart: (config: WorldConfig) => void
}

export function HomePage({ onStart }: HomePageProps) {
  const [worldName, setWorldName] = useState('My Roguelike World')
  const [tileSize, setTileSize] = useState(24)
  const [themeId, setThemeId] = useState('ansi-16')

  const handleCreate = () => {
    if (!worldName.trim()) return
    onStart({ worldName: worldName.trim(), tileSize, themeId })
  }

  const sampleColors = [
    TILE_TYPES.wall,
    TILE_TYPES.floor,
    TILE_TYPES.door,
    TILE_TYPES.water,
    TILE_TYPES.tree,
    TILE_TYPES.lava,
  ]

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <Card className="w-full max-w-lg bg-zinc-950 border-zinc-800 p-6 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-mono font-bold text-zinc-100 tracking-tight">
            GlyphWeave
          </h1>
          <p className="text-sm text-zinc-500 font-mono">
            ASCII Roguelike Tilemap Editor
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="worldName" className="text-xs text-zinc-400">World Name</Label>
            <Input
              id="worldName"
              value={worldName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWorldName(e.target.value)}
            placeholder="Enter world name..."
            className="bg-zinc-900 border-zinc-700 text-zinc-100 h-9 text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Tile Size</Label>
          <div className="flex gap-2">
            {TILE_SIZES.map((size) => (
              <Button
                key={size}
                variant={tileSize === size ? 'default' : 'outline'}
                size="sm"
                className="flex-1 h-8 text-xs"
                onClick={() => setTileSize(size)}
              >
                {size}px
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-zinc-400">Color Theme</Label>
          <div className="grid grid-cols-1 gap-2">
            {THEME_LIST.map((theme) => {
              const colors = sampleColors.map((t) => theme.colors[t.id])
              return (
                <div
                  key={theme.id}
                  role="radio"
                  aria-checked={themeId === theme.id}
                  tabIndex={0}
                  onClick={() => setThemeId(theme.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setThemeId(theme.id)}
                  className={`
                    flex items-center gap-3 rounded-md border p-3 cursor-pointer
                    transition-colors
                    ${themeId === theme.id
                      ? 'border-zinc-500 bg-zinc-800/50'
                      : 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/30'
                    }
                  `}
                >
                  <div className="flex gap-1">
                    {colors.map((c, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono"
                        style={{ backgroundColor: c?.bgColor || '#000', color: c?.fgColor || '#fff' }}
                      >
                        {sampleColors[i]?.char}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">{theme.name}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{theme.description}</p>
                  </div>
                  {themeId === theme.id && (
                    <div className="w-2 h-2 rounded-full bg-zinc-100 shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <Separator className="bg-zinc-800" />

        <Button
          className="w-full h-10 font-mono text-sm"
          onClick={handleCreate}
          disabled={!worldName.trim()}
        >
          Create World &amp; Enter Editor
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-zinc-950 px-2 text-zinc-600">or</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full h-10 font-mono text-sm border-zinc-700 hover:bg-zinc-800 gap-2"
          onClick={() =>
            onStart({
              worldName: 'The Forgotten Catacombs',
              tileSize: 24,
              themeId: 'cogmind',
              initialTiles: generateDemoMap(),
            })
          }
        >
          <MapIcon className="w-4 h-4" />
          Load Demo Map — The Forgotten Catacombs
        </Button>
      </Card>
    </div>
  )
}
