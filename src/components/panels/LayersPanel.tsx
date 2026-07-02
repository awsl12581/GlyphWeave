import { useMapStore } from '@/stores/map-store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Plus, Eye, EyeOff, Lock, Unlock } from 'lucide-react'

export function LayersPanel() {
  const layers = useMapStore((s) => s.layers)
  const activeLayer = useMapStore((s) => s.activeLayer)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-xs font-medium text-zinc-400">Layers</span>
        <Button variant="ghost" size="icon" className="w-6 h-6">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1 px-2 py-2">
        <div className="space-y-1">
          {layers.map((layer, i) => (
            <div
              key={layer.id}
              className={`
                flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer
                ${i === activeLayer ? 'bg-zinc-700' : 'hover:bg-zinc-800'}
              `}
            >
              <Button
                variant="ghost"
                size="icon"
                className="w-5 h-5 shrink-0"
                onClick={() => {}}
              >
                {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </Button>
              <span className="text-xs text-zinc-300 flex-1 truncate">{layer.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="w-5 h-5 shrink-0"
                onClick={() => {}}
              >
                {layer.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
