import { randomUUID } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { startBridge } from "./bridge.js";
import {
  buildDesignTokensResult,
  buildDiagnosticResult,
  buildExportToolResult,
  designTokensInputSchema,
  diagnoseExportDescription,
  diagnoseExportInputSchema,
  getDesignTokensDescription,
  getSelectionDescription,
  getSelectionPngDescription,
  getSelectionSvgDescription,
  handleToolCall,
  pngInputSchema,
  svgInputSchema,
} from "./tools.js";

function formatToolError(error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: `Ошибка: ${errorMessage}` }],
    isError: true,
  };
}

/**
 * Создает новый инстанс MCP сервера для каждой сессии.
 */
function createPixsoServer() {
  const server = new McpServer({
    name: "pixso-mcp-server",
    version: "1.0.0",
  });

  server.registerTool("get_selection", {
    description: getSelectionDescription,
  }, async () => {
    try {
      const data = await handleToolCall("get_selection");
      return {
        content: [{ type: "text", text: JSON.stringify(data) }],
      };
    } catch (error) {
      return formatToolError(error);
    }
  });

  server.registerTool("get_selection_png", {
    description: getSelectionPngDescription,
    inputSchema: pngInputSchema,
  }, async (args) => {
    try {
      const data = await handleToolCall("get_selection_png", args);
      return buildExportToolResult(data, "image/png");
    } catch (error) {
      return formatToolError(error);
    }
  });

  server.registerTool("get_selection_svg", {
    description: getSelectionSvgDescription,
    inputSchema: svgInputSchema,
  }, async (args) => {
    try {
      const data = await handleToolCall("get_selection_svg", args);
      return buildExportToolResult(data, "image/svg+xml");
    } catch (error) {
      return formatToolError(error);
    }
  });

  server.registerTool("diagnose_export", {
    description: diagnoseExportDescription,
    inputSchema: diagnoseExportInputSchema,
  }, async (args) => {
    try {
      const data = await handleToolCall("diagnose_export", args);
      return buildDiagnosticResult(data.pngPayload, data.svgPayload);
    } catch (error) {
      return formatToolError(error);
    }
  });

  server.registerTool("get_design_tokens", {
    description: getDesignTokensDescription,
    inputSchema: designTokensInputSchema,
  }, async (args) => {
    try {
      const data = await handleToolCall("get_design_tokens", args);
      return buildDesignTokensResult(data);
    } catch (error) {
      return formatToolError(error);
    }
  });

  return server;
}

// Запуск моста с плагином Pixso
const wss = startBridge();

// Используем createMcpExpressApp — это рекомендуемый способ создания Express-приложения для MCP.
// Оно уже включает express.json() и защиту от DNS-ребиндинга.
const app = createMcpExpressApp();

/** @type {Map<string, StreamableHTTPServerTransport>} */
const transports = new Map();

/**
 * Единый эндпойнт для MCP (Streamable HTTP).
 * Обрабатывает POST (инициализация и сообщения), GET (SSE) и DELETE (завершение).
 */
app.all("/mcp", async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"];

    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId);
      return await transport.handleRequest(req, res, req.body);
    }

    if (isInitializeRequest(req.body)) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          console.error(`[${new Date().toISOString()}] SSE Session created: ${id}`);
          transports.set(id, transport);
        },
        onsessionclosed: (id) => {
          console.error(`[${new Date().toISOString()}] SSE Session closed: ${id}`);
          transports.delete(id);
        },
      });

      const server = createPixsoServer();
      await server.connect(transport);
      return await transport.handleRequest(req, res, req.body);
    }

    if (req.method === "POST" && !sessionId) {
      return res.status(405).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Use initialize request to start session" },
        id: null,
      });
    }

    if (req.method === "GET" && !sessionId) {
      console.error(`\n[${new Date().toISOString()}] GET /mcp without session ID`);
      return res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Mcp-Session-Id header is required for GET requests" },
        id: null,
      });
    }

    res.status(404).send("Not Found");
  } catch (error) {
    console.error("Ошибка при обработке запроса:", error);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error");
    }
  }
});

const PORT = 3668;
const httpServer = app.listen(PORT, () => {
  console.error("\nPixso MCP Server запущен!");
  console.error(`Эндпойнт для Cursor/Claude: http://localhost:${PORT}/mcp`);
});

/**
 * Graceful shutdown.
 */
function shutdown() {
  console.error("\nОстановка серверов...");

  wss.close(() => {
    console.error("WebSocket мост остановлен");
  });

  httpServer.close(() => {
    console.error("HTTP сервер остановлен");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Принудительное завершение работы...");
    process.exit(1);
  }, 5000);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
