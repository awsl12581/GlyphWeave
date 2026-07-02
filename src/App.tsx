import { useState, useCallback } from 'react'
import type { WorldConfig } from '@/types'
import { HomePage } from '@/components/pages/HomePage'
import { EditorPage } from '@/components/pages/EditorPage'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function App() {
  const [worldConfig, setWorldConfig] = useState<WorldConfig | null>(null)

  const handleStart = useCallback((config: WorldConfig) => {
    setWorldConfig(config)
  }, [])

  const handleBack = useCallback(() => {
    setWorldConfig(null)
  }, [])

  return (
    <TooltipProvider>
      {worldConfig ? (
        <EditorPage worldConfig={worldConfig} onBack={handleBack} />
      ) : (
        <HomePage onStart={handleStart} />
      )}
    </TooltipProvider>
  )
}
