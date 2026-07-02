# GlyphWeave

An infinite-canvas ASCII roguelike tilemap editor. Paint dungeons, weave glyphs.

Built with **React + Konva + Tailwind CSS + shadcn/ui**.

## Features

- **Infinite canvas** — pan (middle-click / tool) and zoom (scroll wheel) with Konva
- **25 tile types** — walls, floors, water, lava, trees, furniture, decorations, and more
- **25 preset rooms** — rooms, corridors, dungeon features, traps, ready to place
- **Dual themes** — ANSI 16 (classic terminal) and Cogmind Dark (cyberpunk low-light)
- **Theme as batch-replace** — switching theme instantly recolors every tile
- **Brush / Eraser / Flood Fill / Pan / Select** tools
- **Undo / Redo** (Ctrl+Z / Ctrl+Shift+Z)
- **Export / Import** as `.gemap` JSON
- **Demo map** — "The Forgotten Catacombs", a hand-curated 80×48 dungeon
- **Keyboard shortcuts** — B/E/F/P/S for tools, G for grid toggle

## Tech Stack

| Layer | Package |
|---|---|
| Build | Vite |
| UI | React 19 + TypeScript |
| Canvas | Konva + react-konva |
| State | Zustand + immer |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (Radix) |
| Icons | Lucide |

## Getting Started

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173` — choose a world name, tile size, and theme, then start painting. Or click **Load Demo Map** to explore a pre-built dungeon.

## Project Structure

```
src/
├── types/index.ts          # Core type definitions
├── constants/
│   ├── tiles.ts            # 25 tile type definitions (char, category)
│   ├── presets.ts          # 25 room/shape presets
│   ├── themes.ts           # ANSI 16 & Cogmind color themes
│   └── demo-map.ts         # Procedural demo map generator
├── stores/
│   ├── map-store.ts        # Zustand store: tiles, history, tools
│   └── ui-store.ts         # Zustand store: panels, grid toggle
├── hooks/
│   ├── useCanvas.ts        # Konva mouse/touch interaction logic
│   └── useKeyboard.ts      # Keyboard shortcut bindings
└── components/
    ├── canvas/MapCanvas.tsx # Konva Stage + viewport culling + tile rendering
    ├── canvas/TileCell.tsx  # Memoized single-tile renderer
    ├── toolbar/Toolbar.tsx  # Tool buttons + undo/redo
    ├── panels/
    │   ├── TilePalette.tsx  # Tile type grid selector
    │   ├── PresetsPanel.tsx # Preset browser with mini-previews
    │   ├── LayersPanel.tsx  # Layer list (skeleton)
    │   └── ExportPanel.tsx  # JSON export/import
    └── pages/
        ├── HomePage.tsx     # World creation form
        └── EditorPage.tsx   # Three-panel editor layout
```

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `B` | Brush tool |
| `E` | Eraser tool |
| `F` | Flood fill |
| `P` | Pan tool |
| `S` | Select tool |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `G` | Toggle grid |

## Why the Name?

**Glyph** — each tile is an ASCII glyph (`#`, `.`, `~`, `♣`, …). **Weave** — you interlace these glyphs into a coherent map, strand by strand.
