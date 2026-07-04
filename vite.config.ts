import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

/**
 * Vite plugin: serves the map render API on the same dev server port.
 * All routes are under /api/:
 *   /api             – HTML API documentation page
 *   /api/render      – render endpoint (GET + POST)
 *   /api/health      – health check
 * Legacy /render and /health redirect to /api/render and /api/health.
 */
function mapRenderPlugin(): Plugin {
  let renderMap: any = null
  let loaded = false

  return {
    name: 'map-render',
    async configureServer(server) {
      // Load the render module
      try {
        // @ts-expect-error -- server/map-render.mjs has no TS declarations
        const mod = await import('./server/map-render.mjs')
        renderMap = mod.renderMap
        loaded = true
        const addr = server.httpServer?.address()
        const port = addr && typeof addr !== 'string' ? addr.port : 5173
        console.log(`[Map] Render API ready at http://localhost:${port}/api`)
      } catch (e) {
        console.warn('[map-render] Failed to load render module:', (e as Error).message)
        console.warn('[map-render] Install @napi-rs/canvas: pnpm add @napi-rs/canvas')
      }

      // ── HTML info page ──
      const renderInfoPage = (port: number) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>GlyphWeave Render API</title>
<style>body{font-family:monospace;background:#111;color:#ccc;padding:2rem;max-width:800px;margin:auto}
a{color:#8af}h1{color:#fff}code{background:#222;padding:0.2em 0.4em;border-radius:3px}
pre{background:#222;padding:1em;border-radius:4px;overflow-x:auto}</style>
</head><body>
<h1>GlyphWeave Render API</h1>
<p>Render tilemaps to PNG images.</p>
<h2>GET (small maps)</h2>
<pre><code>GET /api/render?data=&lt;base64&gt;&amp;theme=&lt;themeId&gt;</code></pre>
<h2>POST (any size)</h2>
<pre><code>POST /api/render
Content-Type: application/json
{ "tiles": {...}, "theme": "ansi-16", "padding": 1 }</code></pre>
<h3>Parameters</h3>
<table><tr><th>Param</th><th>Required</th><th>Description</th></tr>
<tr><td><code>data</code> (GET)</td><td>Yes</td><td>Base64-encoded JSON</td></tr>
<tr><td>body (POST)</td><td>Yes</td><td>Raw JSON (tiles/layerTiles/layers)</td></tr>
<tr><td><code>theme</code></td><td>No</td><td><code>ansi-16</code> (default) or <code>cogmind</code></td></tr>
<tr><td><code>padding</code></td><td>No</td><td>Extra tiles padding (default: 1)</td></tr>
<tr><td><code>scale</code></td><td>No</td><td>Pixels per tile (default: auto-fit ≤4096px)</td></tr>
</table>
<h3>Example: POST a .gemap file</h3>
<pre><code>curl -X POST http://localhost:${port}/api/render \
  -H "Content-Type: application/json" \
  -d @map.gemap > map.png</code></pre>
<h3>Example: with theme override</h3>
<pre><code>curl -X POST http://localhost:${port}/api/render?theme=cogmind \
  -H "Content-Type: application/json" \
  -d @map.gemap > map.png</code></pre>
</body></html>`

      // ── Render handler ──
      const handleRender = async (
        req: any,
        res: any,
        url: URL,
      ) => {
        let data: any
        let themeId = 'ansi-16'
        let padding = 1
        let scale: number | undefined

        if (req.method === 'POST') {
          const chunks: Buffer[] = []
          for await (const chunk of req) chunks.push(chunk as Buffer)
          const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
          data = body
          themeId = url.searchParams.get('theme') || body.theme || 'ansi-16'
          padding = parseInt(url.searchParams.get('padding') || body.padding, 10) || 1
          scale = url.searchParams.get('scale')
            ? parseFloat(url.searchParams.get('scale')!)
            : body.scale
              ? parseFloat(body.scale)
              : undefined
        } else if (req.method === 'GET') {
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
      }

      // ── Route handler ──
      server.middlewares.use((req, res, next) => {
        const host = req.headers.host || 'localhost'
        const url = new URL(req.url!, `http://${host}`)
        const pathname = url.pathname

        // Legacy redirects
        if (pathname === '/render' || pathname === '/health') {
          res.writeHead(308, { Location: `/api${pathname}` })
          res.end()
          return
        }

        // API info page
        if (pathname === '/api' || pathname === '/api/') {
          const addr = server.httpServer?.address()
          const port = addr && typeof addr !== 'string' ? addr.port : 5173
          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(renderInfoPage(port))
          return
        }

        // Render endpoint
        if (pathname === '/api/render') {
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

          handleRender(req, res, url).catch((err: Error) => {
            res.writeHead(400, { 'Content-Type': 'text/plain' })
            res.end(`Render error: ${err.message}`)
          })
          return
        }

        // Health check
        if (pathname === '/api/health') {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, version: 1, renderLoaded: loaded }))
          return
        }

        next()
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
