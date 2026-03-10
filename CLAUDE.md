# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pixso MCP Server — a bridge that lets LLMs (e.g., Claude) interact with Pixso design files via the Model Context Protocol. The project has two parts that communicate over WebSocket (port 3667):

1. **MCP Server (`server/`)** — Node.js server using `@modelcontextprotocol/sdk`, communicates with MCP clients via stdio and with the Pixso plugin via WebSocket.
2. **Pixso Plugin (`plugin/`)** — runs inside Pixso; `ui.html` maintains the WebSocket connection, `main.js` handles commands in the plugin's main thread using the `pixso` API.

## Commands

```bash
npm start          # Run the MCP server (node server/index.js)
npm run lint:all    # ESLint across the project
```

No build step — all source files are plain JS (ES modules, `"type": "module"`).

## Project Structure

```
server/
  index.js        — MCP server entry point, wires bridge + tool handlers
  bridge.js       — WebSocket bridge: connection management, callPlugin()
  tools.js        — MCP tool definitions and call handlers
plugin/
  main.js         — Pixso plugin main thread (sandbox, single-file)
  ui.html         — WebSocket client UI with auto-reconnect
  manifest.json   — Pixso plugin manifest
tokens.js         — design tokens data
count-tokens.js   — utility: fetches selection and reports token count
```

## Architecture & Data Flow

```
MCP Client (Claude) <--stdio--> server/index.js
                                     |
                              server/bridge.js <--WebSocket:3667--> plugin/ui.html <--postMessage--> plugin/main.js
                                     |
                              server/tools.js (tool definitions + dispatch)
```

- `server/index.js`: Entry point. Creates MCP server, starts WebSocket bridge, registers tool handlers.
- `server/bridge.js`: Manages WebSocket connection to the Pixso plugin. Exports `startBridge()` and `callPlugin(command, params)`. Pending requests tracked in a `Map<id, resolve>`.
- `server/tools.js`: Defines MCP tools (`get_selection`, `list_layers`, `get_node_details`, `list_design_tokens`). Exports `toolDefinitions` and `handleToolCall(name, args)`.
- `plugin/ui.html`: WebSocket client with auto-reconnect (5s). Forwards `request` messages from server to `main.js` via `parent.postMessage`, and sends `mcp-response` messages back to the server.
- `plugin/main.js`: Runs in Pixso's plugin sandbox. Handles commands by reading the Pixso document tree via the `pixso` global API. `serializeNode(node, profile)` extracts node properties with token-saving optimizations (rounding, filtering).

## Key Conventions

- **Language**: Code comments and UI strings are in Russian. README is in Russian.
- **Global APIs in plugin context**: `pixso` and `__html__` are Pixso plugin globals (declared in ESLint config as `readonly`).
- **Token optimization**: Node serialization deliberately omits properties to minimize LLM token usage — only include essential data (geometry, text, basic colors, styles, auto-layout).
- **No build/bundle step**: `plugin/main.js` and `plugin/ui.html` are loaded directly by Pixso from the plugin folder. They are not processed by any bundler. `plugin/main.js` must remain a single file (Pixso sandbox does not support ESM imports).
- `plugin/manifest.json` defines the Pixso plugin entry points (`main` and `ui` fields).

## MCP Client Configuration

```json
{
  "mcpServers": {
    "pixso": {
      "command": "node",
      "args": ["<path>/server/index.js"]
    }
  }
}
```
