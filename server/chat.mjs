/**
 * Chat API handler — streams AI responses with tool calling support.
 * Uses @ai-sdk/openai for the model and streams via the AI SDK data protocol.
 *
 * Supports both OpenAI and DeepSeek (OpenAI-compatible).
 *
 * Environment variables:
 *   OPENAI_API_KEY    – OpenAI API key
 *   DEEPSEEK_API_KEY  – DeepSeek API key (auto-configures base URL & model)
 *   OPENAI_BASE_URL   – override the default base URL
 *   CHAT_MODEL        – override the default model name
 *
 * Defaults when DEEPSEEK_API_KEY is set:
 *   base URL: https://api.deepseek.com/v1
 *   model:    deepseek-chat
 *
 * Defaults when only OPENAI_API_KEY is set:
 *   base URL: https://api.openai.com/v1
 *   model:    gpt-4o-mini
 */

import { createOpenAI } from '@ai-sdk/openai'
import { streamText, convertToModelMessages } from 'ai'

/** Build an OpenAI-compatible provider instance.
 *  Reads env vars lazily so .env files loaded by Vite's loadEnv are available. */
function getOpenAI() {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY

  const apiKey = DEEPSEEK_API_KEY || OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      'Neither DEEPSEEK_API_KEY nor OPENAI_API_KEY is set. ' +
      'Set one of them in your .env file or environment.',
    )
  }

  const isDeepSeek = Boolean(DEEPSEEK_API_KEY)
  const baseURL = process.env.OPENAI_BASE_URL ||
    (isDeepSeek ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1')
  const modelName = process.env.CHAT_MODEL ||
    (isDeepSeek ? 'deepseek-chat' : 'gpt-4o-mini')

  // Wrap fetch to log the actual request body for debugging tool calls
  const originalFetch = globalThis.fetch
  const debugFetch = async (url, init) => {
    const urlStr = typeof url === 'string' ? url : url?.href ?? String(url)
    if (urlStr.includes('/chat/completions') && init?.body) {
      try {
        const body = JSON.parse(init.body)
        console.log('[chat] >>> POST to', urlStr)
        console.log('[chat] >>> model:', body.model)
        console.log('[chat] >>> tools:', body.tools ? body.tools.map(t => t.function?.name || '?') : 'NONE')
        console.log('[chat] >>> tool_choice:', body.tool_choice)
        console.log('[chat] >>> messages count:', body.messages?.length)
      } catch { /* ignore parse errors */ }
    }
    return originalFetch(url, init)
  }

  return {
    provider: createOpenAI({
      apiKey,
      baseURL,
      compatibility: 'strict',
      fetch: debugFetch,
    }),
    model: modelName,
  }
}

/**
 * Tool definitions exposed to the AI model.
 * These are the schemas only — execution happens on the client side.
 */
const TOOLS = {
  getMapState: {
    description:
      'Get a summary of the current map state: world name, tile size, theme, ' +
      'number of layers, and approximate tile count per layer. Use this to ' +
      'understand what the user is working with before suggesting changes.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  getTileTypes: {
    description:
      'Get the list of all available tile types with their categories. ' +
      'Use this when you need to know what tiles are available to place.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  getPresets: {
    description:
      'Get the list of all available presets (room templates, corridors, ' +
      'features, dungeons, traps). Each preset has an id, name, description, ' +
      'category, and dimensions.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  placeTile: {
    description:
      'Place a single tile at the specified coordinates. Use this for ' +
      'placing individual tiles like doors, altars, fountains, etc.',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X coordinate (column)' },
        y: { type: 'number', description: 'Y coordinate (row)' },
        tileId: {
          type: 'string',
          description: 'Tile type ID (e.g. wall, floor, door, water, tree)',
        },
      },
      required: ['x', 'y', 'tileId'],
    },
  },

  placePreset: {
    description:
      'Place a preset structure (room, corridor, feature, etc.) at the ' +
      'specified origin coordinates. The preset will be drawn from its ' +
      'top-left corner.',
    parameters: {
      type: 'object',
      properties: {
        presetId: {
          type: 'string',
          description: 'ID of the preset to place (e.g. small-room, straight-hallway, fountain-feature)',
        },
        x: {
          type: 'number',
          description: 'X coordinate (column) for the top-left corner of the preset',
        },
        y: {
          type: 'number',
          description: 'Y coordinate (row) for the top-left corner of the preset',
        },
      },
      required: ['presetId', 'x', 'y'],
    },
  },

  fillArea: {
    description:
      'Flood-fill an area starting from the specified coordinates with the ' +
      'given tile type. Useful for filling rooms with floor tiles or water.',
    parameters: {
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X coordinate (column) to start filling from' },
        y: { type: 'number', description: 'Y coordinate (row) to start filling from' },
        tileId: {
          type: 'string',
          description: 'Tile type ID to fill with (e.g. floor, water, grass)',
        },
      },
      required: ['x', 'y', 'tileId'],
    },
  },

  placeMultipleTiles: {
    description:
      'Place multiple tiles at once in a batch. Use this for drawing lines, ' +
      'walls, or filling rectangular areas efficiently.',
    parameters: {
      type: 'object',
      properties: {
        tiles: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' },
              tileId: { type: 'string' },
            },
            required: ['x', 'y', 'tileId'],
          },
          description: 'Array of tile placements {x, y, tileId}',
        },
      },
      required: ['tiles'],
    },
  },

  undoLastChange: {
    description:
      'Undo the most recent change made by the assistant. Use this when the ' +
      'user asks to revert or undo an action.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
}

