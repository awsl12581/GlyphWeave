import { renderMapSVG } from '../server/map-render-svg.mjs'
import { apiDocPage } from '../server/api-doc.mjs'

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const method = request.method

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (url.pathname === '/api' || url.pathname === '/api/') {
      return new Response(apiDocPage(url.origin), { headers: { ...corsHeaders, 'Content-Type': 'text/html' } })
    }

    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ ok: true, version: 1 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (url.pathname === '/api/render') {
      try {
        let data: any
        let themeId = 'ansi-16'
        let padding = 1
        let scale: number | undefined

        if (method === 'POST') {
          data = await request.json()
          themeId = url.searchParams.get('theme') || data.theme || data.themeId || 'ansi-16'
          padding = parseInt(url.searchParams.get('padding') || data.padding, 10) || 1
          scale = url.searchParams.get('scale')
            ? parseFloat(url.searchParams.get('scale')!)
            : data.scale
              ? parseFloat(data.scale)
              : undefined
        } else if (method === 'GET') {
          const dataB64 = url.searchParams.get('data')
          if (!dataB64) return new Response('Missing "data" parameter', { status: 400 })
          const json = atob(dataB64)
          data = JSON.parse(json)
          themeId = url.searchParams.get('theme') || 'ansi-16'
          padding = parseInt(url.searchParams.get('padding') || '1', 10) || 1
          scale = url.searchParams.get('scale') ? parseFloat(url.searchParams.get('scale')!) : undefined
        } else {
          return new Response('Method not allowed', { status: 405 })
        }

        const svg = renderMapSVG(data, { themeId, padding, scale, theme: data.theme })
        return new Response(svg, {
          headers: { ...corsHeaders, 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' },
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        return new Response(`Error: ${msg}`, { status: 400 })
      }
    }

    try {
      const response = await env.ASSETS.fetch(request)
      if (response.status === 404) {
        return await env.ASSETS.fetch(new Request(new URL('/', url), request))
      }
      return response
    } catch {
      return await env.ASSETS.fetch(new Request(new URL('/', url), request))
    }
  },
}
