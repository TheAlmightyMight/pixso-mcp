# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pixso MCP Server — a bridge that lets LLMs (e.g., Claude) interact with Pixso design files via the Model Context Protocol. The project has two parts that communicate over WebSocket (port 3667):

1. **MCP Server (`server/`)** — Node.js server using `@modelcontextprotocol/sdk`, communicates with MCP clients via Streamable HTTP (port 3668, endpoint /mcp) and with the Pixso plugin via WebSocket (port 3667).
2. **Pixso Plugin (`plugin/`)** — runs inside Pixso; `ui.html` maintains the WebSocket connection, `main.js` handles commands in the plugin's main thread using the `pixso` API.

## Commands

```bash
npm start              # Run the MCP server (node server/index.js)
npm run lint:all       # ESLint across the project
npm run typecheck      # TypeScript type checking (tsc)
npm run count-tokens   # Count tokens in get_selection response
npm run debug-export   # Diagnose export tools — validates PNG/SVG pipeline
npm run dev            # Run test app in __tests__/test-app
```

No build step — all source files are plain JS (ES modules, `"type": "module"`). TypeScript is used only for type-checking via JSDoc annotations.

## Project Structure

```
server/
  index.js          — MCP server entry point, wires bridge + tool handlers
  bridge.js         — WebSocket bridge: lane-based queuing, callPlugin()
  tools.js          — MCP tool definitions (get_selection, get_selection_png, get_selection_svg, diagnose_export)
plugin/
  main.js           — Pixso plugin main thread (sandbox, single-file, 650+ lines)
  ui.html           — WebSocket client UI with auto-reconnect, status & stats
  manifest.json     — Pixso plugin manifest
tokens.js           — статистика токенов для ответа MCP сервера
count-tokens.js     — утилита: запрашивает выделение и считает токены
debug-export.js     — утилита: диагностика экспорта PNG/SVG
property-flags.md   — Pixso property → serialization flag mapping (A/P/C/N)
__tests__/
  test-app/         — Vite + React app for codegen testing
  test_results/     — output directory for test results
docs/               — planning and design spec documents
```

## Architecture & Data Flow

```
MCP Client (Claude) <--HTTP:3668/mcp--> server/index.js
                                     |
                              server/bridge.js <--WebSocket:3667--> plugin/ui.html <--postMessage--> plugin/main.js
                                     |
                              server/tools.js (tool definitions + dispatch)
```

- `server/index.js`: Entry point. Uses `createMcpExpressApp()` with StreamableHTTPServerTransport. Creates per-session MCP server instances with session init/cleanup handlers.
- `server/bridge.js`: Manages WebSocket connection to the Pixso plugin. Exports `startBridge()` and `callPlugin(command, params)`. Features lane-based request scheduling (default lane = unbounded concurrency, export lane = concurrency 1), timeout handling with `recoverOnTimeout` option, recovery mode for socket failures, and structured JSON event logging.
- `server/tools.js`: Defines five MCP tools with Zod-validated input schemas. Exports `toolDefinitions` and `handleToolCall(name)`. Includes `buildExportToolResult` (SVG as text, PNG as image) and `buildDiagnosticResult`.
- `plugin/ui.html`: WebSocket client with auto-reconnect (5s). Forwards `request` messages from server to `main.js` via `parent.postMessage`, and sends `mcp-response` messages back. UI shows connection status, request stats, request log with timestamps, uptime, and reconnection counter.
- `plugin/main.js`: Runs in Pixso's plugin sandbox. Handles `getSelection`, `exportNodes`, and `getDesignTokens` commands. Uses 11 property extractors (extractStyles, extractBase, extractFills, etc.) for node serialization with token-saving optimizations. Includes asset analysis (`analyzeNode()`) for vector/raster classification, coherent asset detection, and image fill analysis. Export queue processes serially (concurrency=1).

## MCP Tools

| Tool | Command | Description |
|------|---------|-------------|
| `get_selection` | `getSelection` | Returns the design subtree optimized for JSX/Tailwind conversion |
| `get_selection_png` | `exportNodes` | Exports selected nodes as PNG with size constraints (Zod-validated) |
| `get_selection_svg` | `exportNodes` | Exports selected nodes as SVG as text content (Zod-validated) |
| `diagnose_export` | `exportNodes` (x2) | Diagnostic: exports PNG+SVG, validates data, returns report (no images) |
| `get_design_tokens` | `getDesignTokens` | Extracts design tokens (colors, typography, effects, variables) from the entire document |

### Asset Export Hints

Nodes may include an `assetExport` property with export guidance:
- `kind`: `"raster"` or `"vector"` — preferred export format
- `preferredTool` / `availableTools`: which MCP tool(s) to use
- `usageHint`: `"img"` or `"background"` — how the asset should be used in code
- `fit`: `"contain"`, `"cover"`, `"tile"` — sizing behavior

## Key Conventions

- **Language**: Code comments and UI strings are in Russian. README is in Russian.
- **Global APIs in plugin context**: `pixso`, `__html__`, and `parent` are Pixso plugin globals (declared in ESLint config as `readonly`).
- **Token optimization**: Node serialization deliberately omits properties to minimize LLM token usage — only include essential data (geometry, text, basic colors, styles, auto-layout). See `property-flags.md` for the A/P/C/N flag system.
- **No build/bundle step**: `plugin/main.js` and `plugin/ui.html` are loaded directly by Pixso from the plugin folder. They are not processed by any bundler. `plugin/main.js` must remain a single file (Pixso sandbox does not support ESM imports).
- **Input validation**: PNG and SVG export tools use Zod schemas for parameter validation with constraints.
- `plugin/manifest.json` defines the Pixso plugin entry points (`main` and `ui` fields).

## MCP Client Configuration

```json
{
  "mcpServers": {
    "pixso": {
      "url": "http://localhost:3668/mcp"
    }
  }
}
```
