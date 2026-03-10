import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { startBridge } from "./bridge.js";
import { toolDefinitions, handleToolCall } from "./tools.js";

/**
 * MCP-сервер для Pixso.
 * Позволяет LLM запрашивать информацию о дизайне через WebSocket-мост с плагином.
 */

const server = new Server(
  {
    name: "pixso-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

startBridge();

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolDefinitions,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const data = await handleToolCall(name, args);
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [{ type: "text", text: `Ошибка: ${errorMessage}` }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Pixso MCP Server запущен на stdio");
}

main().catch((error) => {
  console.error("Критическая ошибка сервера:", error);
  process.exit(1);
});
