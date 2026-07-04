import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

/**
 * Vite plugin: serves the map render API on the same dev server port.
 * Intercepts /render (GET + POST) and /health.
 */
function mapRenderPlugin(): Plugin {
  let renderMap: any = null
  let loaded = false

  return {
    name: 'map-render',
    async configureServer(server) {
      // Load the render module
      try {
        const mod = await import('./server/map-render.mjs')
        renderMap = mod.renderMap
        loaded = true
        console.log('[Map] Render API ready at /render and /health')
      } catch (e) {
        console.warn('[map-render] Failed to load render module:', (e as Error).message)
        console.warn('[map-render] Install @napi-rs/canvas: pnpm add @napi-rs/canvas')
      }

      server.middlewares.use('/render', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.writeHead(204)
          res.end()
          return
        }

        if (!renderMap) {
          res.writeHead(503, { 'Content-Type': 'text/plain' })
          res.end('Render module not loaded (missing @napi-rs/canvas?)')
          return
        }

        try {
          let data: any
          let themeId = 'ansi-16'
          let padding = 1
          let scale: number | undefined

          if (req.method === 'POST') {
            // POST: JSON body
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(chunk as Buffer)
            const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
            data = body
            const url = new URL(req.url!, `http://${req.headers.host || 'localhost'}`)
            themeId = url.searchParams.get('theme') || body.theme || 'ansi-16'
            padding = parseInt(url.searchParams.get('padding') || body.padding, 10) || 1
            scale = url.searchParams.get('scale')
              ? parseFloat(url.searchParams.get('scale')!)
              : body.scale
              ? parseFloat(body.scale)
              : undefined
          } else if (req.method === 'GET') {
            const url = new URL(req.url!, `http://${req.headers.host || 'localhost'}`)
            const dataB64 = url.searchParams.get('data')
            if (!dataB64) {
              res.writeHead(400, { 'Content-Type': 'text/plain' })
              res.end('Missing "data" parameter')
              return
            }
            data = JSON.parse(Buffer.from(dataB64, 'base64').toString('utf-8'))
            themeId = url.searchParams.get('theme') || 'ansi-16'
            padding = parseInt(url.searchParams.get('padding') || '1', 10)
            scale = url.searchParams.get('scale') ? parseFloat(url.searchParams.get('scale')!) : undefined
          } else {
            res.writeHead(405, { 'Content-Type': 'text/plain' })
            res.end('Method not allowed')
            return
          }

          const pngBuffer = renderMap(data, { themeId, padding, scale })
          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': pngBuffer.length,
            'Cache-Control': 'public, max-age=3600',
          })
          res.end(pngBuffer)
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'text/plain' })
          res.end(`Render error: ${(err as Error).message}`)
        }
      })

      server.middlewares.use('/health', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ ok: true, version: 1, renderLoaded: loaded }))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), mapRenderPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
