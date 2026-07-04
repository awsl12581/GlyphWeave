#!/usr/bin/env node

/**
 * GlyphWeave Map Render Server
 *
 * HTTP API that renders tilemaps to PNG images.
 *
 * Usage:
 *   node server/index.mjs [port]
 *
 * API:
 *   GET  /api/render?data=<base64>&theme=<themeId>&padding=<n>&scale=<n>
 *   POST /api/render  (JSON body: { tiles, layerTiles?, layers?, theme?, padding?, scale? })
 *   GET  /api/health
 *
 *   Returns: image/png
 *
 * Examples:
 *   # Small map via GET
 *   curl "http://localhost:3001/api/render?data=$(echo -n '{"tiles":{"0,0":"wall"}}' | base64)" > map.png
 *
 *   # Large map via POST (pipe .gemap file)
 *   curl -X POST http://localhost:3001/api/render \
 *     -H "Content-Type: application/json" \
 *     -d @grand-realm-of-aethra.gemap > map.png
 */

import http from 'http'
import { renderMap } from './map-render.mjs'

const PORT = parseInt(process.argv[2], 10) || 3001

function sendJSON(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(body)
}

function sendError(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain' })
  res.end(message)
}

function sendHTML(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(html)
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function handleRender(query, body) {
  let data, themeId, padding, scale

  if (body && body.length > 0) {
    // POST mode: body is JSON
    const json = body.toString('utf-8')
    const parsed = JSON.parse(json)
    data = parsed
    themeId = query.theme || parsed.theme || 'ansi-16'
    padding = parseInt(query.padding, 10) || parseInt(parsed.padding, 10) || 1
    scale = query.scale ? parseFloat(query.scale) : (parsed.scale ? parseFloat(parsed.scale) : undefined)
  } else {
    // GET mode: base64 data in query param
    const dataB64 = query.data
    if (!dataB64) throw new Error('Missing "data" parameter')
    const json = Buffer.from(dataB64, 'base64').toString('utf-8')
    data = JSON.parse(json)
    themeId = query.theme || 'ansi-16'
    padding = parseInt(query.padding, 10) || 1
    scale = query.scale ? parseFloat(query.scale) : undefined
  }

  return renderMap(data, { themeId, padding, scale })
}

const INFO_PAGE = (port) => `<!DOCTYPE html>
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

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const query = Object.fromEntries(url.searchParams)

  // ── Health ──
  if (url.pathname === '/api/health') {
    sendJSON(res, 200, { ok: true, version: 1 })
    return
  }

  // ── Render ──
  if (url.pathname === '/api/render') {
    try {
      let body = null
      if (req.method === 'POST') {
        body = await collectBody(req)
      } else if (req.method !== 'GET') {
        sendError(res, 405, 'Method not allowed')
        return
      }

      const pngBuffer = await handleRender(query, body)

      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': pngBuffer.length,
        'Cache-Control': 'public, max-age=3600',
      })
      res.end(pngBuffer)
    } catch (err) {
      sendError(res, 400, `Error: ${err.message}`)
    }
    return
  }

  // ── Info page ──
  if (url.pathname === '/api' || url.pathname === '/api/') {
    sendHTML(res, INFO_PAGE(PORT))
    return
  }

  // ── Legacy redirects ──
  if (url.pathname === '/' || url.pathname === '/render' || url.pathname === '/health') {
    const target = url.pathname === '/' ? '/api/' : `/api${url.pathname}`
    res.writeHead(308, { Location: target })
    res.end()
    return
  }

  sendError(res, 404, 'Not found')
})

server.listen(PORT, () => {
  console.log(`GlyphWeave Render API running at http://localhost:${PORT}/api`)
  console.log(`   GET  /api/render?data=<base64>&theme=<id>`)
  console.log(`   POST /api/render  (JSON body)`)
  console.log(`   GET  /api/health`)
})
