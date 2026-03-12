import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { startBridge } from "./bridge.js";
import { toolDefinitions, handleToolCall } from "./tools.js";

/**
 * MCP-сервер для Pixso.
 * Работает через SSE (HTTP), что позволяет подключать несколько клиентов одновременно.
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

const app = express();
let transport = null;

app.get("/sse", async (req, res) => {
  console.error("Новое подключение по SSE");
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No active SSE transport");
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.error(`Pixso MCP Server запущен на http://localhost:${PORT}`);
  console.error(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.error(`Message endpoint: http://localhost:${PORT}/messages`);
});
