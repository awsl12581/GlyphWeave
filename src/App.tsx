import { useState, useCallback } from 'react'
import type { WorldConfig, Theme } from '@/types'
import { HomePage } from '@/components/pages/HomePage'
import { EditorPage } from '@/components/pages/EditorPage'
import { ThemeWorkshop } from '@/components/pages/ThemeWorkshop'
import { TooltipProvider } from '@/components/ui/tooltip'

type Page = 'home' | 'editor' | 'workshop'

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [worldConfig, setWorldConfig] = useState<WorldConfig | null>(null)

  const handleStart = useCallback((config: WorldConfig) => {
    setWorldConfig(config)
    setPage('editor')
  }, [])

  const handleBack = useCallback(() => {
    setWorldConfig(null)
    setPage('home')
  }, [])

  const handleWorkshop = useCallback(() => {
    setPage('workshop')
  }, [])

  const handleUseTheme = useCallback((theme: Theme) => {
    setWorldConfig({
      worldName: 'Untitled',
      tileSize: 24,
      themeId: theme.id,
      initialTheme: theme,
    })
    setPage('editor')
  }, [])

  return (
    <TooltipProvider>
      {page === 'editor' && worldConfig ? (
        <EditorPage worldConfig={worldConfig} onBack={handleBack} />
      ) : page === 'workshop' ? (
        <ThemeWorkshop onBack={() => setPage('home')} onUseTheme={handleUseTheme} />
      ) : (
        <HomePage onStart={handleStart} onWorkshop={handleWorkshop} />
      )}
    </TooltipProvider>
  )
}
