import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { randomUUID } from "node:crypto";
import { startBridge } from "./bridge.js";
import { handleToolCall } from "./tools.js";

/**
 * Создает новый инстанс MCP сервера для каждой сессии.
 */
function createPixsoServer() {
  const server = new McpServer({
    name: "pixso-mcp-server",
    version: "1.0.0",
  });

  server.tool(
    "get_selection",
    "Возвращает полную спецификацию дизайна выделенных элементов, включая всё поддерево, стили, эффекты, макет и ограничения. Оптимизировано для генерации кода.",
    {},
    async () => {
      try {
        const data = await handleToolCall("get_selection");
        return {
          content: [{ type: "text", text: JSON.stringify(data) }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Ошибка: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );

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
 * Единый эндпоинт для MCP (Streamable HTTP).
 * Обрабатывает POST (инициализация и сообщения), GET (SSE) и DELETE (завершение).
 */
app.all("/mcp", async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"];
    
    // 1. Если сессия уже существует, используем её транспорт
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId);
      return await transport.handleRequest(req, res, req.body);
    }

    // 2. Если это запрос на инициализацию (обычно POST), создаем новую сессию
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
        }
      });

      const server = createPixsoServer();
      await server.connect(transport);
      return await transport.handleRequest(req, res, req.body);
    }

    // 3. Обработка проверочного POST-запроса от Cursor (Streamable HTTP check)
    if (req.method === "POST" && !sessionId) {
      // Если это не инициализация, возвращаем 405, чтобы Cursor переключился на SSE
      return res.status(405).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Use initialize request to start session" },
        id: null
      });
    }

    // 4. Обработка GET запроса (SSE поток) без sessionId в заголовке.
    // Если клиент шлет GET /mcp без mcp-session-id, это может быть старый SSE клиент
    // или некорректный запрос Streamable HTTP.
    if (req.method === "GET" && !sessionId) {
      console.error(`\n[${new Date().toISOString()}] GET /mcp without session ID`);
      return res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Mcp-Session-Id header is required for GET requests" },
        id: null
      });
    }

    res.status(404).send("Not Found");

  } catch (error) {
    console.error("❌ Ошибка при обработке запроса:", error);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error");
    }
  }
});

const PORT = 3668;
const httpServer = app.listen(PORT, () => {
  console.error(`\n🚀 Pixso MCP Server запущен!`);
  console.error(`Эндпоинт для Cursor/Claude: http://localhost:${PORT}/mcp`);
});

/**
 * Грейсфул-шатдаун (Graceful Shutdown).
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
