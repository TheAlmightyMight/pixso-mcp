# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pixso MCP Server — a bridge that lets LLMs (e.g., Claude) interact with Pixso design files via the Model Context Protocol. The project has two parts that communicate over WebSocket (port 3667):

1. **MCP Server (`index.js`)** — Node.js server using `@modelcontextprotocol/sdk`, communicates with MCP clients via stdio and with the Pixso plugin via WebSocket.
2. **Pixso Plugin (`main.js` + `ui.html`)** — runs inside Pixso; `ui.html` maintains the WebSocket connection, `main.js` handles commands in the plugin's main thread using the `pixso` API.

## Commands

```bash
npm start          # Run the MCP server (node index.js)
npm run typecheck   # TypeScript type-checking (tsc --noEmit), only checks index.js
npm run lint:all    # ESLint across the project
```

No build step — all source files are plain JS (ES modules, `"type": "module"`).

## Architecture & Data Flow

```
MCP Client (Claude) <--stdio--> index.js <--WebSocket:3667--> ui.html <--postMessage--> main.js (Pixso plugin thread)
```

- `index.js`: Defines MCP tools (`get_selection`, `list_layers`, `get_node_details`, `list_design_tokens`). Each tool calls `callPlugin(command, params)` which sends a JSON message over WebSocket and awaits a response (10s timeout). Pending requests are tracked in a `Map<id, resolve>`.
- `ui.html`: WebSocket client with auto-reconnect (5s). Forwards `request` messages from server to `main.js` via `parent.postMessage`, and sends `mcp-response` messages back to the server.
- `main.js`: Runs in Pixso's plugin sandbox. Handles commands by reading the Pixso document tree via the `pixso` global API. `serializeNode(node, detailed)` extracts node properties with token-saving optimizations (rounding, filtering).

## Key Conventions

- **Language**: Code comments and UI strings are in Russian. README is in Russian.
- **Global APIs in plugin context**: `pixso` and `__html__` are Pixso plugin globals (declared in ESLint config as `readonly`).
- **Token optimization**: Node serialization deliberately omits properties to minimize LLM token usage — only include essential data (geometry, text, basic colors, styles, auto-layout).
- **No build/bundle step**: `main.js` and `ui.html` are loaded directly by Pixso from the plugin folder. They are not processed by any bundler.
- `manifest.json` defines the Pixso plugin entry points (`main` and `ui` fields).

## MCP Client Configuration

```json
{
  "mcpServers": {
    "pixso": {
      "command": "node",
      "args": ["<path>/index.js"]
    }
  }
}
```
