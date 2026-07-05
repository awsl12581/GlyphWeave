import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path, { resolve } from 'path'
import { renderMap } from './server/map-render.mjs'
import { apiDocPage } from './server/api-doc.mjs'

/**
 * Vite plugin: serves the render API + doc page.
 */
function apiPlugin(): Plugin {
  return {
    name: 'glyphweave-api',
    configureServer(server) {
      server.middlewares.use('/api/health', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.end(JSON.stringify({ ok: true, version: 1 }))
      })

      server.middlewares.use('/api/render', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        try {
          const u = new URL(req.url || '/', 'http://' + (req.headers.host || 'localhost'))
          const query = Object.fromEntries(u.searchParams)
          let data, themeId, padding, scale
          if (req.method === 'POST') {
            const chunks = []
            for await (const chunk of req) chunks.push(chunk)
            const body = Buffer.concat(chunks)
            const parsed = JSON.parse(body.toString('utf-8'))
            data = parsed
            themeId = query.theme || parsed.theme || parsed.themeId || 'ansi-16'
            padding = parseInt(query.padding, 10) || parseInt(parsed.padding, 10) || 1
            scale = query.scale ? parseFloat(query.scale) : (parsed.scale ? parseFloat(parsed.scale) : undefined)
          } else if (req.method === 'GET') {
            if (!query.data) { res.statusCode = 400; res.end('Missing "data" parameter'); return }
            const json = Buffer.from(query.data, 'base64').toString('utf-8')
            data = JSON.parse(json)
            themeId = query.theme || 'ansi-16'
            padding = parseInt(query.padding, 10) || 1
            scale = query.scale ? parseFloat(query.scale) : undefined
          } else {
            res.statusCode = 405; res.end('Method not allowed'); return
          }
          const pngBuffer = renderMap(data, { themeId, padding, scale, theme: data.theme })
          res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': pngBuffer.length,
            'Cache-Control': 'public, max-age=3600',
          })
          res.end(pngBuffer)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          res.statusCode = 400
          res.end(`Error: ${msg}`)
        }
      })

      server.middlewares.use('/api', (req, res, next) => {
        const pathname = req.url || '/'
        if (pathname === '/' || pathname === '') {
          const addr = server.httpServer?.address()
          const port = addr && typeof addr !== 'string' ? addr.port : 5173
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(apiDocPage('http://localhost:' + port))
          return
        }
        next()
      })
    },

    writeBundle() {
    },
  }
}

export default defineConfig({
  server: {
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss(), apiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