const SYSTEM_PROMPT =
  'You are an expert map designer assistant for GlyphWeave, an ASCII roguelike tilemap editor. ' +
  'Your job is to help users design and edit dungeon maps.\n\n' +
  'CRITICAL RULES — you MUST follow these exactly:\n' +
  '1. NEVER just describe what you will do. ALWAYS use the tools to actually do it.\n' +
  '2. Before making ANY changes, first call getMapState, getTileTypes, and getPresets in parallel.\n' +
  '3. After gathering information, immediately call the action tools (placeTile, placePreset, fillArea, etc.).\n' +
  '4. Be concise — confirm what you did in 1-2 sentences after the tools complete.\n\n' +
  'Guidelines:\n' +
  '- When the user asks to create rooms, corridors, or structures, use placePreset with the appropriate preset.\n' +
  '- When the user asks for individual tiles, use placeTile.\n' +
  '- When the user wants to fill an area, use fillArea.\n' +
  '- The coordinate system: (0,0) is top-left, x increases right, y increases down.\n' +
  '- void means "no tile" (empty space). Do not place void tiles unless explicitly asked.\n' +
  'Tile IDs: wall, floor, floorAlt, door, doorOpen, water, deepWater, lava, ' +
  'tree, grass, bridge, stairsDown, stairsUp, altar, fountain, grave, trap, pillar, ' +
  'treasure, shop, table, throne, cage, blood, bar.'

/**
 * Read and parse the JSON request body from a Node.js readable stream.
 */
async function readBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'))
}

/**
 * Main chat handler — called from the Vite plugin middleware.
 */
export async function handleChat(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  try {
    const body = await readBody(req)
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Missing messages array' }))
      return
    }

    const { provider, model } = getOpenAI()

    // The v4 client sends UIMessage[] (with `parts`),
    // but streamText expects ModelMessage[] (with `content`).
    const modelMessages = await convertToModelMessages(messages)

    console.log('[chat] request — modelMessages count:', modelMessages.length, 'tool count:', Object.keys(TOOLS).length)

    const result = streamText({
      model: provider.chat(model),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools: TOOLS,
      // No maxSteps — tools are executed on the client side via onToolCall.
      // pipeUIMessageStreamToResponse streams tool-call parts to the client,
      // then the client sends a new POST with tool results for continued generation.
      temperature: 0.7,
      onStepFinish({ text, toolCalls, toolResults, finishReason, usage }) {
        console.log('[chat] step finish — finishReason:', finishReason)
        console.log('[chat] step finish — text preview:', text?.slice(0, 200))
        console.log('[chat] step finish — toolCalls count:', toolCalls?.length ?? 0)
        if (toolCalls?.length > 0) {
          for (const tc of toolCalls) {
            console.log('[chat] step finish — toolCall:', tc.toolName, JSON.stringify(tc.args))
          }
        }
        if (usage) console.log('[chat] step finish — usage:', JSON.stringify(usage))
      },
      onFinish({ text, steps, finishReason, usage }) {
        console.log('[chat] finish — finishReason:', finishReason)
        console.log('[chat] finish — total steps:', steps?.length)
        console.log('[chat] finish — full text:', text)
      },
    })

    // DEBUG: intercept what pipeUIMessageStreamToResponse sends
    const origWrite = res.write.bind(res)
    let streamChunks = 0
    res.write = (chunk, encoding, cb) => {
      const str = typeof chunk === 'string' ? chunk : chunk?.toString?.('utf-8') ?? ''
      streamChunks++
      if (str.startsWith('data:') && str.length > 6) {
        const content = str.slice(5).trim()
        if (content && content !== '[DONE]') {
          console.log('[chat] <<< stream chunk', streamChunks, ':', content.slice(0, 250))
        }
      } else if (str.length > 0) {
        console.log('[chat] <<< non-SSE write:', str.slice(0, 100))
      }
      return origWrite(chunk, encoding, cb)
    }

    // Pipe UI message stream, surfacing real errors instead of generic "An error occurred."
    result.pipeUIMessageStreamToResponse(res, {
      onError(err) {
        const message = err instanceof Error
          ? (err.message || `${err.constructor.name}: status ${err.statusCode ?? 'N/A'}`)
          : String(err)
        console.error('[chat] stream error:', err)
        return `Error: ${message}`
      },
    })
  } catch (err) {
    console.error('[chat] handler error:', err)
    const message = err instanceof Error ? err.message : String(err)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: message }))
    }
  }
}
